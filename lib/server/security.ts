/**
 * Risk signals for an address: OFAC snapshot (local), Blockscout scam/reputation flags, GoPlus
 * reports, contract verification, proxy/owner checks, privileged functions, and token approvals
 * with live allowances. Nothing here concludes that an address is safe.
 */
import { bytesToHex, hexToBytes } from '@/lib/codec/bytes';
import { keccak256 } from '@/lib/codec/keccak';
import { toChecksumAddress } from '@/lib/evm/address';
import { decodeParams, encodeCall, parseJsonAbi, parseType } from '@/lib/evm/abi';
import type { ApprovalRow, ApprovalsResult, ContractChecks, NftApprovalRow, SecurityReport, Section, Source } from '@/lib/lookup-types';
import { getEvmNetwork, getNetwork, type EvmNetwork } from '@/lib/networks';
import * as bs from '@/lib/providers/blockscout';
import * as evm from '@/lib/providers/evm';
import { goplusAddress, goplusToken } from '@/lib/providers/goplus';
import { ProviderError } from '@/lib/providers/http';
import { sourcifyMatch } from '@/lib/providers/sourcify';
import { checkSanctions } from '@/lib/security/sanctions';
import { spenderLabel } from '@/lib/security/spenders';
import { cached } from '@/lib/server/cache';
import { LookupError } from '@/lib/server/lookup';
import { formatUnits } from '@/lib/tools/units';

const MIN = 60_000;
const TTL = { ttl: 10 * MIN, stale: 6 * 60 * MIN };
const APPROVAL_TTL = { ttl: 2 * MIN, stale: 30 * MIN };

async function section<T>(key: string, ttl: { ttl: number; stale: number }, source: Source, fn: () => Promise<T>): Promise<Section<T>> {
  try {
    const r = await cached(key, ttl.ttl, ttl.stale, fn);
    return { status: 'ok', data: r.value, source, fetchedAt: new Date(r.fetchedAt).toISOString(), stale: r.stale };
  } catch (e) {
    return { status: 'unavailable', reason: e instanceof ProviderError ? e.message : 'the data source did not respond', source };
  }
}

const unavailable = <T>(reason: string): Section<T> => ({ status: 'unavailable', reason });
const ZERO = '0x0000000000000000000000000000000000000000';

// EIP-1967 storage slots: keccak256('eip1967.proxy.implementation') - 1, etc.
function slot(label: string): string {
  const h = keccak256(label);
  // subtract 1 from the big-endian 256-bit value
  let n = BigInt(bytesToHex(h)) - BigInt(1);
  if (n < BigInt(0)) n += BigInt(1) << BigInt(256);
  return `0x${n.toString(16).padStart(64, '0')}`;
}
const IMPLEMENTATION_SLOT = slot('eip1967.proxy.implementation');
const ADMIN_SLOT = slot('eip1967.proxy.admin');
const BEACON_SLOT = slot('eip1967.proxy.beacon');

function slotAddress(v: unknown): string | null {
  if (typeof v !== 'string' || v.length < 42) return null;
  const a = `0x${v.slice(-40)}`;
  return a.toLowerCase() === ZERO ? null : toChecksumAddress(a);
}

const PRIVILEGED = /^(mint|pause|unpause|freeze|unfreeze|blacklist|addToBlacklist|removeFromBlacklist|setBlacklist|addBlackList|blockAddress|setFee|setFees|setTax|setTaxes|setMaxTx|setMaxWallet|upgradeTo|upgradeToAndCall|changeAdmin|transferOwnership|setOwner|renounceOwnership|withdraw|withdrawAll|emergencyWithdraw|rescueTokens|rescue|setRouter|excludeFromFee|setTrading|enableTrading|setBots|setBot|burnFrom|setImplementation|setMinter|addMinter|grantRole|configureMinter|updateBlacklister|setPauser)$/i;

