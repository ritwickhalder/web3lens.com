/**
 * Product emails, ported from Super Session Manager: the "Still on Free?" upgrade nudge, its version for a 7-day Pro
 * trial that just ended, and the abandoned-checkout reminder. One daily run (app/api/cron/emails) does all three.
 *
 * Switched off until Pro is on sale (billingConfigured()) and SMTP is set: nothing is read or sent before then.
 *
 * Rules (all are re-checked against the database on every run; the plan comes from planOf, never a client):
 *  - Never to admins, suspended or unverified accounts, or anyone who unsubscribed (email_opt_outs).
 *  - Nudge: Free in effect (a running trial is Pro, a forced-Free override is a decision, not a lead), account 3–180
 *    days old, no nudge in 30 days. Trial ended in the last 7 days: the "trial ended" version instead, first, whatever
 *    the account's age, unless a nudge already went out at or after the trial's end.
 *  - Checkout reminder: a checkout prepared 2–36 hours ago (checkout_intents), still Free now (so paying cancels it),
 *    no reminder in 30 days and no nudge in 3 days. A nudge also waits 3 days after a reminder.
 *  - Every send is claimed in lifecycle_emails before SMTP (overlapping runs can't send twice); nudges are capped per
 *    UTC day. A failed send is logged and retried on a later run; nothing here ever throws into a request.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { and, eq, gte, inArray, lt, lte } from 'drizzle-orm';
import { SITE } from '@/config/site';
import { escapeHtml, headerSafe } from '@/lib/contact';
import { getDb, schema } from '@/lib/db';
import { adminEmails } from '@/lib/server/admin';
import { billingConfigured, serverEnv } from '@/lib/server/env';
import { mailer, mailSender, type OutgoingMail } from '@/lib/server/mailer';
import { planOf } from '@/lib/server/session';

export const NUDGE_MIN_AGE_DAYS = 3;
export const NUDGE_MAX_AGE_DAYS = 180;
export const RESEND_DAYS = 30;
export const TRIAL_ENDED_WINDOW_DAYS = 7;
export const QUIET_DAYS = 3;
export const RECOVERY_MIN_AGE_HOURS = 2;
export const RECOVERY_LOOKBACK_HOURS = 36;
export const MAX_NUDGES_PER_DAY = 25;
export const MAX_RECOVERY_PER_RUN = 20;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export type Plan3 = 'monthly' | 'yearly' | 'lifetime';
export type LifecycleKind = 'nudge' | 'trial_ended' | 'checkout_recovery';

/* ---- Opt-out (one-click, signed, no sign-in needed) ---- */

const sign = (userId: string) => createHmac('sha256', `${serverEnv.authSecret}|email-unsubscribe`).update(userId).digest('base64url');

export function emailUnsubscribeToken(userId: string): string {
  return `${userId}.${sign(userId)}`;
}

/** The user id a token was issued for, or null when it is forged or malformed. */
export function verifyEmailUnsubscribe(token: string): string | null {
  const dot = token.lastIndexOf('.');
  const id = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (dot < 1 || !sig || !/^[A-Za-z0-9_-]{8,64}$/.test(id) || !serverEnv.authSecret) return null;
  const expected = Buffer.from(sign(id));
  const got = Buffer.from(sig);
  return expected.length === got.length && timingSafeEqual(expected, got) ? id : null;
}

export const unsubscribeUrl = (userId: string, base = serverEnv.authUrl) => `${base}/api/email/unsubscribe?t=${encodeURIComponent(emailUnsubscribeToken(userId))}`;

export async function optOut(userId: string): Promise<boolean> {
  const [u] = await getDb().select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.id, userId)).limit(1);
  if (!u) return false;
  await getDb().insert(schema.emailOptOuts).values({ userId }).onConflictDoNothing();
  return true;
}

/* ---- Checkout intents ---- */

/** Called from POST /api/billing/prepare. Best effort: a failure here must never block a checkout. */
export async function recordCheckoutIntent(userId: string, plan: Plan3): Promise<void> {
  try {
    await getDb().insert(schema.checkoutIntents).values({ userId, plan });
  } catch (e) {
    console.warn('[lifecycle-mail] checkout intent not recorded', e instanceof Error ? e.message : e);
  }
}

/* ---- Who gets what (pure, for tests) ---- */

export type UserRow = { id: string; email: string; name: string; emailVerified: boolean; createdAt: Date };
export type SentRow = { userId: string | null; kind: string; createdAt: Date };
/** What planOf says, reduced to what matters here. */
export type PlanView = { plan: string; source: string; trialEndsAt: Date | null };

