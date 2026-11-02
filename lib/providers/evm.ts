/** EVM JSON-RPC over public endpoints, with failover and batching. Server-side only. */
import { bytesToHex } from '@/lib/codec/bytes';
import { keccak256 } from '@/lib/codec/keccak';
import { decodeParams, encodeCall, parseType } from '@/lib/evm/abi';
import type { EvmNetwork } from '@/lib/networks';
import { fetchJson, ProviderError } from '@/lib/providers/http';

type RpcRequest = { method: string; params: unknown[] };
type RpcResponse = { id: number; result?: unknown; error?: { code: number; message: string } };

/** RPC URLs for a network: an optional private RPC_URL_<ID> env override first, then the public ones. */
export function rpcUrls(net: EvmNetwork): string[] {
  const env = typeof process !== 'undefined' ? process.env[`RPC_URL_${net.id.toUpperCase()}`] : undefined;
  return env ? [env, ...net.rpc] : net.rpc;
}

/** Hostname only, so private RPC URLs (which may embed keys) are never shown. */
export function rpcSourceName(net: EvmNetwork): string {
  const url = rpcUrls(net)[0];
  if (url !== net.rpc[0]) return 'private RPC';
  return new URL(url).hostname;
}

/** Sends a batch, trying each RPC in turn. Results are in request order; per-call errors come back as Error values. */
export async function rpcBatch(net: EvmNetwork, calls: RpcRequest[]): Promise<(unknown | Error)[]> {
  const body = calls.map((c, i) => ({ jsonrpc: '2.0', id: i + 1, method: c.method, params: c.params }));
  let lastError: unknown;
  for (const url of rpcUrls(net)) {
    try {
      const res = await fetchJson<RpcResponse[] | RpcResponse>(`${net.name} RPC`, url, { method: 'POST', body, timeoutMs: 8000 });
      if (!Array.isArray(res)) throw new ProviderError(`${net.name} RPC`, res.error?.message ?? 'unexpected batch response');
      const byId = new Map(res.map((r) => [r.id, r]));
      return calls.map((_, i) => {
        const r = byId.get(i + 1);
        if (!r) return new Error('missing response');
        if (r.error) return new Error(r.error.message);
        return r.result;
      });
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error ? lastError : new ProviderError(`${net.name} RPC`, 'all endpoints failed');
}

export async function rpc<T>(net: EvmNetwork, method: string, params: unknown[]): Promise<T> {
  const [r] = await rpcBatch(net, [{ method, params }]);
  if (r instanceof Error) throw new ProviderError(`${net.name} RPC`, r.message);
  return r as T;
}

const hexNum = (h: unknown): number => (typeof h === 'string' ? Number(BigInt(h)) : NaN);
const hexBig = (h: unknown): bigint => (typeof h === 'string' ? BigInt(h) : BigInt(0));

export type EvmAccount = {
  balanceWei: string;
  nonce: number;
  isContract: boolean;
  codeSize: number;
  /** EIP-7702: the contract an EOA delegates to (code 0xef0100 + address). */
  delegatedTo: string | null;
  block: number;
};

export async function getAccount(net: EvmNetwork, address: string): Promise<EvmAccount> {
  const [balance, nonce, code, block] = await rpcBatch(net, [
    { method: 'eth_getBalance', params: [address, 'latest'] },
    { method: 'eth_getTransactionCount', params: [address, 'latest'] },
    { method: 'eth_getCode', params: [address, 'latest'] },
    { method: 'eth_blockNumber', params: [] },
  ]);
  if (balance instanceof Error) throw new ProviderError(`${net.name} RPC`, balance.message);
  const codeHex = typeof code === 'string' ? code : '0x';
  return {
    balanceWei: hexBig(balance).toString(),
    nonce: nonce instanceof Error ? -1 : hexNum(nonce),
    // EIP-7702 delegated EOAs have code 0xef0100…; report them as contracts with the code size.
    isContract: codeHex.length > 2,
    codeSize: (codeHex.length - 2) / 2,
    delegatedTo: /^0xef0100[0-9a-f]{40}$/i.test(codeHex) ? `0x${codeHex.slice(8)}` : null,
    block: block instanceof Error ? -1 : hexNum(block),
  };
}

type RawTx = {
  hash: string;
  from: string;
  to: string | null;
  value: string;
  input: string;
  nonce: string;
  gas: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  blockNumber: string | null;
  type?: string;
};
type RawReceipt = { status?: string; gasUsed: string; effectiveGasPrice?: string; contractAddress: string | null; logs: { address: string; topics: string[]; data: string }[] };

export type EvmTx = {
  hash: string;
  from: string;
  to: string | null;
  valueWei: string;
  input: string;
  nonce: number;
  gasLimit: string;
  type: number;
  blockNumber: number | null;
  timestamp: number | null;
  confirmations: number | null;
  status: 'success' | 'failed' | 'pending';
  gasUsed: string | null;
  effectiveGasPriceWei: string | null;
  feeWei: string | null;
  contractCreated: string | null;
  logs: { address: string; topics: string[]; data: string }[];
};

/** Returns null when the transaction isn't known to this chain. */
export async function getTransaction(net: EvmNetwork, hash: string): Promise<EvmTx | null> {
  const [tx, receipt, head] = await rpcBatch(net, [
    { method: 'eth_getTransactionByHash', params: [hash] },
    { method: 'eth_getTransactionReceipt', params: [hash] },
    { method: 'eth_blockNumber', params: [] },
  ]);
  if (tx instanceof Error) throw new ProviderError(`${net.name} RPC`, tx.message);
  if (!tx) return null;
  const t = tx as RawTx;
  const rc = receipt instanceof Error ? null : (receipt as RawReceipt | null);
  const blockNumber = t.blockNumber ? hexNum(t.blockNumber) : null;
  let timestamp: number | null = null;
  if (blockNumber !== null) {
    const block = await rpc<{ timestamp: string } | null>(net, 'eth_getBlockByNumber', [t.blockNumber, false]).catch(() => null);
    timestamp = block ? hexNum(block.timestamp) : null;
  }
  const gasUsed = rc ? hexBig(rc.gasUsed) : null;
  const price = rc?.effectiveGasPrice ? hexBig(rc.effectiveGasPrice) : t.gasPrice ? hexBig(t.gasPrice) : null;
  return {
    hash: t.hash,
    from: t.from,
    to: t.to,
    valueWei: hexBig(t.value).toString(),
    input: t.input,
    nonce: hexNum(t.nonce),
    gasLimit: hexBig(t.gas).toString(),
    type: t.type ? hexNum(t.type) : 0,
    blockNumber,
    timestamp,
    confirmations: blockNumber !== null && !(head instanceof Error) ? hexNum(head) - blockNumber + 1 : null,
    status: !rc ? 'pending' : rc.status === '0x0' ? 'failed' : 'success',
    gasUsed: gasUsed?.toString() ?? null,
    effectiveGasPriceWei: price?.toString() ?? null,
    // L2s add an L1 data fee that isn't in gasUsed × price; the page says the fee is the execution fee.
    feeWei: gasUsed !== null && price !== null ? (gasUsed * price).toString() : null,
    contractCreated: rc?.contractAddress ?? null,
    logs: rc?.logs ?? [],
  };
}

export async function ethCall(net: EvmNetwork, to: string, data: string): Promise<string> {
  return rpc<string>(net, 'eth_call', [{ to, data }, 'latest']);
}

export type GasInfo = { gasPriceWei: string; baseFeeWei: string | null; priorityFeeWei: string | null; block: number };

export async function getGas(net: EvmNetwork): Promise<GasInfo> {
  const [gasPrice, priority, block] = await rpcBatch(net, [
    { method: 'eth_gasPrice', params: [] },
    { method: 'eth_maxPriorityFeePerGas', params: [] },
    { method: 'eth_getBlockByNumber', params: ['latest', false] },
  ]);
  if (gasPrice instanceof Error) throw new ProviderError(`${net.name} RPC`, gasPrice.message);
  const b = block instanceof Error ? null : (block as { baseFeePerGas?: string; number: string } | null);
  return {
    gasPriceWei: hexBig(gasPrice).toString(),
    baseFeeWei: b?.baseFeePerGas ? hexBig(b.baseFeePerGas).toString() : null,
    priorityFeeWei: priority instanceof Error ? null : hexBig(priority).toString(),
    block: b ? hexNum(b.number) : -1,
  };
}

// ---------------------------------------------------------------------------------------------
// ENS (on-chain resolution through the registry; off-chain CCIP-read names are not supported)

const ENS_REGISTRY = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export function namehash(name: string): string {
  let node: Uint8Array = new Uint8Array(32);
  if (name) {
    for (const label of name.toLowerCase().split('.').reverse()) {
      const merged = new Uint8Array(64);
      merged.set(node);
      merged.set(keccak256(label), 32);
      node = keccak256(merged);
    }
  }
  return bytesToHex(node);
}

const ADDRESS = [{ type: parseType('address') }];
const STRING = [{ type: parseType('string') }];

async function resolverOf(net: EvmNetwork, node: string): Promise<string | null> {
  const out = await ethCall(net, ENS_REGISTRY, encodeCall('resolver(bytes32)', [node]));
  const [r] = decodeParams(ADDRESS, out);
  const addr = 'value' in r ? r.value : ZERO_ADDRESS;
  return addr === ZERO_ADDRESS ? null : addr;
}

/** name.eth → address, or null when the name has no on-chain resolver/address. */
export async function resolveEns(net: EvmNetwork, name: string): Promise<string | null> {
  const node = namehash(name);
  const resolver = await resolverOf(net, node);
  if (!resolver) return null;
  const out = await ethCall(net, resolver, encodeCall('addr(bytes32)', [node]));
  if (out === '0x') return null;
  const [r] = decodeParams(ADDRESS, out);
  const addr = 'value' in r ? r.value : ZERO_ADDRESS;
  return addr === ZERO_ADDRESS ? null : addr;
}

/** address → primary ENS name, verified by resolving it forward again. */
export async function reverseEns(net: EvmNetwork, address: string): Promise<string | null> {
  const node = namehash(`${address.slice(2).toLowerCase()}.addr.reverse`);
  const resolver = await resolverOf(net, node);
  if (!resolver) return null;
  const out = await ethCall(net, resolver, encodeCall('name(bytes32)', [node]));
  if (out === '0x') return null;
  const [r] = decodeParams(STRING, out);
  const name = 'value' in r ? r.value : '';
  if (!name) return null;
  const forward = await resolveEns(net, name).catch(() => null);
  return forward?.toLowerCase() === address.toLowerCase() ? name : null;
}
