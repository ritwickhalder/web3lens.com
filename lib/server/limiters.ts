/** Per-IP limits for the account routes (in memory per instance, like lib/server/rate-limit.ts). */
import { clientIp, createLimiter } from '@/lib/server/rate-limit';

const pairStart = createLimiter({ windowMs: 10 * 60_000, max: 10 });
const pairClaim = createLimiter({ windowMs: 60_000, max: 60 });
const accountWrite = createLimiter({ windowMs: 60_000, max: 20 });

const KINDS = { pairStart, pairClaim, accountWrite };

export function limited(kind: keyof typeof KINDS, headers: Headers): number | null {
  const r = KINDS[kind](clientIp(headers));
  return r.ok ? null : r.retryAfter;
}
