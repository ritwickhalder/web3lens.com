/**
 * Native lookups: combines the provider adapters behind the cache. Each section is fetched and
 * cached independently, so one slow or failing provider only blanks its own section.
 * Server-side only (it reads env overrides for RPCs and sets a User-Agent).
 */
import { formatDecoded } from '@/lib/evm/abi';
import { decodeCalldata } from '@/lib/evm/signatures';
import type {
  AddressResult,
  ChainRef,
  DecodedInput,
  EvmAddressResult,
  GasResult,
  LocateResult,
  MultichainResult,
  Section,
  Source,
  TxResult,
} from '@/lib/lookup-types';
import { EVM_NETWORKS, getNetwork, UTXO_NETWORKS, type EvmNetwork, type Network } from '@/lib/networks';
import * as bs from '@/lib/providers/blockscout';
import * as evm from '@/lib/providers/evm';
import * as esplora from '@/lib/providers/esplora';
import { ProviderError } from '@/lib/providers/http';
import { getUsdPrices } from '@/lib/providers/prices';
import * as sol from '@/lib/providers/solana';
import { cached } from '@/lib/server/cache';
import { formatUnits } from '@/lib/tools/units';

const SEC = 1000;
const MIN = 60 * SEC;
const TTL = {
  account: { ttl: 30 * SEC, stale: 15 * MIN },
  tokens: { ttl: 2 * MIN, stale: 30 * MIN },
  info: { ttl: 10 * MIN, stale: 6 * 60 * MIN },
  activity: { ttl: 1 * MIN, stale: 30 * MIN },
  price: { ttl: 5 * MIN, stale: 60 * MIN },
  txFinal: { ttl: 24 * 60 * MIN, stale: 24 * 60 * MIN },
  txPending: { ttl: 15 * SEC, stale: 5 * MIN },
  gas: { ttl: 20 * SEC, stale: 5 * MIN },
};

function reasonOf(e: unknown): string {
  if (e instanceof ProviderError) return e.message;
  return 'the data source did not respond';
}

async function section<T>(key: string, ttl: { ttl: number; stale: number }, source: Source | (() => Source), fn: () => Promise<T>): Promise<Section<T>> {
  try {
    const r = await cached(key, ttl.ttl, ttl.stale, fn);
    return { status: 'ok', data: r.value, source: typeof source === 'function' ? source() : source, fetchedAt: new Date(r.fetchedAt).toISOString(), stale: r.stale };
  } catch (e) {
    return { status: 'unavailable', reason: reasonOf(e), source: typeof source === 'function' ? source() : source };
  }
}

const unavailable = <T>(reason: string): Section<T> => ({ status: 'unavailable', reason });

function chainRef(n: Network): ChainRef {
  return { id: n.id, name: n.name, symbol: n.symbol };
}

const COINGECKO: Source = { name: 'CoinGecko', url: 'https://www.coingecko.com' };

async function price(id: string | undefined): Promise<Section<number>> {
  if (!id) return unavailable('no price source for this asset');
  const s = await section(`price:${id}`, TTL.price, COINGECKO, async () => {
    const p = await getUsdPrices([id]);
    if (p[id] === undefined) throw new ProviderError('CoinGecko', 'no price');
    return p[id];
  });
  return s;
}

const blockscoutSource = (base: string): Source => ({ name: 'Blockscout', url: base });
const rpcSource = (net: EvmNetwork): Source => ({ name: evm.rpcSourceName(net) });

// ---------------------------------------------------------------------------------------------
// Addresses

async function evmAddress(net: EvmNetwork, address: string, resolvedFrom?: string): Promise<EvmAddressResult> {
  const key = `${net.id}:${address.toLowerCase()}`;
  const base = net.blockscout;
  const noIndex = unavailable<never>(`no free token/history index for ${net.name}; use the explorer links`);
  const [account, priceUsd, tokens, info, activity, ensName] = await Promise.all([
    section(`acct:${key}`, TTL.account, rpcSource(net), async () => {
      const a = await evm.getAccount(net, address);
      return { ...a, balance: formatUnits(BigInt(a.balanceWei), 18) };
    }),
    price(net.coingecko),
    base ? section(`tok:${key}`, TTL.tokens, blockscoutSource(base), () => bs.getTokens(base, address)) : noIndex,
    base ? section(`info:${key}`, TTL.info, blockscoutSource(base), () => bs.getAddressInfo(base, address)) : noIndex,
    base
      ? section(`act:${key}`, TTL.activity, blockscoutSource(base), async () => {
          const [counters, recent] = await Promise.all([bs.getCounters(base, address).catch(() => ({ txCount: null, transfers: null })), bs.getRecentTransactions(base, address)]);
          return { ...counters, recent };
        })
      : noIndex,
    net.id === 'ethereum'
      ? section(`ens:${address.toLowerCase()}`, TTL.info, { name: 'ENS (on-chain)', url: 'https://ens.domains' }, () => evm.reverseEns(net, address))
      : Promise.resolve(unavailable<string | null>('ENS reverse records are read on Ethereum only')),
  ]);
  return { family: 'evm', chain: chainRef(net), address, resolvedFrom, ensName, account, priceUsd, tokens, info, activity };
}

