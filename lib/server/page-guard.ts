/**
 * Gate for the live provider lookups on server-rendered result pages (/address, /tx). Crawlers and scripts get the
 * page without them, and people share the per-client budget with /api/v1, so following result links can't turn
 * into an unbounded crawl of provider calls.
 */
import { headers } from 'next/headers';
import { isAutomated } from '@/lib/server/bots';
import { clientIp, lookupBudget } from '@/lib/server/rate-limit';

export type LiveLookup = { ok: true } | { ok: false; reason: 'automated' } | { ok: false; reason: 'rate-limited'; retryAfter: number };

export async function liveLookupAllowed(): Promise<LiveLookup> {
  const h = await headers();
  if (isAutomated(h.get('user-agent'))) return { ok: false, reason: 'automated' };
  const limit = lookupBudget(clientIp(h));
  return limit.ok ? { ok: true } : { ok: false, reason: 'rate-limited', retryAfter: limit.retryAfter };
}

/** Text for the note shown in place of the live sections. */
export function liveLookupMessage(l: Exclude<LiveLookup, { ok: true }>): string {
  return l.reason === 'automated'
    ? 'Live data loads for visitors in a web browser. The explorer links on this page work for everyone.'
    : `Too many lookups from your connection in a short time. Wait ${l.retryAfter > 90 ? `${Math.ceil(l.retryAfter / 60)} minutes` : `${l.retryAfter} seconds`} and reload; the explorer links still work.`;
}
