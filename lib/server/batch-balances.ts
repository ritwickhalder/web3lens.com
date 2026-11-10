/**
 * Multi-chain balances for many addresses (the batch page). Separate from /api/v1/multichain so the batch limits
 * (rows per batch, cross-chain lookups per day) can be enforced on the server. Lookups go through the same cache as
 * single-address pages.
 */
import type { MultichainResult } from '@/lib/lookup-types';
import { multichainAddress } from '@/lib/server/lookup';

type Lookup = (address: string) => Promise<MultichainResult>;
let lookup: Lookup = multichainAddress;

/** Tests only. */
export function setBatchLookup(fn: Lookup | null) {
  lookup = fn ?? multichainAddress;
}

export type BatchBalance = { address: string; result: MultichainResult | null; error: string | null };

export async function balancesFor(addresses: string[], workers = 4): Promise<BatchBalance[]> {
  const out: BatchBalance[] = new Array(addresses.length);
  let next = 0;
  const run = async () => {
    while (next < addresses.length) {
      const i = next++;
      const address = addresses[i]!;
      try {
        out[i] = { address, result: await lookup(address), error: null };
      } catch (e) {
        out[i] = { address, result: null, error: e instanceof Error ? e.message.slice(0, 200) : 'Lookup failed' };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(workers, addresses.length) }, run));
  return out;
}
