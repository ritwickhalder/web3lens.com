/**
 * Database access for accounts. Every function that touches user data takes the user id from the caller's session
 * (lib/server/session.ts), never from a request body, and every query filters by it.
 */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { and, eq, gt, isNotNull, isNull, lt, sql } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import type { Metric } from '@/lib/entitlements';
import type { PlanOverride, SubscriptionRow, TrialClaim } from '@/lib/server/membership';
import { TRIAL_MS, trialKey } from '@/lib/server/membership';
import type { PaddleEvent, SubscriptionStore } from '@/lib/server/paddle';

const t = schema.subscriptions;

const toRow = (r: typeof t.$inferSelect): SubscriptionRow => ({
  id: r.id,
  userId: r.userId,
  plan: r.plan,
  status: r.status,
  priceId: r.priceId,
  endsAt: r.endsAt,
  refundedAt: r.refundedAt,
  refundedPeriodEnd: r.refundedPeriodEnd,
  paddleUpdatedAt: r.paddleUpdatedAt,
  customerId: r.paddleCustomerId,
  manageUrl: r.manageUrl,
  cancelUrl: r.cancelUrl,
});

export const subscriptionStore: SubscriptionStore = {
  async recordEvent(event: PaddleEvent) {
    const inserted = await getDb()
      .insert(schema.webhookEvents)
      .values({ eventId: event.event_id, eventType: event.event_type, occurredAt: new Date(event.occurred_at) })
      .onConflictDoNothing()
      .returning({ id: schema.webhookEvents.eventId });
    return inserted.length > 0;
  },
  async forgetEvent(eventId) {
    await getDb().delete(schema.webhookEvents).where(eq(schema.webhookEvents.eventId, eventId));
  },
  async setOutcome(eventId, outcome) {
    await getDb().update(schema.webhookEvents).set({ outcome }).where(eq(schema.webhookEvents.eventId, eventId));
  },
  async get(id) {
    const [r] = await getDb().select().from(t).where(eq(t.id, id)).limit(1);
    return r ? toRow(r) : null;
  },
  async upsert(row) {
    const values = {
      id: row.id,
      userId: row.userId,
      plan: row.plan,
      status: row.status,
      priceId: row.priceId ?? null,
      endsAt: row.endsAt,
      paddleCustomerId: row.customerId ?? null,
      manageUrl: row.manageUrl ?? null,
      cancelUrl: row.cancelUrl ?? null,
      paddleUpdatedAt: row.paddleUpdatedAt,
    };
    const written = await getDb()
      .insert(t)
      .values(values)
      .onConflictDoUpdate({
        target: t.id,
        // Never blank a known owner (a later event may lack custom_data). Refund columns are left alone.
        set: { ...values, userId: sql`coalesce(excluded.user_id, ${t.userId})` },
        // Atomic ordering guard: an older event never overwrites a newer one, even when both arrive at once.
        setWhere: sql`${t.paddleUpdatedAt} <= excluded.paddle_updated_at`,
      })
      .returning({ id: t.id });
    return written.length > 0;
  },
  async setRefund(id, refund) {
    const written = await getDb()
      .update(t)
      .set({ refundedAt: refund?.at ?? null, refundedPeriodEnd: refund?.periodEnd ?? null })
      .where(eq(t.id, id))
      .returning({ id: t.id });
    return written.length > 0;
  },
  async userExists(userId) {
    const [u] = await getDb().select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.id, userId)).limit(1);
    return !!u;
  },
};

export async function subscriptionsOf(userId: string): Promise<SubscriptionRow[]> {
  return (await getDb().select().from(t).where(eq(t.userId, userId))).map(toRow);
}

export async function profileOf(userId: string): Promise<{ override: PlanOverride | null; suspended: boolean }> {
  const [p] = await getDb().select().from(schema.userProfiles).where(eq(schema.userProfiles.userId, userId)).limit(1);
  if (!p) return { override: null, suspended: false };
  return { override: p.planOverride ? { plan: p.planOverride, until: p.overrideUntil } : null, suspended: !!p.suspendedAt };
}

/* ---- Trial ---- */

export async function trialClaimFor(email: string): Promise<TrialClaim | null> {
  const [c] = await getDb().select().from(schema.trialClaims).where(eq(schema.trialClaims.email, trialKey(email))).limit(1);
  return c ? { startedAt: c.startedAt, endsAt: c.endsAt } : null;
}

/** Starts the trial once per email, ever (the primary key makes a second claim a no-op). */
export async function claimTrial(user: { id: string; email: string }, now = new Date()): Promise<TrialClaim | null> {
  const [c] = await getDb()
    .insert(schema.trialClaims)
    .values({ email: trialKey(user.email), userId: user.id, startedAt: now, endsAt: new Date(now.getTime() + TRIAL_MS) })
    .onConflictDoNothing()
    .returning();
  return c ? { startedAt: c.startedAt, endsAt: c.endsAt } : null;
}

