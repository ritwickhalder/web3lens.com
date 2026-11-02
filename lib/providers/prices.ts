/** USD prices from CoinGecko's free simple-price endpoint (optional COINGECKO_DEMO_KEY raises the limit). */
import { fetchJson } from '@/lib/providers/http';

export async function getUsdPrices(ids: string[]): Promise<Record<string, number>> {
  const unique = [...new Set(ids)].filter(Boolean);
  if (!unique.length) return {};
  const key = typeof process !== 'undefined' ? process.env.COINGECKO_DEMO_KEY : undefined;
  const res = await fetchJson<Record<string, { usd?: number }>>(
    'CoinGecko',
    `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(unique.join(','))}&vs_currencies=usd`,
    { timeoutMs: 6000, headers: key ? { 'x-cg-demo-api-key': key } : {} },
  );
  const out: Record<string, number> = {};
  for (const [id, v] of Object.entries(res)) if (typeof v?.usd === 'number') out[id] = v.usd;
  return out;
}
