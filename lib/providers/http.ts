/** fetch with a timeout and a consistent error type, for the provider adapters. */

export class ProviderError extends Error {
  constructor(
    readonly source: string,
    message: string,
    readonly status?: number,
  ) {
    super(`${source}: ${message}`);
    this.name = 'ProviderError';
  }
}

/** Bot-style UA in the standard form: Blockscout's protection rejects UAs that don't start with Mozilla/5.0 (403). */
export const USER_AGENT = 'Mozilla/5.0 (compatible; Web3Lens/1.0; +https://web3lens.com)';

export type FetchLike = typeof fetch;

let fetchImpl: FetchLike = (...args) => fetch(...args);

/** Tests swap the network for a fake. */
export function setFetch(impl: FetchLike | null) {
  fetchImpl = impl ?? ((...args) => fetch(...args));
}

export async function fetchJson<T = unknown>(
  source: string,
  url: string,
  { method = 'GET', body, timeoutMs = 8000, headers = {} }: { method?: string; body?: unknown; timeoutMs?: number; headers?: Record<string, string> } = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetchImpl(url, {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: {
        accept: 'application/json',
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        // Browsers ignore this; servers send it so providers (Blockscout) don't block the request.
        'user-agent': USER_AGENT,
        ...headers,
      },
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
    });
  } catch (e) {
    const err = e as Error;
    throw new ProviderError(source, err.name === 'TimeoutError' || err.name === 'AbortError' ? 'timed out' : 'network error');
  }
  if (res.status === 404) throw new ProviderError(source, 'not found', 404);
  if (res.status === 429) throw new ProviderError(source, 'rate limited', 429);
  if (!res.ok) throw new ProviderError(source, `HTTP ${res.status}`, res.status);
  try {
    return (await res.json()) as T;
  } catch {
    throw new ProviderError(source, 'invalid JSON');
  }
}
