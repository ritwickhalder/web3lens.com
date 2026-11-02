/**
 * In-memory TTL cache with stale-if-error and in-flight de-duplication, per server instance.
 * Vercel's CDN caches API responses on top of this (Cache-Control s-maxage in lib/server/api.ts),
 * so most repeat lookups never reach a provider.
 */

type Entry = { value: unknown; at: number };

const MAX_ENTRIES = 2000;
const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

export type CacheResult<T> = { value: T; fetchedAt: number; stale: boolean; cached: boolean };

function remember(key: string, value: unknown, at: number) {
  if (store.size >= MAX_ENTRIES) {
    // Drop the oldest ~10%.
    const drop = [...store.entries()].sort((a, b) => a[1].at - b[1].at).slice(0, Math.ceil(MAX_ENTRIES / 10));
    for (const [k] of drop) store.delete(k);
  }
  store.set(key, { value, at });
}

/**
 * Returns a fresh cached value (younger than `ttlMs`), or calls `fn`. When `fn` fails and a value
 * younger than `staleMs` exists, that value is returned with `stale: true`; otherwise the error is rethrown.
 */
export async function cached<T>(key: string, ttlMs: number, staleMs: number, fn: () => Promise<T>, now = Date.now): Promise<CacheResult<T>> {
  const hit = store.get(key);
  if (hit && now() - hit.at < ttlMs) return { value: hit.value as T, fetchedAt: hit.at, stale: false, cached: true };

  let pending = inflight.get(key) as Promise<T> | undefined;
  if (!pending) {
    pending = fn();
    inflight.set(key, pending);
    pending.then(
      () => inflight.delete(key),
      () => inflight.delete(key),
    );
  }
  try {
    const value = await pending;
    const at = now();
    remember(key, value, at);
    return { value, fetchedAt: at, stale: false, cached: false };
  } catch (e) {
    if (hit && now() - hit.at < staleMs) return { value: hit.value as T, fetchedAt: hit.at, stale: true, cached: true };
    throw e;
  }
}

/** For tests. */
export function clearCache() {
  store.clear();
  inflight.clear();
}
