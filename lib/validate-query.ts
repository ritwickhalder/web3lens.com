/**
 * Validates a query for a native lookup on one chain and returns its normalised form.
 * Pure, so the API, the pages and the extensions agree on what is accepted.
 */
import { getChain } from '@/lib/chains';
import { detectAll, type Detection } from '@/lib/detect';
import { getNetwork } from '@/lib/networks';

export type QueryCheck = { ok: true; query: string; detection: Detection } | { ok: false; error: string };

const MAX_LEN = 200;

export function checkAddressQuery(chainId: string, raw: string): QueryCheck {
  const net = getNetwork(chainId);
  const chain = getChain(chainId);
  if (!net || !chain) return { ok: false, error: 'Native lookups are not available for this chain.' };
  const q = raw.trim();
  if (!q || q.length > MAX_LEN) return { ok: false, error: 'Enter an address.' };
  const all = detectAll(q);
  if (all.some((d) => d.kind === 'secret')) return { ok: false, error: 'That looks like a private key or recovery phrase. It was not searched.' };
  const d = all.find((x) => (x.kind === 'address' || (x.kind === 'name' && x.format === 'ens' && chainId === 'ethereum')) && x.chains.includes(chainId));
  if (!d) return { ok: false, error: `That isn't a ${chain.name} address.` };
  if (d.network === 'testnet') return { ok: false, error: 'Testnet addresses are not supported; Web3Lens reads mainnet only.' };
  if (d.checksum === 'invalid') return { ok: false, error: `The address checksum doesn't match, so it probably contains a typo.` };
  return { ok: true, query: d.normalized, detection: d };
}

export function checkTxQuery(chainId: string, raw: string): QueryCheck {
  const net = getNetwork(chainId);
  const chain = getChain(chainId);
  if (!net || !chain) return { ok: false, error: 'Native lookups are not available for this chain.' };
  const q = raw.trim();
  if (!q || q.length > MAX_LEN) return { ok: false, error: 'Enter a transaction hash.' };
  const d = detectAll(q).find((x) => x.kind === 'transaction' && (x.chains.includes(chainId) || (net.family === 'evm' && x.format === 'evm-tx')));
  if (!d) return { ok: false, error: `That isn't a ${chain.name} transaction hash.` };
  return { ok: true, query: d.normalized, detection: d };
}

/** An EVM address (for the cross-chain endpoints). */
export function checkEvmAddress(raw: string): QueryCheck {
  const q = raw.trim();
  const d = detectAll(q).find((x) => x.format === 'evm-address');
  if (!d) return { ok: false, error: 'Enter a 0x address.' };
  if (d.checksum === 'invalid') return { ok: false, error: `The address checksum doesn't match, so it probably contains a typo.` };
  return { ok: true, query: d.normalized, detection: d };
}

export function checkEvmTx(raw: string): QueryCheck {
  const q = raw.trim();
  const d = detectAll(q).find((x) => x.format === 'evm-tx');
  return d ? { ok: true, query: d.normalized, detection: d } : { ok: false, error: 'Enter a 0x transaction hash (66 characters).' };
}