export async function resolveName(name: string): Promise<Section<string | null>> {
  const eth = EVM_NETWORKS[0];
  return section(`ensfwd:${name.toLowerCase()}`, TTL.info, { name: 'ENS (on-chain)', url: 'https://ens.domains' }, () => evm.resolveEns(eth, name.toLowerCase()));
}

export class LookupError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

/** `query` must already be validated as an address (or ENS name for Ethereum) of the chain's format. */
export async function lookupAddress(chainId: string, query: string): Promise<AddressResult> {
  const net = getNetwork(chainId);
  if (!net) throw new LookupError(`Native lookups aren't available for ${chainId}.`, 404);
  if (net.family === 'evm') {
    if (/\.eth$/i.test(query)) {
      if (net.id !== 'ethereum') throw new LookupError('ENS names resolve on Ethereum.');
      const r = await resolveName(query);
      if (r.status !== 'ok') throw new LookupError(`Couldn't resolve ${query}: ${r.reason}.`, 502);
      if (!r.data) throw new LookupError(`${query} has no address set on-chain (off-chain/CCIP names aren't supported yet).`, 404);
      return evmAddress(net, r.data, query.toLowerCase());
    }
    return evmAddress(net, query);
  }
  if (net.family === 'utxo') {
    const key = `${net.id}:${query}`;
    const host = { name: new URL(net.esplora[0]).hostname, url: net.esplora[0].replace(/\/api$/, '') };
    const [account, priceUsd, recent] = await Promise.all([
      section(`acct:${key}`, TTL.account, host, async () => {
        const { value } = await esplora.getUtxoAccount(net, query);
        return { ...value, balance: formatUnits(BigInt(value.balanceSat), 8) };
      }),
      price(net.coingecko),
      section(`act:${key}`, TTL.activity, host, () => esplora.getUtxoRecent(net, query)),
    ]);
    return { family: 'utxo', chain: chainRef(net), address: query, account, priceUsd, recent };
  }
  const key = `solana:${query}`;
  const src = { name: 'Solana RPC' };
  const [account, priceUsd, tokens, recent] = await Promise.all([
    section(`acct:${key}`, TTL.account, src, async () => {
      const { value } = await sol.getSolanaAccount(net, query);
      return { ...value, balance: formatUnits(BigInt(value.lamports), 9) };
    }),
    price(net.coingecko),
    section(`tok:${key}`, TTL.tokens, src, async () => {
      const r = await sol.getSplTokens(net, query);
      return { items: r.items, partial: r.partial };
    }),
    section(`act:${key}`, TTL.activity, src, () => sol.getSolanaSignatures(net, query)),
  ]);
  return { family: 'solana', chain: chainRef(net), address: query, account, priceUsd, tokens, recent };
}

// ---------------------------------------------------------------------------------------------
// Transactions

function decodeInput(input: string, detail: Section<bs.BsTxDetail>): DecodedInput[] {
  if (detail.status === 'ok' && detail.data.decoded) {
    const d = detail.data.decoded;
    return [
      {
        via: 'verified',
        signature: d.method_call,
        params: d.parameters.map((p) => ({ name: p.name, type: p.type, value: typeof p.value === 'string' ? p.value : JSON.stringify(p.value) })),
      },
    ];
  }
  return decodeCalldata(input).map((c) => ({
    via: 'known',
    signature: c.fn.signature,
    params: c.args.map((a, i) => ({ name: a.name ?? c.fn.inputs[i]?.name ?? `arg${i}`, type: a.type, value: formatDecoded(a) })),
  }));
}

export async function lookupTx(chainId: string, hash: string): Promise<TxResult> {
  const net = getNetwork(chainId);
  if (!net) throw new LookupError(`Native lookups aren't available for ${chainId}.`, 404);
  if (net.family === 'evm') {
    const key = `tx:${net.id}:${hash.toLowerCase()}`;
    // Look once with a short TTL; confirmed transactions are re-cached for a day below.
    const first = await section(key, TTL.txPending, rpcSource(net), () => evm.getTransaction(net, hash));
    let tx = first;
    if (first.status === 'ok' && first.data && first.data.status !== 'pending') {
      tx = await section(`${key}:final`, TTL.txFinal, rpcSource(net), async () => first.data);
    }
    const base = net.blockscout;
    const found = tx.status === 'ok' && tx.data !== null;
    const [detail, priceUsd] = await Promise.all([
      base && found
        ? section(`txd:${net.id}:${hash.toLowerCase()}`, TTL.txFinal, blockscoutSource(base), () => bs.getTransactionDetail(base, hash))
        : Promise.resolve(unavailable<bs.BsTxDetail>(base ? 'transaction not found' : `no free decoded-transaction index for ${net.name}`)),
      price(net.coingecko),
    ]);
    const decoded = tx.status === 'ok' && tx.data && tx.data.input !== '0x' ? decodeInput(tx.data.input, detail) : [];
    return { family: 'evm', chain: chainRef(net), hash, tx, detail, decoded, priceUsd };
  }
  if (net.family === 'utxo') {
    const host = { name: new URL(net.esplora[0]).hostname, url: net.esplora[0].replace(/\/api$/, '') };
    const [tx, priceUsd] = await Promise.all([
      section(`tx:${net.id}:${hash}`, TTL.txPending, host, async () => (await esplora.getUtxoTx(net, hash))?.value ?? null),
      price(net.coingecko),
    ]);
    return { family: 'utxo', chain: chainRef(net), hash, tx, priceUsd };
  }
  const [tx, priceUsd] = await Promise.all([
    section(`tx:solana:${hash}`, TTL.txPending, { name: 'Solana RPC' }, async () => (await sol.getSolanaTx(net, hash))?.value ?? null),
    price(net.coingecko),
  ]);
  return { family: 'solana', chain: chainRef(net), hash, tx, priceUsd };
}

