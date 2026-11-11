import { accountError, accountJson, accountOptions, isExtensionOrigin, isSameOrigin } from '@/lib/server/account-http';
import { requireFeature } from '@/lib/server/gate';
import { createLimiter } from '@/lib/server/rate-limit';
import { runDueChecks } from '@/lib/server/watch-store';

export const maxDuration = 60;
const perUser = createLimiter({ windowMs: 3_600_000, max: 10 });

/** POST /api/watches/check: check your own watches now (Pro, 10 times an hour). */
export async function POST(request: Request) {
  if (!isSameOrigin(request) && !isExtensionOrigin(request.headers.get('origin'))) return accountError(request, 'Forbidden', 403);
  const c = await requireFeature(request, 'watchlist');
  if (c instanceof Response) return c;
  const r = perUser(c.user.id);
  if (!r.ok) return accountError(request, 'You can check now 10 times an hour. Watches are also checked automatically.', 429, { 'retry-after': String(r.retryAfter) });
  return accountJson(request, await runDueChecks({ userId: c.user.id, limit: c.limits.watches, budgetMs: 40_000 }));
}

export const OPTIONS = accountOptions;
