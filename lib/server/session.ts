/**
 * The signed-in user and their plan, resolved per request: the cookie on the website, `Authorization: Bearer` from
 * the extensions. The plan is read from the database every time (no cache, no client claim), so webhooks and
 * expiries take effect on the next request.
 */
import { limitsFor, METRIC_LIMIT, PRE_LAUNCH_LIMITS, tierOf, type Limits, type MeResponse, type Metric, type Plan } from '@/lib/entitlements';
import { getAuth } from '@/lib/server/auth';
import { billingConfigured } from '@/lib/server/env';
import { effectivePlan, manageUrlOf, planFor, subscriptionRenews, trialStatus } from '@/lib/server/membership';
import { nextDay, profileOf, subscriptionsOf, trialClaimFor, usageOf } from '@/lib/server/stores';

export type SessionUser = { id: string; email: string; name: string; image?: string | null; createdAt?: Date | string | null };
export type CurrentSession = { user: SessionUser; session: { id: string; token: string; expiresAt: Date; userAgent?: string | null } };

export async function currentUser(headers: Headers): Promise<CurrentSession | null> {
  const auth = getAuth();
  if (!auth) return null;
  const s = await auth.api.getSession({ headers });
  return s ? { user: s.user, session: s.session } : null;
}

export async function planOf(user: SessionUser, now = new Date()) {
  const [rows, profile, claim] = await Promise.all([subscriptionsOf(user.id), profileOf(user.id), trialClaimFor(user.email)]);
  const resolved = effectivePlan(planFor(rows, now), profile.override, now, claim);
  return { ...resolved, rows, renews: resolved.source === 'paddle' && subscriptionRenews(rows, now), trial: trialStatus(claim, now) };
}

export const userSubject = (userId: string) => `u:${userId}`;

/** A plan's limits, or the pre-launch limits for Free while Pro can't be bought (lib/entitlements.ts). */
export function effectiveLimits(plan: Plan | null): Limits {
  if ((plan ?? 'free') === 'free' && !billingConfigured()) return PRE_LAUNCH_LIMITS;
  return limitsFor(plan ?? 'free');
}

export async function meFor(user: SessionUser, now = new Date()): Promise<MeResponse> {
  const p = await planOf(user, now);
  const limits = effectiveLimits(p.plan);
  const metrics: Metric[] = ['crossChain', 'api'];
  const used = await Promise.all(metrics.map((m) => usageOf(userSubject(user.id), m, now)));
  const resetsAt = nextDay(now).toISOString();
  return {
    signedIn: true,
    user: { id: user.id, email: user.email, name: user.name, image: user.image ?? null, createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null },
    plan: p.plan,
    tier: tierOf(p.plan),
    until: p.until?.toISOString() ?? null,
    source: p.source,
    renews: p.renews,
    manageUrl: manageUrlOf(p.rows),
    limits,
    usage: Object.fromEntries(metrics.map((m, i) => [m, { used: used[i]!, limit: METRIC_LIMIT[m](limits), resetsAt }])) as MeResponse['usage'],
    trial: { status: p.trial.status, endsAt: p.trial.endsAt?.toISOString() ?? null },
    checkedAt: now.toISOString(),
    billing: billingConfigured(),
  };
}