async function contractChecks(net: EvmNetwork, address: string, info: Section<bs.AddressInfo>): Promise<ContractChecks> {
  const key = `${net.id}:${address.toLowerCase()}`;
  const base = net.blockscout;
  const [blockscout, sourcify, proxy, owner] = await Promise.all([
    base
      ? section(`sec:bsc:${key}`, TTL, { name: 'Blockscout', url: base }, async () => {
          try {
            const c = await bs.getContract(base, address);
            return { verified: c.isVerified, name: c.name, compiler: c.compiler, verifiedAt: c.verifiedAt, abi: c.abi };
          } catch (e) {
            if (e instanceof ProviderError && e.status === 404) return { verified: false, name: null, compiler: null, verifiedAt: null, abi: null };
            throw e;
          }
        })
      : Promise.resolve(unavailable<{ verified: boolean; name: string | null; compiler: string | null; verifiedAt: string | null; abi: unknown[] | null }>(`no Blockscout instance for ${net.name}`)),
    section(`sec:src:${key}`, TTL, { name: 'Sourcify', url: 'https://sourcify.dev' }, async () => ({ match: await sourcifyMatch(net.chainId, address) })),
    section(`sec:proxy:${key}`, TTL, { name: evm.rpcSourceName(net) }, async () => {
      const [impl, admin, beacon] = await evm.rpcBatch(net, [
        { method: 'eth_getStorageAt', params: [address, IMPLEMENTATION_SLOT, 'latest'] },
        { method: 'eth_getStorageAt', params: [address, ADMIN_SLOT, 'latest'] },
        { method: 'eth_getStorageAt', params: [address, BEACON_SLOT, 'latest'] },
      ]);
      if (impl instanceof Error) throw new ProviderError('RPC', impl.message);
      return { implementation: slotAddress(impl), admin: slotAddress(admin), beacon: slotAddress(beacon) };
    }),
    section(`sec:owner:${key}`, TTL, { name: evm.rpcSourceName(net) }, async () => {
      let out: string;
      try {
        out = await evm.ethCall(net, address, encodeCall('owner()'));
      } catch {
        return null; // no owner() function
      }
      if (!out || out === '0x' || out.length < 66) return null;
      const [o] = decodeParams([{ type: parseType('address') }], out);
      const ownerAddr = 'value' in o ? o.value : ZERO;
      if (ownerAddr.toLowerCase() === ZERO) return { owner: null, ownerIsContract: null, renounced: true };
      const code = await evm.rpc<string>(net, 'eth_getCode', [ownerAddr, 'latest']).catch(() => null);
      return { owner: ownerAddr, ownerIsContract: code === null ? null : code.length > 2, renounced: false };
    }),
  ]);
  let privileged: string[] | null = null;
  const abi = blockscout.status === 'ok' ? blockscout.data.abi : null;
  if (abi) {
    try {
      const { functions } = parseJsonAbi(abi);
      privileged = [...new Set(functions.filter((f) => f.stateMutability !== 'view' && f.stateMutability !== 'pure' && PRIVILEGED.test(f.name)).map((f) => f.signature))];
    } catch {
      privileged = null;
    }
  }
  // Older proxy patterns (e.g. ZeppelinOS slots, used by USDC) aren't EIP-1967; fall back to what Blockscout detected.
  const bsImpl = info.status === 'ok' ? info.data.implementations.map((i) => i.address).filter(Boolean) : [];
  const proxyOut: ContractChecks['proxy'] =
    proxy.status === 'ok' && !proxy.data.implementation && bsImpl.length
      ? { ...proxy, data: { ...proxy.data, implementation: bsImpl[0], detectedBy: `Blockscout (${info.status === 'ok' ? (info.data.proxyType ?? 'proxy') : 'proxy'})` } }
      : proxy;
  const strip = (s: typeof blockscout) =>
    s.status === 'ok' ? { ...s, data: { verified: s.data.verified, name: s.data.name, compiler: s.data.compiler, verifiedAt: s.data.verifiedAt } } : s;
  return { verification: { blockscout: strip(blockscout), sourcify }, proxy: proxyOut, owner, privileged };
}

