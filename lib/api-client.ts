/**
 * Client for /api/v1. The website calls it same-origin; the extensions call https://web3lens.com
 * (CORS allows it, so they need no host permissions).
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

let base = '';

/** Longer than the slowest route's maxDuration (approvals, 60 s), so a hung request still ends with an error. */
export const API_TIMEOUT_MS = 65_000;

export function setApiBase(url: string) {
  base = url.replace(/\/$/, '');
}

export async function apiGet<T>(path: string, params: Record<string, string>, signal?: AbortSignal, timeoutMs = API_TIMEOUT_MS): Promise<T> {
  const url = `${base}/api/v1/${path}?${new URLSearchParams(params)}`;
  const timeout = AbortSignal.timeout(timeoutMs);
  let res: Response;
  let body: (T & { error?: string }) | null;
  try {
    res = await fetch(url, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout, headers: { accept: 'application/json' } });
    body = (await res.json().catch((e: Error) => (e.name === 'TimeoutError' || e.name === 'AbortError' ? Promise.reject(e) : null))) as typeof body;
  } catch (e) {
    if (signal?.aborted) throw e;
    if (timeout.aborted) throw new ApiError('Web3Lens took too long to answer. Try again in a moment; explorer links and local checks still work.', 0);
    throw new ApiError('Web3Lens could not be reached. Check your connection.', 0);
  }
  if (!res.ok || !body) {
    const fallback =
      res.status === 429
        ? 'Too many lookups in a short time. Wait a minute and try again.'
        : `The Web3Lens lookup service is unavailable right now (HTTP ${res.status}). Explorer links and local checks still work.`;
    throw new ApiError(body?.error ?? fallback, res.status);
  }
  return body;
}
