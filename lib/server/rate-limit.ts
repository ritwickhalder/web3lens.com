/**
 * Fixed-window rate limiter keyed by client (IP). In memory, so it is per server instance: it
 * stops bursts from one client hammering the free upstream APIs, not a determined distributed abuser.
 */
export function createLimiter({ windowMs, max }: { windowMs: number; max: number }) {
  const hits = new Map<string, { count: number; start: number }>();
  let lastSweep = 0;

  return function check(key: string, now = Date.now()): { ok: true } | { ok: false; retryAfter: number } {
    if (now - lastSweep > windowMs) {
      for (const [k, v] of hits) if (now - v.start >= windowMs) hits.delete(k);
      lastSweep = now;
    }
    const entry = hits.get(key);
    if (!entry || now - entry.start >= windowMs) {
      hits.set(key, { count: 1, start: now });
      return { ok: true };
    }
    entry.count += 1;
    if (entry.count > max) return { ok: false, retryAfter: Math.ceil((entry.start + windowMs - now) / 1000) };
    return { ok: true };
  };
}

export function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return headers.get('x-real-ip') || 'unknown';
}

/**
 * One lookup budget per client, shared by /api/v1 and the server-rendered result pages: a short window for
 * bursts and an hourly cap for sustained scraping. A person browsing (an address page is the page plus about
 * three API calls; a 50-row batch is 50 calls) stays far below both.
 */
export function createLookupBudget({ perMinute = 60, perHour = 1200 }: { perMinute?: number; perHour?: number } = {}) {
  const minute = createLimiter({ windowMs: 60_000, max: perMinute });
  const hour = createLimiter({ windowMs: 3_600_000, max: perHour });
  return function check(key: string, now = Date.now()): { ok: true } | { ok: false; retryAfter: number } {
    const m = minute(key, now);
    if (!m.ok) return m;
    return hour(key, now);
  };
}

export const lookupBudget = createLookupBudget();
