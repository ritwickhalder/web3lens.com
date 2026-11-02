/** Esplora / mempool.space REST APIs (Bitcoin, Litecoin): free, no key. */
import type { UtxoNetwork } from '@/lib/networks';
import { fetchJson, ProviderError } from '@/lib/providers/http';

async function tryEach<T>(net: UtxoNetwork, path: string): Promise<{ value: T; host: string }> {
  let last: unknown;
  for (const base of net.esplora) {
    const host = new URL(base).hostname;
    try {
      return { value: await fetchJson<T>(host, `${base}${path}`, { timeoutMs: 8000 }), host };
    } catch (e) {
      // A 404 is an answer ("no such tx"), not a reason to try the next mirror.
      if (e instanceof ProviderError && e.status === 404) throw e;
      last = e;
    }
  }
  throw last;
}

type Stats = { funded_txo_sum: number; spent_txo_sum: number; tx_count: number };

export type UtxoAccount = { balanceSat: number; receivedSat: number; sentSat: number; txCount: number; mempoolTxCount: number; mempoolDeltaSat: number };

export async function getUtxoAccount(net: UtxoNetwork, address: string): Promise<{ value: UtxoAccount; host: string }> {
  const { value: a, host } = await tryEach<{ chain_stats: Stats; mempool_stats: Stats }>(net, `/address/${address}`);
  return {
    host,
    value: {
      balanceSat: a.chain_stats.funded_txo_sum - a.chain_stats.spent_txo_sum,
      receivedSat: a.chain_stats.funded_txo_sum,
      sentSat: a.chain_stats.spent_txo_sum,
      txCount: a.chain_stats.tx_count,
      mempoolTxCount: a.mempool_stats.tx_count,
      mempoolDeltaSat: a.mempool_stats.funded_txo_sum - a.mempool_stats.spent_txo_sum,
    },
  };
}

type RawTx = {
  txid: string;
  fee: number;
  size: number;
  weight: number;
  status: { confirmed: boolean; block_height?: number; block_time?: number };
  vin: { prevout: { scriptpubkey_address?: string; value: number } | null; is_coinbase: boolean }[];
  vout: { scriptpubkey_address?: string; value: number; scriptpubkey_type: string }[];
};

export type UtxoTxSummary = { txid: string; confirmed: boolean; blockHeight: number | null; time: number | null; feeSat: number; netSat: number | null };

/** Recent transactions with the net effect on `address` (received − spent), in satoshis. */
export async function getUtxoRecent(net: UtxoNetwork, address: string, limit = 10): Promise<UtxoTxSummary[]> {
  const { value } = await tryEach<RawTx[]>(net, `/address/${address}/txs`);
  return value.slice(0, limit).map((t) => {
    const out = t.vout.filter((o) => o.scriptpubkey_address === address).reduce((n, o) => n + o.value, 0);
    const spent = t.vin.filter((i) => i.prevout?.scriptpubkey_address === address).reduce((n, i) => n + (i.prevout?.value ?? 0), 0);
    return {
      txid: t.txid,
      confirmed: t.status.confirmed,
      blockHeight: t.status.block_height ?? null,
      time: t.status.block_time ?? null,
      feeSat: t.fee,
      netSat: out - spent,
    };
  });
}

export type UtxoTx = {
  txid: string;
  confirmed: boolean;
  blockHeight: number | null;
  time: number | null;
  confirmations: number | null;
  feeSat: number;
  vsize: number;
  feeRate: number;
  inputs: { address: string | null; valueSat: number | null; coinbase: boolean }[];
  outputs: { address: string | null; valueSat: number; type: string }[];
  totalOutSat: number;
};

/** Returns null when the transaction doesn't exist on this chain. */
export async function getUtxoTx(net: UtxoNetwork, txid: string): Promise<{ value: UtxoTx; host: string } | null> {
  let res: { value: RawTx; host: string };
  try {
    res = await tryEach<RawTx>(net, `/tx/${txid}`);
  } catch (e) {
    if (e instanceof ProviderError && (e.status === 404 || e.status === 400)) return null;
    throw e;
  }
  const t = res.value;
  let tip: number | null = null;
  try {
    tip = (await tryEach<number>(net, '/blocks/tip/height')).value;
  } catch {
    tip = null;
  }
  const vsize = Math.ceil(t.weight / 4);
  return {
    host: res.host,
    value: {
      txid: t.txid,
      confirmed: t.status.confirmed,
      blockHeight: t.status.block_height ?? null,
      time: t.status.block_time ?? null,
      confirmations: t.status.confirmed && tip !== null && t.status.block_height != null ? tip - t.status.block_height + 1 : t.status.confirmed ? null : 0,
      feeSat: t.fee,
      vsize,
      feeRate: Math.round((t.fee / vsize) * 10) / 10,
      inputs: t.vin.slice(0, 100).map((i) => ({ address: i.prevout?.scriptpubkey_address ?? null, valueSat: i.prevout?.value ?? null, coinbase: i.is_coinbase })),
      outputs: t.vout.slice(0, 100).map((o) => ({ address: o.scriptpubkey_address ?? null, valueSat: o.value, type: o.scriptpubkey_type })),
      totalOutSat: t.vout.reduce((n, o) => n + o.value, 0),
    },
  };
}

export type FeeEstimates = { fastest: number; halfHour: number; hour: number; economy: number; minimum: number };

/** sat/vB recommendations. mempool.space has a dedicated endpoint; Esplora mirrors expose /fee-estimates. */
export async function getFees(net: UtxoNetwork): Promise<{ value: FeeEstimates; host: string }> {
  const base = net.esplora[0];
  const host = new URL(base).hostname;
  try {
    const f = await fetchJson<{ fastestFee: number; halfHourFee: number; hourFee: number; economyFee: number; minimumFee: number }>(
      host,
      `${base}/v1/fees/recommended`,
    );
    return { host, value: { fastest: f.fastestFee, halfHour: f.halfHourFee, hour: f.hourFee, economy: f.economyFee, minimum: f.minimumFee } };
  } catch {
    const { value: e, host: h } = await tryEach<Record<string, number>>(net, '/fee-estimates');
    return { host: h, value: { fastest: e['1'], halfHour: e['3'], hour: e['6'], economy: e['144'], minimum: e['1008'] ?? e['144'] } };
  }
}