export async function securityReport(chainId: string, address: string): Promise<SecurityReport> {
  const net = getNetwork(chainId);
  if (!net) throw new LookupError(`Security checks aren't available for ${chainId}.`, 404);
  const sanctions = checkSanctions(address);
  const chain = { id: net.id, name: net.name, symbol: net.symbol };
  if (net.family !== 'evm') {
    return {
      chain,
      address,
      sanctions,
      reputation: unavailable('reputation data is only available for EVM chains'),
      goplus: unavailable('GoPlus reports are only queried for EVM chains'),
      goplusToken: unavailable('not an EVM token'),
      isContract: null,
      contract: null,
      flagCount: sanctions.listed ? 1 : 0,
    };
  }
  const key = `${net.id}:${address.toLowerCase()}`;
  const base = net.blockscout;
  const [info, goplus, account] = await Promise.all([
    base
      ? section(`info:${key}`, TTL, { name: 'Blockscout', url: base }, () => bs.getAddressInfo(base, address))
      : Promise.resolve(unavailable<bs.AddressInfo>(`no Blockscout instance for ${net.name}`)),
    section(`sec:gp:${key}`, TTL, { name: 'GoPlus Security', url: 'https://gopluslabs.io' }, () => goplusAddress(net.chainId, address)),
    evm.getAccount(net, address).catch(() => null),
  ]);
  const isContract = account ? account.isContract && !account.delegatedTo : info.status === 'ok' ? info.data.isContract : null;
  const [contract, goplusTok] = isContract
    ? await Promise.all([
        contractChecks(net, address, info),
        section(`sec:gpt:${key}`, TTL, { name: 'GoPlus Security', url: 'https://gopluslabs.io' }, () => goplusToken(net.chainId, address)),
      ])
    : [null, unavailable<null>('not a contract')];
  const reputation: SecurityReport['reputation'] =
    info.status === 'ok' ? { ...info, data: { isScam: info.data.isScam, reputation: info.data.reputation, tags: info.data.tags } } : info;

  let flagCount = sanctions.listed ? 1 : 0;
  if (reputation.status === 'ok' && (reputation.data.isScam || (reputation.data.reputation && reputation.data.reputation !== 'ok'))) flagCount++;
  if (goplus.status === 'ok') flagCount += goplus.data.flags.length;
  if (goplusTok.status === 'ok' && goplusTok.data) flagCount += goplusTok.data.flags.filter((f) => /honeypot|cannot|scam|fake|change balances|hidden/i.test(f)).length;

  return { chain, address, sanctions, reputation, goplus, goplusToken: goplusTok, isContract, contract, flagCount };
}

// ---------------------------------------------------------------------------------------------
// Approvals

const APPROVAL_TOPIC = bytesToHex(keccak256('Approval(address,address,uint256)'));
const APPROVAL_FOR_ALL_TOPIC = bytesToHex(keccak256('ApprovalForAll(address,address,bool)'));
const MAX_PAIRS = 60;
const UNLIMITED = BigInt(1) << BigInt(255);

const topicAddress = (t: string | null | undefined) => (t ? toChecksumAddress(`0x${t.slice(-40)}`) : null);
const pad = (a: string) => `0x${'0'.repeat(24)}${a.slice(2).toLowerCase()}`;

function decodeSymbol(hex: unknown): string | null {
  if (typeof hex !== 'string' || hex === '0x') return null;
  try {
    const [s] = decodeParams([{ type: parseType('string') }], hex);
    if ('value' in s && s.value && !s.value.startsWith('0x')) return s.value.slice(0, 20);
  } catch {
    // Some old tokens (e.g. MKR) return bytes32.
  }
  try {
    const bytes = hexToBytes(hex).slice(0, 32);
    const text = new TextDecoder().decode(bytes.filter((b) => b !== 0));
    return /^[\x20-\x7e]{1,20}$/.test(text) ? text : null;
  } catch {
    return null;
  }
}

