import { accountError, accountJson, isSameOrigin, readJson } from '@/lib/server/account-http';
import { billingConfigured, serverEnv } from '@/lib/server/env';
import { limited } from '@/lib/server/limiters';
import { currentUser, planOf } from '@/lib/server/session';

type Choice = 'monthly' | 'yearly' | 'lifetime';

/**
 * POST /api/billing/prepare { plan }: what the Paddle overlay needs to open a checkout for the signed-in user. The
 * guard is on the server: a Pro subscriber can't start a second subscription, and lifetime owners can't buy again.
 * The user id rides in customData, which the webhook reads to link the purchase (and checks it is a real user).
 */
export async function POST(request: Request) {
  if (!billingConfigured()) return accountError(request, 'Payments are not available yet.', 503);
  if (!isSameOrigin(request)) return accountError(request, 'Forbidden', 403);
  const wait = limited('accountWrite', request.headers);
  if (wait) return accountError(request, 'Too many requests.', 429, { 'retry-after': String(wait) });
  const who = await currentUser(request.headers);
  if (!who) return accountError(request, 'Sign in first.', 401);
  const body = await readJson<{ plan?: unknown }>(request);
  const plan = body?.plan;
  if (plan !== 'monthly' && plan !== 'yearly' && plan !== 'lifetime') return accountError(request, 'Unknown plan.', 400);
  const current = await planOf(who.user);
  if (current.plan === 'lifetime') return accountError(request, 'You already have Pro for life.', 409);
  if (current.source === 'paddle' && current.renews && plan !== 'lifetime') {
    return accountError(request, 'You already have a Pro subscription. Change it under Manage billing.', 409);
  }
  const priceId = serverEnv.prices[plan as Choice];
  return accountJson(request, { priceId, email: who.user.email, customData: { userId: who.user.id } });
}
