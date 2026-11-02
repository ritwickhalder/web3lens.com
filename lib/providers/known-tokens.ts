/**
 * Live balances of a short list of well-known tokens (data/known-tokens.json, each contract checked
 * on-chain by scripts/verify-known-tokens.mjs) for chains with no free token index. One batched RPC
 * call; other tokens the address may hold are not seen, and the page says so.
 */
import knownJson from '@/data/known-tokens.json';
import { encodeCall } from '@/lib/evm/abi';
import type { EvmNetwork } from '@/lib/networks';
import type { TokenHolding } from '@/lib/providers/blockscout';
import { rpcBatch } from '@/lib/providers/evm';
import { ProviderError } from '@/lib/providers/http';
import { formatUnits } from '@/lib/tools/units';

type KnownToken = { address: string; symbol: string; decimals: number };
const KNOWN = (knownJson as { chains: Record<string, KnownToken[]> }).chains;

export function knownTokensFor(chainId: string): KnownToken[] {
  return KNOWN[chainId] ?? [];
}

export async function getKnownTokenBalances(net: EvmNetwork, owner: string): Promise<{ items: TokenHolding[]; checked: number }> {
  const list = knownTokensFor(net.id);
  const data = encodeCall('balanceOf(address)', [owner]);
  const results = await rpcBatch(
    net,
    list.map((t) => ({ method: 'eth_call', params: [{ to: t.address, data }, 'latest'] })),
  );
  if (results.length && results.every((r) => r instanceof Error)) throw new ProviderError(`${net.name} RPC`, 'balance calls failed');
  const items: TokenHolding[] = [];
  list.forEach((t, i) => {
    const r = results[i];
    if (typeof r !== 'string' || r.length < 66) return;
    const raw = BigInt(r.slice(0, 66));
    if (raw === BigInt(0)) return;
    items.push({ contract: t.address, name: null, symbol: t.symbol, decimals: t.decimals, balanceRaw: raw.toString(), balance: formatUnits(raw, t.decimals), priceUsd: null, flagged: false, type: 'ERC-20' });
  });
  return { items, checked: list.length };
}
