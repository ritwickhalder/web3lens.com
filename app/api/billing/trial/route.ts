import { accountError, accountJson, isSameOrigin } from '@/lib/server/account-http';
import { accountsConfigured } from '@/lib/server/env';
import { limited } from '@/lib/server/limiters';
import { currentUser, planOf } from '@/lib/server/session';
import { claimTrial } from '@/lib/server/stores';

/** POST /api/billing/trial: starts the 7-day Pro trial, once per email, for a signed-in Free user. No card needed. */
export async function POST(request: Request) {
  if (!accountsConfigured()) return accountError(request, 'Accounts are not available yet.', 503);
  if (!isSameOrigin(request)) return accountError(request, 'Forbidden', 403);
  const wait = limited('accountWrite', request.headers);
  if (wait) return accountError(request, 'Too many requests.', 429, { 'retry-after': String(wait) });
  const who = await currentUser(request.headers);
  if (!who) return accountError(request, 'Sign in first.', 401);
  const current = await planOf(who.user);
  if (current.plan !== 'free') return accountError(request, 'You already have Pro.', 409);
  if (current.trial.status !== 'available' || current.rows.length > 0) return accountError(request, 'The free trial has already been used on this account.', 409);
  const claim = await claimTrial(who.user);
  if (!claim) return accountError(request, 'The free trial has already been used on this account.', 409);
  return accountJson(request, { ok: true, endsAt: claim.endsAt.toISOString() });
}
