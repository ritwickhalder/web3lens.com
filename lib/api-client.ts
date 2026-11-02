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

export function setApiBase(url: string) {
  base = url.replace(/\/$/, '');
}

export async function apiGet<T>(path: string, params: Record<string, string>, signal?: AbortSignal): Promise<T> {
  const url = `${base}/api/v1/${path}?${new URLSearchParams(params)}`;
  let res: Response;
  try {
    res = await fetch(url, { signal, headers: { accept: 'application/json' } });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new ApiError('Web3Lens could not be reached. Check your connection.', 0);
  }
  const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok || !body) {
    const fallback =
      res.status === 429
        ? 'Too many lookups in a short time. Wait a minute and try again.'
        : `The Web3Lens lookup service is unavailable right now (HTTP ${res.status}). Explorer links and local checks still work.`;
    throw new ApiError(body?.error ?? fallback, res.status);
  }
  return body;
}