/* ---- Quotas ---- */

/** Start of the UTC day: daily quotas reset at 00:00 UTC. */
export const dayWindow = (now: Date) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
export const nextDay = (now: Date) => new Date(dayWindow(now).getTime() + 86_400_000);

/**
 * Takes `n` from a daily quota in one statement: the row is created or incremented only while the result stays
 * within `limit`, so concurrent requests can never overshoot (no read-then-write race). Returns the new count, or
 * null when the quota would be exceeded (nothing is taken).
 */
export async function consumeQuota(subject: string, metric: Metric, n: number, limit: number, now = new Date()): Promise<number | null> {
  if (!Number.isInteger(n) || n <= 0 || n > limit) return null;
  const u = schema.usageCounters;
  const rows = await getDb()
    .insert(u)
    .values({ subject, metric, windowStart: dayWindow(now), count: n, updatedAt: now })
    .onConflictDoUpdate({
      target: [u.subject, u.metric, u.windowStart],
      set: { count: sql`${u.count} + ${n}`, updatedAt: now },
      setWhere: sql`${u.count} + ${n} <= ${limit}`,
    })
    .returning({ count: u.count });
  return rows[0]?.count ?? null;
}

export async function usageOf(subject: string, metric: Metric, now = new Date()): Promise<number> {
  const u = schema.usageCounters;
  const [r] = await getDb()
    .select({ count: u.count })
    .from(u)
    .where(and(eq(u.subject, subject), eq(u.metric, metric), eq(u.windowStart, dayWindow(now))))
    .limit(1);
  return r?.count ?? 0;
}

/* ---- Extension pairing ---- */

export const PAIRING_TTL_MS = 10 * 60_000;
const hash = (v: string) => createHash('sha256').update(v).digest('hex');
/** Crockford-style alphabet without look-alikes (0/O, 1/I/L). */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function newPairingCode(): string {
  const bytes = randomBytes(8);
  const chars = [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]);
  return `${chars.slice(0, 4).join('')}-${chars.slice(4).join('')}`;
}

export const normalizeCode = (code: string) => code.trim().toUpperCase();
export const isPairingCode = (code: string) => /^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/.test(code);
export const isVerifier = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9_-]{43,128}$/.test(v);

/** The extension starts a pairing with the hash of a secret verifier only it knows. */
export async function startPairing(verifierHash: string, browser: string | null, now = new Date()): Promise<string> {
  const db = getDb();
  // Expired pairings are swept as new ones start (cheap, indexed).
  await db.delete(schema.extensionPairings).where(lt(schema.extensionPairings.expiresAt, now));
  for (;;) {
    const code = newPairingCode();
    const inserted = await db
      .insert(schema.extensionPairings)
      .values({ codeHash: hash(code), verifierHash, browser, createdAt: now, expiresAt: new Date(now.getTime() + PAIRING_TTL_MS) })
      .onConflictDoNothing()
      .returning({ c: schema.extensionPairings.codeHash });
    if (inserted.length) return code;
  }
}

/** The signed-in user approves a pending code (once, before it expires). */
export async function approvePairing(code: string, userId: string, now = new Date()): Promise<boolean> {
  const p = schema.extensionPairings;
  const rows = await getDb()
    .update(p)
    .set({ userId, approvedAt: now })
    .where(and(eq(p.codeHash, hash(normalizeCode(code))), isNull(p.approvedAt), isNull(p.claimedAt), gt(p.expiresAt, now)))
    .returning({ c: p.codeHash });
  return rows.length > 0;
}

/**
 * The extension claims an approved pairing with its verifier. The claim is one conditional UPDATE, so a code can be
 * claimed once even when two requests race. Returns the approving user's id, "pending" while not approved yet, or
 * null (unknown, expired, already claimed or wrong verifier).
 */
export async function claimPairing(code: string, verifier: string, now = new Date()): Promise<string | 'pending' | null> {
  const p = schema.extensionPairings;
  const codeHash = hash(normalizeCode(code));
  const [row] = await getDb().select().from(p).where(eq(p.codeHash, codeHash)).limit(1);
  if (!row || row.claimedAt || row.expiresAt <= now) return null;
  const expected = Buffer.from(row.verifierHash, 'hex');
  const got = Buffer.from(hash(verifier), 'hex');
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
  if (!row.approvedAt || !row.userId) return 'pending';
  const claimed = await getDb()
    .update(p)
    .set({ claimedAt: now })
    .where(and(eq(p.codeHash, codeHash), isNull(p.claimedAt), isNotNull(p.approvedAt), gt(p.expiresAt, now)))
    .returning({ userId: p.userId });
  return claimed[0]?.userId ?? null;
}

export const sha256Hex = hash;
