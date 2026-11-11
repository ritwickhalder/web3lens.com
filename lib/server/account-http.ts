/**
 * HTTP helpers for the account routes (/api/me, /api/account/*, /api/billing/*, /api/ext/*). Unlike /api/v1, these
 * are never CDN-cached, never open to every origin, and state-changing calls from the website must be same-origin.
 */
import { serverEnv } from '@/lib/server/env';

/**
 * Firefox gives every install a random moz-extension://<uuid> origin, so the add-on can't be listed by id. Any
 * such origin may call: these routes authenticate by a bearer token only our extension holds, and a web page
 * can't send an extension origin.
 */
const FIREFOX_EXTENSION_ORIGIN = /^moz-extension:\/\/[0-9a-f-]{36}$/i;

export function isExtensionOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return serverEnv.extensionIds.some((id) => origin === `chrome-extension://${id}`) || FIREFOX_EXTENSION_ORIGIN.test(origin);
}

/** CORS only for our extensions; any other cross-origin caller gets no CORS headers (the browser blocks it). */
export function extensionCors(origin: string | null): Record<string, string> {
  if (!isExtensionOrigin(origin)) return {};
  return {
    'access-control-allow-origin': origin!,
    'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-max-age': '600',
    vary: 'Origin',
  };
}

export function accountJson(request: Request, body: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, {
    status,
    headers: { 'cache-control': 'no-store, private', ...extensionCors(request.headers.get('origin')), ...headers },
  });
}

export const accountError = (request: Request, error: string, status: number, headers: Record<string, string> = {}) =>
  accountJson(request, { error }, status, headers);

export function accountOptions(request: Request) {
  return new Response(null, { status: 204, headers: extensionCors(request.headers.get('origin')) });
}

/** State-changing website calls: the Origin header must be this site (blocks cross-site form posts and fetches). */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const own = new Set([new URL(request.url).origin, new URL(serverEnv.authUrl).origin]);
  return own.has(origin);
}

/** Parses a small JSON body; null when it isn't JSON or is too large. */
export async function readJson<T>(request: Request, maxBytes = 4096): Promise<T | null> {
  const text = await request.text().catch(() => '');
  if (!text || text.length > maxBytes) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
