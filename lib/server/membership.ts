/**
 * Which plan a user has, from stored Paddle rows, an admin override and the trial. Pure, and applied on every
 * request (nothing caches a plan), so a cancellation, refund or expiry takes effect as soon as its webhook lands or
 * its end date passes. Rules follow Edit Page's lib/membership.ts, plus refunds of subscription charges.
 */
import type { Plan } from '@/lib/entitlements';

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'paused' | 'canceled';

export interface SubscriptionRow {
  id: string;
  userId: string | null;
  plan: 'monthly' | 'yearly' | 'lifetime';
  status: SubscriptionStatus;
  priceId?: string | null;
  /** End of the paid period (or a scheduled cancellation's date); null for lifetime or unknown. */
  endsAt: Date | null;
  /** A full refund or chargeback (lifetime: grants nothing; subscription: the refunded period grants nothing). */
  refundedAt?: Date | null;
  /** The subscription's period end when it was refunded: access returns only once a new period ends later. */
  refundedPeriodEnd?: Date | null;
  /** occurred_at of the last applied Paddle event (ordering guard). */
  paddleUpdatedAt: Date;
  customerId?: string | null;
  manageUrl?: string | null;
  cancelUrl?: string | null;
}

export type PlanSource = 'paddle' | 'admin' | 'trial' | 'none';

/** Whether a refund or chargeback cancels this row's access. */
export function refunded(r: SubscriptionRow): boolean {
  if (!r.refundedAt) return false;
  if (r.plan === 'lifetime') return true;
  // A subscription refunded for one period is paid again once a renewal moves its period end past it (by more than
  // a day, so a re-sent event for the same period with a slightly different timestamp doesn't count as a renewal).
  return !r.endsAt || !r.refundedPeriodEnd || r.endsAt.getTime() <= r.refundedPeriodEnd.getTime() + 86_400_000;
}

export function planFor(rows: readonly SubscriptionRow[], now: Date): { plan: Plan; until: Date | null } {
  const live = rows.filter((r) => !refunded(r));
  if (live.some((r) => r.plan === 'lifetime' && r.status === 'active')) return { plan: 'lifetime', until: null };
  let until: Date | null = null;
  let pro = false;
  for (const r of live) {
    if (r.plan === 'lifetime') continue;
    const inPeriod = !!r.endsAt && r.endsAt.getTime() > now.getTime();
    // Active/trialing, dunning (past_due: Paddle is still retrying) and scheduled cancellations keep Pro until the
    // period ends. A row without a period end grants nothing: we never guess how long access lasts.
    const paying = r.status === 'active' || r.status === 'trialing' || r.status === 'past_due' || r.status === 'canceled';
    if (paying && inPeriod) {
      pro = true;
      if (!until || r.endsAt! > until) until = r.endsAt;
    }
  }
  return pro ? { plan: 'pro', until } : { plan: 'free', until: null };
}

/** True when a subscription in its paid period will charge again ("Renews on" vs "Ends on"). */
export function subscriptionRenews(rows: readonly SubscriptionRow[], now: Date): boolean {
  return rows.some(
    (r) =>
      !refunded(r) &&
      r.plan !== 'lifetime' &&
      (r.status === 'active' || r.status === 'trialing' || r.status === 'past_due') &&
      !!r.endsAt &&
      r.endsAt.getTime() > now.getTime(),
  );
}

/**
 * A subscription Paddle may still charge (active, trialing, past_due, or paused and resumable). Account deletion
 * waits until it is cancelled, so deleting an account never leaves a subscription billing nobody (an Edit Page gap).
 * A scheduled cancellation is stored as "canceled" and doesn't block.
 */
export function hasChargeableSubscription(rows: readonly SubscriptionRow[]): boolean {
  return rows.some((r) => r.plan !== 'lifetime' && (r.status === 'active' || r.status === 'trialing' || r.status === 'past_due' || r.status === 'paused'));
}

/** "Manage billing" goes to the subscription that matters most: a live one before a paused or cancelled one. */
const MANAGE_RANK: Record<string, number> = { active: 0, past_due: 1, trialing: 2, paused: 3, canceled: 4 };
export function manageUrlOf(rows: readonly SubscriptionRow[]): string | null {
  const best = rows
    .filter((r) => r.manageUrl && r.status in MANAGE_RANK)
    .sort((x, y) => MANAGE_RANK[x.status]! - MANAGE_RANK[y.status]! || y.paddleUpdatedAt.getTime() - x.paddleUpdatedAt.getTime())[0];
  return best?.manageUrl ?? null;
}

/** An admin's manual plan (user_profiles.plan_override). */
export interface PlanOverride {
  plan: Plan | null;
  until: Date | null;
}

/* ---- 7-day Pro trial (one per email, ever) ---- */

export const TRIAL_DAYS = 7;
export const TRIAL_MS = TRIAL_DAYS * 24 * 3600 * 1000;

export interface TrialClaim {
  startedAt: Date;
  endsAt: Date;
}
export type TrialStatus = 'available' | 'active' | 'used';

export const trialKey = (email: string) => email.trim().toLowerCase();

export function trialActive(claim: TrialClaim | null, now: Date): boolean {
  return !!claim && claim.startedAt.getTime() <= now.getTime() && claim.endsAt.getTime() > now.getTime();
}

export function trialStatus(claim: TrialClaim | null, now: Date): { status: TrialStatus; endsAt: Date | null } {
  if (!claim) return { status: 'available', endsAt: null };
  return { status: trialActive(claim, now) ? 'active' : 'used', endsAt: claim.endsAt };
}

/**
 * The plan in effect. Lifetime and a forced Free override always win; a Pro grant wins while it lasts; the trial
 * fills in only for Free with no override.
 */
export function effectivePlan(
  paddle: { plan: Plan; until: Date | null },
  override: PlanOverride | null,
  now: Date,
  trial: TrialClaim | null = null,
): { plan: Plan; until: Date | null; source: PlanSource } {
  const fromPaddle = { ...paddle, source: (paddle.plan === 'free' ? 'none' : 'paddle') as PlanSource };
  let resolved = fromPaddle;
  if (override?.plan === 'lifetime') resolved = { plan: 'lifetime', until: null, source: 'admin' };
  else if (override?.plan === 'free') return { plan: 'free', until: null, source: 'admin' };
  else if (override?.plan === 'pro' && (!override.until || override.until.getTime() > now.getTime()) && paddle.plan !== 'lifetime') {
    // A grant beats a subscription only if it lasts longer.
    const paddleLonger = paddle.plan === 'pro' && paddle.until && override.until && paddle.until > override.until;
    if (!paddleLonger) resolved = { plan: 'pro', until: override.until, source: 'admin' };
  }
  if (resolved.plan === 'free' && trialActive(trial, now)) return { plan: 'pro', until: trial!.endsAt, source: 'trial' };
  return resolved;
}