export type Candidate = { userId: string; email: string; name: string; kind: LifecycleKind; plan?: Plan3 | null; at: Date };

/** Latest nudge time and latest reminder time per user, from recent lifecycle_emails rows. */
function history(sent: SentRow[]) {
  const lastNudge = new Map<string, number>();
  const lastReminder = new Map<string, number>();
  for (const r of sent) {
    if (!r.userId) continue;
    const map = r.kind === 'checkout_recovery' ? lastReminder : r.kind === 'nudge' || r.kind === 'trial_ended' ? lastNudge : null;
    if (map && r.createdAt.getTime() > (map.get(r.userId) ?? 0)) map.set(r.userId, r.createdAt.getTime());
  }
  return { lastNudge, lastReminder };
}

const isLead = (p: PlanView) => p.plan === 'free' && p.source !== 'admin';

export function pickNudges(users: UserRow[], plans: Map<string, PlanView>, sent: SentRow[], now: number): Candidate[] {
  const { lastNudge, lastReminder } = history(sent);
  const out: Candidate[] = [];
  for (const u of users) {
    const p = plans.get(u.id);
    if (!p || !isLead(p)) continue;
    if ((lastReminder.get(u.id) ?? 0) >= now - QUIET_DAYS * DAY) continue;
    const last = lastNudge.get(u.id);
    const trialEnd = p.trialEndsAt?.getTime();
    const trialJustEnded = trialEnd !== undefined && trialEnd <= now && trialEnd > now - TRIAL_ENDED_WINDOW_DAYS * DAY;
    // A nudge sent before the trial ended doesn't count: "your trial has ended" is a different message.
    if (trialJustEnded && (last === undefined || last < trialEnd)) out.push({ userId: u.id, email: u.email, name: u.name, kind: 'trial_ended', at: u.createdAt });
    else if ((last === undefined || last < now - RESEND_DAYS * DAY) && u.createdAt.getTime() <= now - NUDGE_MIN_AGE_DAYS * DAY && u.createdAt.getTime() >= now - NUDGE_MAX_AGE_DAYS * DAY) {
      out.push({ userId: u.id, email: u.email, name: u.name, kind: 'nudge', at: u.createdAt });
    }
  }
  return out.sort((a, b) => (a.kind === b.kind ? a.at.getTime() - b.at.getTime() : a.kind === 'trial_ended' ? -1 : 1));
}