// ---------------------------------------------------------------------------------------------
// Cross-chain

async function pricesFor(ids: (string | undefined)[]): Promise<{ prices: Record<string, number>; ok: boolean }> {
  const want = [...new Set(ids.filter((x): x is string => Boolean(x)))].sort();
  try {
    const r = await cached(`prices:${want.join(',')}`, TTL.price.ttl, TTL.price.stale, () => getUsdPrices(want));
    return { prices: r.value, ok: true };
  } catch {
    return { prices: {}, ok: false };
  }
}

/** One EVM address on every supported EVM chain: native balance, nonce, contract or not. */
export async function multichainAddress(address: string): Promise<MultichainResult> {
  const [rows, { prices, ok }] = await Promise.all([
    Promise.all(
      EVM_NETWORKS.map(async (net) => {
        const s = await section(`acct:${net.id}:${address.toLowerCase()}`, TTL.account, rpcSource(net), async () => {
          const a = await evm.getAccount(net, address);
          return { ...a, balance: formatUnits(BigInt(a.balanceWei), 18) };
        });
        return { net, s };
      }),
    ),
    pricesFor(EVM_NETWORKS.map((n) => n.coingecko)),
  ]);
  return {
    address,
    fetchedAt: new Date().toISOString(),
    priceSource: ok ? COINGECKO : null,
    rows: rows.map(({ net, s }) =>
      s.status === 'ok'
        ? {
            chain: chainRef(net),
            status: 'ok' as const,
            balance: s.data.balance,
            balanceWei: s.data.balanceWei,
            nonce: s.data.nonce,
            isContract: s.data.isContract,
            usd: net.coingecko && prices[net.coingecko] !== undefined ? Number(s.data.balance) * prices[net.coingecko] : null,
            stale: s.stale,
          }
        : { chain: chainRef(net), status: 'unavailable' as const, reason: s.reason },
    ),
  };
}

/** Which EVM chains know this transaction hash. */
export async function locateTx(hash: string): Promise<LocateResult> {
  const rows = await Promise.all(
    EVM_NETWORKS.map(async (net) => {
      const s = await section(`loc:${net.id}:${hash.toLowerCase()}`, TTL.txPending, rpcSource(net), async () => {
        const t = await evm.rpc<unknown>(net, 'eth_getTransactionByHash', [hash]);
        return t !== null;
      });
      return s.status === 'ok'
        ? { chain: chainRef(net), status: s.data ? ('found' as const) : ('not-found' as const) }
        : { chain: chainRef(net), status: 'unavailable' as const, reason: s.reason };
    }),
  );
  return { hash, rows, fetchedAt: new Date().toISOString() };
}

export async function gasOverview(): Promise<GasResult> {
  const btc = UTXO_NETWORKS[0];
  const [evmRows, bitcoin, { prices }] = await Promise.all([
    Promise.all(
      EVM_NETWORKS.map(async (net) => {
        const s = await section(`gas:${net.id}`, TTL.gas, rpcSource(net), () => evm.getGas(net));
        const gwei = (w: string | null) => (w === null ? null : formatUnits(BigInt(w), 9));
        return s.status === 'ok'
          ? {
              chain: chainRef(net),
              status: 'ok' as const,
              gasPriceGwei: gwei(s.data.gasPriceWei)!,
              baseFeeGwei: gwei(s.data.baseFeeWei),
              priorityFeeGwei: gwei(s.data.priorityFeeWei),
              stale: s.stale,
            }
          : { chain: chainRef(net), status: 'unavailable' as const, reason: s.reason };
      }),
    ),
    section('fees:bitcoin', TTL.gas, { name: 'mempool.space', url: 'https://mempool.space' }, async () => (await esplora.getFees(btc)).value),
    pricesFor([...EVM_NETWORKS.map((n) => n.coingecko), 'bitcoin']),
  ]);
  return { evm: evmRows, bitcoin, prices, fetchedAt: new Date().toISOString() };
}