export async function approvalsReport(chainId: string, owner: string): Promise<ApprovalsResult> {
  const net = getEvmNetwork(chainId);
  if (!net) throw new LookupError('Approval checks are available for EVM chains only.', 404);
  const revokeUrl = `https://revoke.cash/address/${owner}?chainId=${net.chainId}`;
  const chain = { id: net.id, name: net.name, symbol: net.symbol };
  const base = net.blockscout;
  if (!base) {
    return { chain, owner, revokeUrl, approvals: unavailable(`no free log index for ${net.name}; check approvals on revoke.cash`) };
  }
  const approvals = await section(`appr:${net.id}:${owner.toLowerCase()}`, APPROVAL_TTL, { name: `Blockscout logs + ${evm.rpcSourceName(net)}`, url: base }, async () => {
    const [erc, nftOrNull] = await Promise.all([
      bs.getLogs(base, { topic0: APPROVAL_TOPIC, topic1: pad(owner) }),
      // NFT operator approvals are best-effort: a slow log query shouldn't hide the ERC-20 results.
      bs.getLogs(base, { topic0: APPROVAL_FOR_ALL_TOPIC, topic1: pad(owner) }).catch(() => null),
    ]);
    const nft = nftOrNull ?? { logs: [], capped: false };
    // ERC-20 Approval has 3 topics (owner, spender indexed; value in data). ERC-721's has a 4th (tokenId).
    const pairs = new Map<string, { token: string; spender: string; block: number }>();
    for (const log of [...erc.logs].reverse()) {
      const topics = log.topics.filter(Boolean);
      if (topics.length !== 3) continue;
      const spender = topicAddress(topics[2]);
      if (!spender) continue;
      const token = toChecksumAddress(log.address);
      const k = `${token}:${spender}`;
      if (!pairs.has(k)) pairs.set(k, { token, spender, block: Number(BigInt(log.blockNumber)) });
      if (pairs.size >= MAX_PAIRS) break;
    }
    const operators = new Map<string, { collection: string; operator: string }>();
    for (const log of [...nft.logs].reverse()) {
      const topics = log.topics.filter(Boolean);
      const operator = topicAddress(topics[2]);
      if (!operator) continue;
      const collection = toChecksumAddress(log.address);
      operators.set(`${collection}:${operator}`, { collection, operator });
      if (operators.size >= MAX_PAIRS) break;
    }

    const pairList = [...pairs.values()];
    const tokens = [...new Set(pairList.map((p) => p.token))];
    const spenders = [...new Set([...pairList.map((p) => p.spender), ...[...operators.values()].map((o) => o.operator)])];
    const opList = [...operators.values()];
    const calls = [
      ...pairList.map((p) => ({ method: 'eth_call', params: [{ to: p.token, data: encodeCall('allowance(address,address)', [owner, p.spender]) }, 'latest'] })),
      ...tokens.flatMap((t) => [
        { method: 'eth_call', params: [{ to: t, data: encodeCall('symbol()') }, 'latest'] },
        { method: 'eth_call', params: [{ to: t, data: encodeCall('decimals()') }, 'latest'] },
      ]),
      ...spenders.map((s) => ({ method: 'eth_getCode', params: [s, 'latest'] })),
      ...opList.map((o) => ({ method: 'eth_call', params: [{ to: o.collection, data: encodeCall('isApprovedForAll(address,address)', [owner, o.operator]) }, 'latest'] })),
    ];
    const results = calls.length ? await evm.rpcBatch(net, calls) : [];
    let i = 0;
    const allowances = pairList.map(() => results[i++]);
    const meta = new Map<string, { symbol: string | null; decimals: number | null }>();
    for (const t of tokens) {
      const sym = results[i++];
      const dec = results[i++];
      const decimals = typeof dec === 'string' && dec.length >= 66 ? Number(BigInt(dec.slice(0, 66))) : null;
      meta.set(t, { symbol: sym instanceof Error ? null : decodeSymbol(sym), decimals: decimals !== null && decimals <= 77 ? decimals : null });
    }
    const codes = new Map<string, boolean | null>();
    for (const s of spenders) {
      const code = results[i++];
      codes.set(s, typeof code === 'string' ? code.length > 2 : null);
    }
    const nftStates = opList.map(() => results[i++]);

    const erc20: ApprovalRow[] = [];
    pairList.forEach((p, idx) => {
      const r = allowances[idx];
      if (typeof r !== 'string' || r.length < 66) return;
      const raw = BigInt(r.slice(0, 66));
      if (raw === BigInt(0)) return;
      const m = meta.get(p.token) ?? { symbol: null, decimals: null };
      erc20.push({
        token: p.token,
        symbol: m.symbol,
        decimals: m.decimals,
        spender: p.spender,
        spenderLabel: spenderLabel(p.spender),
        spenderIsContract: codes.get(p.spender) ?? null,
        allowanceRaw: raw.toString(),
        allowance: m.decimals === null ? null : formatUnits(raw, m.decimals),
        unlimited: raw >= UNLIMITED,
        lastApprovedBlock: p.block,
      });
    });
    erc20.sort((a, b) => Number(b.unlimited) - Number(a.unlimited) || b.lastApprovedBlock - a.lastApprovedBlock);
    const nftRows: NftApprovalRow[] = [];
    opList.forEach((o, idx) => {
      const r = nftStates[idx];
      if (typeof r === 'string' && r.length >= 66 && BigInt(r.slice(0, 66)) !== BigInt(0)) {
        nftRows.push({ collection: o.collection, operator: o.operator, operatorLabel: spenderLabel(o.operator), operatorIsContract: codes.get(o.operator) ?? null });
      }
    });
    return { erc20, nft: nftRows, nftChecked: nftOrNull !== null, logsScanned: erc.logs.length + nft.logs.length, capped: erc.capped || nft.capped || pairs.size >= MAX_PAIRS };
  });
  return { chain, owner, revokeUrl, approvals };
}
