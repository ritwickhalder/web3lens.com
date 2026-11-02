/** Sourcify (free, decentralised source verification). Returns the match level or null when unverified. */
import { fetchJson, ProviderError } from '@/lib/providers/http';

export async function sourcifyMatch(chainId: number, address: string): Promise<string | null> {
  try {
    const r = await fetchJson<{ match?: string | null }>('Sourcify', `https://sourcify.dev/server/v2/contract/${chainId}/${address}`, { timeoutMs: 8000 });
    return r.match ?? null;
  } catch (e) {
    if (e instanceof ProviderError && e.status === 404) return null;
    throw e;
  }
}