export function pickReminders(
  intents: { userId: string; plan: string; createdAt: Date }[],
  users: Map<string, UserRow>,
  plans: Map<string, PlanView>,
  sent: SentRow[],
  now: number,
): Candidate[] {
  const { lastNudge, lastReminder } = history(sent);
  const latest = new Map<string, { plan: Plan3 | null; at: Date }>();
  for (const i of intents) {
    const t = i.createdAt.getTime();
    if (t < now - RECOVERY_LOOKBACK_HOURS * HOUR || t > now - RECOVERY_MIN_AGE_HOURS * HOUR) continue;
    const prev = latest.get(i.userId);
    const plan = i.plan === 'monthly' || i.plan === 'yearly' || i.plan === 'lifetime' ? i.plan : null;
    if (!prev || t > prev.at.getTime()) latest.set(i.userId, { plan, at: i.createdAt });
  }
  const out: Candidate[] = [];
  for (const [userId, i] of latest) {
    const u = users.get(userId);
    const p = plans.get(userId);
    // Paid (or a trial, or a grant) since: the checkout did its job.
    if (!u || !p || p.plan !== 'free') continue;
    if ((lastReminder.get(userId) ?? 0) >= now - RESEND_DAYS * DAY) continue;
    if ((lastNudge.get(userId) ?? 0) >= now - QUIET_DAYS * DAY) continue;
    out.push({ userId, email: u.email, name: u.name, kind: 'checkout_recovery', plan: i.plan, at: i.at });
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/* ---- Email copy ---- */

const firstName = (name: string) => name.trim().split(/\s+/)[0]?.replace(/\p{C}/gu, '').slice(0, 40) ?? '';
const PLAN_LABEL: Record<Plan3, string> = { monthly: 'Pro Monthly', yearly: 'Pro Yearly', lifetime: 'Pro Lifetime' };
const PRO_PERKS = [
  'Batches of up to 500 addresses, with balances across chains',
  'Saved addresses synced between the website and your browsers',
  'A watchlist that emails you when a watched address moves',
  'Investigations, JSON export and API keys',
];

export function renderLifecycleEmail(c: Pick<Candidate, 'userId' | 'email' | 'name' | 'kind' | 'plan'>, base = serverEnv.authUrl): OutgoingMail {
  const hi = firstName(c.name) ? `Hi ${firstName(c.name)},` : 'Hi,';
  const unsub = unsubscribeUrl(c.userId, base);
  const pricing = `${base}/pricing?utm_source=email&utm_medium=email&utm_campaign=${c.kind === 'nudge' ? 'still_on_free' : c.kind}`;
  let subject: string;
  let lead: string[];
  let cta: string;
  let perks = true;
  if (c.kind === 'trial_ended') {
    subject = 'Your Web3Lens Pro trial has ended';
    lead = ['Your free 7-day Pro trial has ended and your account is back on Free. Nothing you saved is deleted.', 'To keep the Pro tools you just tried:'];
    cta = 'See Pro plans';
  } else if (c.kind === 'checkout_recovery') {
    subject = 'Your Web3Lens Pro checkout is still open';
    lead = [
      `You started checking out Web3Lens ${c.plan ? PLAN_LABEL[c.plan] : 'Pro'} but didn't finish, so nothing was charged.`,
      'If you were interrupted, you can pick up where you left off. Card declined? Paddle also takes PayPal, Apple Pay and Google Pay in most regions, or just reply and we will help.',
    ];
    cta = 'Finish upgrading';
    perks = false;
  } else {
    subject = 'A few things Web3Lens Pro can do for you';
    lead = ['Thanks for using Web3Lens. Lookups, explorers, gas and the developer tools stay free. Pro adds:'];
    cta = 'See Pro plans';
  }
  const why =
    c.kind === 'checkout_recovery'
      ? "You're getting this one-time reminder because you opened a checkout while signed in. If you've already upgraded, thank you, and please ignore it."
      : "You're getting this because you have a Web3Lens account.";
  const text = [hi, '', ...lead, ...(perks ? ['', ...PRO_PERKS.map((p) => `• ${p}`)] : []), '', `${cta}: ${pricing}`, '', `— ${SITE.name}`, '', why, `Unsubscribe from these emails: ${unsub}`].join('\n');
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#0f1d2b;max-width:560px">
<p>${escapeHtml(hi)}</p>
${lead.map((l) => `<p>${escapeHtml(l)}</p>`).join('\n')}
${perks ? `<ul>${PRO_PERKS.map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul>` : ''}
<p><a href="${escapeHtml(pricing)}" style="display:inline-block;background:#0a7f99;color:#ffffff;text-decoration:none;font-weight:bold;padding:10px 18px;border-radius:6px">${escapeHtml(cta)} →</a></p>
<p>— ${escapeHtml(SITE.name)}</p>
<p style="color:#5b6b7a;font-size:12px">${escapeHtml(why)}<br><a href="${escapeHtml(unsub)}" style="color:#5b6b7a">Unsubscribe from these emails</a></p>
</div>`;
  return {
    from: `${SITE.name} <${mailSender()}>`,
    to: c.email,
    subject: headerSafe(subject),
    text,
    html,
    headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  };
}

/* ---- Run ---- */

async function planView(u: UserRow, now: Date): Promise<PlanView> {
  const p = await planOf(u, now);
  return { plan: p.plan, source: p.source, trialEndsAt: p.trial.endsAt };
}

async function eligibleUsers(ids: string[] | null, sinceCreated: Date | null): Promise<UserRow[]> {
  if (ids && ids.length === 0) return [];
  const db = getDb();
  const where = ids ? inArray(schema.user.id, ids) : gte(schema.user.createdAt, sinceCreated!);
  const [users, profiles, optedOut] = await Promise.all([
    db.select({ id: schema.user.id, email: schema.user.email, name: schema.user.name, emailVerified: schema.user.emailVerified, createdAt: schema.user.createdAt }).from(schema.user).where(where),
    db.select({ userId: schema.userProfiles.userId, suspendedAt: schema.userProfiles.suspendedAt }).from(schema.userProfiles),
    db.select({ userId: schema.emailOptOuts.userId }).from(schema.emailOptOuts),
  ]);
  const suspended = new Set(profiles.filter((p) => p.suspendedAt).map((p) => p.userId));
  const out = new Set(optedOut.map((o) => o.userId));
  const admins = new Set(adminEmails());
  return users.filter((u) => u.emailVerified && !suspended.has(u.id) && !out.has(u.id) && !admins.has(u.email.toLowerCase()));
}

async function send(c: Candidate, now: Date): Promise<{ email: string; kind: LifecycleKind; ok: boolean; error?: string }> {
  const t = mailer();
  if (!t) return { email: c.email, kind: c.kind, ok: false, error: 'smtp_not_configured' };
  const db = getDb();
  const [row] = await db.insert(schema.lifecycleEmails).values({ userId: c.userId, email: c.email, kind: c.kind, createdAt: now }).returning({ id: schema.lifecycleEmails.id });
  try {
    await t.sendMail(renderLifecycleEmail(c));
    await db.update(schema.lifecycleEmails).set({ status: 'sent', sentAt: new Date() }).where(eq(schema.lifecycleEmails.id, row!.id));
    return { email: c.email, kind: c.kind, ok: true };
  } catch (e) {
    const error = (e instanceof Error ? e.message : String(e)).slice(0, 500);
    await db.update(schema.lifecycleEmails).set({ status: 'failed', error }).where(eq(schema.lifecycleEmails.id, row!.id));
    return { email: c.email, kind: c.kind, ok: false, error };
  }
}

export type LifecycleRun =
  | { skipped: 'billing_not_configured' | 'smtp_not_configured' }
  | { dryRun: boolean; nudges: number; reminders: number; sent: number; failed: number; capped: boolean; results: { email: string; kind: LifecycleKind; ok: boolean; error?: string }[] };

export async function runLifecycleEmails({ dryRun = false, now = new Date() }: { dryRun?: boolean; now?: Date } = {}): Promise<LifecycleRun> {
  if (!billingConfigured()) return { skipped: 'billing_not_configured' };
  if (!dryRun && !mailer()) return { skipped: 'smtp_not_configured' };
  const db = getDb();
  const ms = now.getTime();
  const sent = await db
    .select({ userId: schema.lifecycleEmails.userId, kind: schema.lifecycleEmails.kind, createdAt: schema.lifecycleEmails.createdAt })
    .from(schema.lifecycleEmails)
    .where(and(inArray(schema.lifecycleEmails.kind, ['nudge', 'trial_ended', 'checkout_recovery']), inArray(schema.lifecycleEmails.status, ['pending', 'sent']), gte(schema.lifecycleEmails.createdAt, new Date(ms - RESEND_DAYS * DAY))));

  // Checkout reminders first: they are time-sensitive, and a reminder holds the nudge back for QUIET_DAYS.
  const intents = await db
    .select({ userId: schema.checkoutIntents.userId, plan: schema.checkoutIntents.plan, createdAt: schema.checkoutIntents.createdAt })
    .from(schema.checkoutIntents)
    .where(and(gte(schema.checkoutIntents.createdAt, new Date(ms - RECOVERY_LOOKBACK_HOURS * HOUR)), lte(schema.checkoutIntents.createdAt, now)));
  const intentUsers = await eligibleUsers([...new Set(intents.map((i) => i.userId))], null);
  const intentPlans = new Map(await Promise.all(intentUsers.map(async (u) => [u.id, await planView(u, now)] as const)));
  const reminders = pickReminders(intents, new Map(intentUsers.map((u) => [u.id, u])), intentPlans, sent, ms).slice(0, MAX_RECOVERY_PER_RUN);

  const nudgeUsers = (await eligibleUsers(null, new Date(ms - NUDGE_MAX_AGE_DAYS * DAY))).filter((u) => !reminders.some((r) => r.userId === u.id));
  const nudgePlans = new Map(await Promise.all(nudgeUsers.map(async (u) => [u.id, await planView(u, now)] as const)));
  const startOfDay = new Date(now);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const sentToday = sent.filter((r) => r.kind !== 'checkout_recovery' && r.createdAt >= startOfDay).length;
  const allNudges = pickNudges(nudgeUsers, nudgePlans, sent, ms);
  const nudges = allNudges.slice(0, Math.max(0, MAX_NUDGES_PER_DAY - sentToday));

  const batch = [...reminders, ...nudges];
  const summary = { dryRun, nudges: nudges.length, reminders: reminders.length, sent: 0, failed: 0, capped: allNudges.length > nudges.length, results: [] as { email: string; kind: LifecycleKind; ok: boolean; error?: string }[] };
  if (dryRun) {
    summary.results = batch.map((c) => ({ email: c.email, kind: c.kind, ok: true }));
    return summary;
  }
  for (const c of batch) {
    const r = await send(c, now);
    summary.results.push(r);
    if (r.ok) summary.sent++;
    else summary.failed++;
  }
  // Intents only matter for RECOVERY_LOOKBACK_HOURS; keep a month for support questions, then drop them.
  await db.delete(schema.checkoutIntents).where(lt(schema.checkoutIntents.createdAt, new Date(ms - RESEND_DAYS * DAY)));
  return summary;
}
