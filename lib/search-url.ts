/** Shareable search URLs: /search?q=…&chain=… (chain optional). */
export function searchUrl(query: string, chainId?: string): string {
  const params = new URLSearchParams({ q: query.trim() });
  if (chainId) params.set('chain', chainId);
  return `/search?${params.toString()}`;
}

/** Web3Lens's own result page for a query on a chain with native data, or null. */
export function nativeResultUrl(chainId: string, kind: 'address' | 'tx' | 'block' | 'name' | 'search', query: string): string | null {
  const q = encodeURIComponent(query.trim());
  if (kind === 'address' || kind === 'name') return `/address/${chainId}/${q}`;
  if (kind === 'tx') return `/tx/${chainId}/${q}`;
  return null;
}
