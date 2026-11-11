/**
 * Watchlist checks (Pro). A watch remembers the last activity counter (EVM nonce, or Bitcoin/Litecoin transaction
 * count) and the native balance; each check compares them with a fresh snapshot from the same free public sources the
 * address pages use. The first check records a baseline only. A provider error is never an alert and never "no
 * activity": it is stored as `last_error` and retried later.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { getNetwork } from '@/lib/networks';
import * as evm from '@/lib/providers/evm';
import { getUtxoAccount } from '@/lib/providers/esplora';
import { serverEnv } from '@/lib/server/env';

export type Snapshot = { count: number; balance: string; source: string; fetchedAt: number };
export type AlertKind = 'sent' | 'received' | 'balance_changed';

/** Chains a watch can use: the native EVM networks and Bitcoin/Litecoin. */
export function watchableChain(chainId: string): 'evm' | 'utxo' | null {
  const net = getNetwork(chainId);
  return net?.family === 'evm' ? 'evm' : net?.family === 'utxo' ? 'utxo' : null;
}

/**
 * Pure: what changed between the stored state and a fresh snapshot. null = nothing to report (or the first check).
 * EVM: the nonce only grows when the address sends, so a higher nonce is "sent"; otherwise a higher balance is
 * "received"; any other balance move is "balance_changed". UTXO: more transactions or a different balance means
 * activity; the balance direction says which.
 */
export function diffWatch(family: 'evm' | 'utxo', prev: { count: number | null; balance: string | null }, next: Snapshot): AlertKind | null {
  if (prev.count === null || prev.balance === null) return null;
  const before = BigInt(prev.balance);
  const after = BigInt(next.balance);
  if (family === 'evm') {
    if (next.count > prev.count) return 'sent';
    if (after > before) return 'received';
    if (after !== before) return 'balance_changed';
    return null;
  }
  if (next.count === prev.count && after === before) return null;
  if (after > before) return 'received';
  if (after < before) return 'sent';
  return 'balance_changed';
}

type Fetcher = (chainId: string, address: string) => Promise<Snapshot>;

async function fetchSnapshot(chainId: string, address: string): Promise<Snapshot> {
  const net = getNetwork(chainId);
  if (net?.family === 'evm') {
    const a = await evm.getAccount(net, address);
    return { count: a.nonce, balance: a.balanceWei, source: evm.rpcSourceName(net), fetchedAt: Date.now() };
  }
  if (net?.family === 'utxo') {
    const { value, host } = await getUtxoAccount(net, address);
    return { count: value.txCount, balance: String(value.balanceSat), source: host, fetchedAt: Date.now() };
  }
  throw new Error(`Watching isn't available for ${chainId}.`);
}

let fetcher: Fetcher = fetchSnapshot;

/** Tests only. */
export function setWatchFetcher(fn: Fetcher | null) {
  fetcher = fn ?? fetchSnapshot;
}

export const snapshotOf: Fetcher = (chainId, address) => fetcher(chainId, address);

/* ---- One-click email unsubscribe (signed, no sign-in needed) ---- */

const sign = (watchId: string) => createHmac('sha256', `${serverEnv.authSecret}|watch-unsubscribe`).update(watchId).digest('base64url');

export function unsubscribeToken(watchId: string): string {
  return `${watchId}.${sign(watchId)}`;
}

/** The watch id a token was issued for, or null when it is forged or malformed. */
export function verifyUnsubscribe(token: string): string | null {
  const [id, sig] = token.split('.');
  if (!id || !sig || !/^[0-9a-f-]{36}$/i.test(id) || !serverEnv.authSecret) return null;
  const expected = Buffer.from(sign(id));
  const got = Buffer.from(sig);
  return expected.length === got.length && timingSafeEqual(expected, got) ? id : null;
}
