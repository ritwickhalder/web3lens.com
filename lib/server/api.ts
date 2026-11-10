/**
 * Shared plumbing for /api/v1/*: per-IP rate limit, CORS (so the browser extensions can call it
 * without host permissions), CDN caching headers and JSON errors.
 */
import { isCrawler } from '@/lib/server/bots';
import { LookupError } from '@/lib/server/lookup';
import { clientIp, lookupBudget } from '@/lib/server/rate-limit';

export const CORS_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400',
};

export function json(body: unknown, init: { status?: number; maxAge?: number; headers?: Record<string, string> } = {}) {
  const { status = 200, maxAge = 0, headers = {} } = init;
  return Response.json(body, {
    status,
    headers: {
      ...CORS_HEADERS,
      'cache-control': maxAge > 0 ? `public, max-age=${Math.min(maxAge, 60)}, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 5}` : 'no-store',
      ...headers,
    },
  });
}

export function errorJson(error: string, status: number, headers: Record<string, string> = {}) {
  return json({ error }, { status, headers });
}

export function options() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/** Runs `fn` behind the rate limiter, turning thrown LookupErrors into JSON errors. */
export async function handle(request: Request, fn: (params: URLSearchParams) => Promise<Response>): Promise<Response> {
  // robots.txt disallows /api/; crawlers that ignore it are turned away before any provider call.
  if (isCrawler(request.headers.get('user-agent'))) return errorJson('Automated crawlers cannot use the lookup API.', 403);
  const limit = lookupBudget(clientIp(request.headers));
  if (!limit.ok) return errorJson('Too many requests. Please wait a moment.', 429, { 'retry-after': String(limit.retryAfter) });
  try {
    return await fn(new URL(request.url).searchParams);
  } catch (e) {
    if (e instanceof LookupError) return errorJson(e.message, e.status);
    console.error('[api]', e);
    return errorJson('Something went wrong while looking this up.', 500);
  }
}
