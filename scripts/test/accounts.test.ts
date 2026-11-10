/**
 * Accounts, billing and quotas against a real Postgres (PGlite, in process): the migrations in drizzle/, Better
 * Auth sessions (bearer and expiry), the Paddle webhook lifecycle, quota races, extension pairing and ownership.
 */
import assert from 'node:assert/strict';
import { createHmac, createHash, randomBytes } from 'node:crypto';
import path from 'node:path';
import { after, before, beforeEach, describe, test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { eq, sql } from 'drizzle-orm';
import * as schema from '../../lib/db/schema';
import { setDbForTests } from '../../lib/db';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const SECRET = 'whsec_test_secret';
const PRICES = { monthly: 'pri_w3l_month', yearly: 'pri_w3l_year', lifetime: 'pri_w3l_life' };

Object.assign(process.env, {
  DATABASE_URL: 'postgres://pglite.invalid/test',
  BETTER_AUTH_SECRET: 'test-secret-test-secret-test-secret-123456',
  BETTER_AUTH_URL: 'https://web3lens.com',
  GOOGLE_CLIENT_ID: 'test-client',
  GOOGLE_CLIENT_SECRET: 'test-client-secret',
  PADDLE_WEBHOOK_SECRET: `old_secret,${SECRET}`,
  NEXT_PUBLIC_PADDLE_PRICE_MONTHLY: PRICES.monthly,
  NEXT_PUBLIC_PADDLE_PRICE_YEARLY: PRICES.yearly,
  NEXT_PUBLIC_PADDLE_PRICE_LIFETIME: PRICES.lifetime,
});

let pg: PGlite;
let db: ReturnType<typeof drizzle<typeof schema>>;

before(async () => {
  pg = new PGlite();
  db = drizzle(pg, { schema });
  await migrate(db, { migrationsFolder: path.join(ROOT, 'drizzle') });
  setDbForTests(db);
});
after(async () => {
  setDbForTests(null);
  await pg.close();
});

async function reset() {
  await db.execute(sql`truncate "user", subscriptions, webhook_events, trial_claims, usage_counters, extension_pairings, verification cascade`);
}

async function makeUser(id: string, email = `${id}@example.com`) {
  await db.insert(schema.user).values({ id, name: id, email, emailVerified: true });
  return { id, email, name: id };
}

/* ---------------------------------------------------------------- pure rules */

describe('entitlements and membership rules', async () => {
  const { LIMITS, canUse, limitsFor } = await import('../../lib/entitlements');
  const { planFor, effectivePlan, subscriptionRenews, hasChargeableSubscription, refunded } = await import('../../lib/server/membership');
  const now = new Date('2026-11-10T12:00:00Z');
  const later = new Date('2026-12-10T12:00:00Z');
  const earlier = new Date('2026-10-10T12:00:00Z');
  const row = (o: Partial<Parameters<typeof planFor>[0][number]>) => ({ id: 'sub_1', userId: 'u', plan: 'monthly' as const, status: 'active' as const, endsAt: later, paddleUpdatedAt: now, ...o });

  test('limits match the published table', () => {
    assert.deepEqual(
      [LIMITS.free.batch, LIMITS.free.batchBalances, LIMITS.free.crossChainPerDay, LIMITS.free.savedLocal, LIMITS.free.savedCloud, LIMITS.free.investigations],
      [10, 5, 10, 50, 0, 0],
    );
    assert.deepEqual(
      [LIMITS.pro.batch, LIMITS.pro.batchBalances, LIMITS.pro.crossChainPerDay, LIMITS.pro.apiPerDay, LIMITS.pro.savedCloud, LIMITS.pro.investigations],
      [500, 500, 500, 1000, 2000, 100],
    );
    assert.equal(LIMITS.free.apiPerMinuteShared, 60);
    assert.deepEqual(LIMITS.free.exports, ['csv']);
    assert.deepEqual(LIMITS.pro.exports, ['csv', 'json']);
    assert.equal(limitsFor('lifetime'), LIMITS.pro);
    for (const f of ['cloudSync', 'investigations', 'jsonExport', 'apiKeys'] as const) {
      assert.equal(canUse(f, 'free'), false, f);
      assert.equal(canUse(f, 'pro'), true, f);
    }
  });

  test('subscription statuses', () => {
    assert.equal(planFor([], now).plan, 'free');
    assert.deepEqual(planFor([row({})], now), { plan: 'pro', until: later });
    assert.equal(planFor([row({ status: 'trialing' })], now).plan, 'pro');
    assert.equal(planFor([row({ status: 'past_due' })], now).plan, 'pro', 'dunning keeps Pro while Paddle retries');
    assert.equal(planFor([row({ status: 'canceled' })], now).plan, 'pro', 'scheduled cancel keeps the paid period');
    assert.equal(planFor([row({ status: 'canceled', endsAt: earlier })], now).plan, 'free', 'expired');
    assert.equal(planFor([row({ status: 'active', endsAt: earlier })], now).plan, 'free', 'a lapsed period grants nothing');
    assert.equal(planFor([row({ status: 'paused' })], now).plan, 'free');
    assert.equal(planFor([row({ endsAt: null })], now).plan, 'free', 'no period end: never guess');
    assert.equal(planFor([row({ plan: 'lifetime', id: 'txn:1', endsAt: null })], now).plan, 'lifetime');
    assert.equal(subscriptionRenews([row({})], now), true);
    assert.equal(subscriptionRenews([row({ status: 'canceled' })], now), false);
  });

  test('refunds: lifetime is revoked; a subscription loses the refunded period only', () => {
    assert.equal(planFor([row({ plan: 'lifetime', id: 'txn:1', endsAt: null, refundedAt: now })], now).plan, 'free');
    const sub = row({ refundedAt: now, refundedPeriodEnd: later });
    assert.equal(refunded(sub), true);
    assert.equal(planFor([sub], now).plan, 'free');
    const renewed = row({ refundedAt: now, refundedPeriodEnd: later, endsAt: new Date('2027-01-10T12:00:00Z') });
    assert.equal(planFor([renewed], now).plan, 'pro', 'a later renewal is paid again');
  });

  test('overrides and trial', () => {
    const free = { plan: 'free' as const, until: null };
    const pro = { plan: 'pro' as const, until: later };
    const trial = { startedAt: earlier, endsAt: later };
    assert.equal(effectivePlan(free, { plan: 'lifetime', until: null }, now).plan, 'lifetime');
    assert.deepEqual(effectivePlan(pro, { plan: 'free', until: null }, now, trial), { plan: 'free', until: null, source: 'admin' }, 'forced free beats Paddle and trial');
    assert.equal(effectivePlan(free, { plan: 'pro', until: earlier }, now).plan, 'free', 'expired grant');
    assert.equal(effectivePlan(free, { plan: 'pro', until: null }, now).source, 'admin');
    assert.equal(effectivePlan(free, null, now, trial).source, 'trial');
    assert.equal(effectivePlan(free, null, now, { startedAt: earlier, endsAt: earlier }).plan, 'free', 'trial over');
    assert.equal(effectivePlan(pro, null, now, trial).source, 'paddle', 'paid beats trial');
  });

  test('chargeable subscriptions block account deletion; scheduled cancels do not', () => {
    assert.equal(hasChargeableSubscription([row({})]), true);
    assert.equal(hasChargeableSubscription([row({ status: 'paused' })]), true);
    assert.equal(hasChargeableSubscription([row({ status: 'canceled' })]), false);
    assert.equal(hasChargeableSubscription([row({ plan: 'lifetime', id: 'txn:1' })]), false);
  });
});

/* ---------------------------------------------------------------- schema */

describe('database schema', () => {
  beforeEach(reset);

  test('migrations create every table with constraints', async () => {
    const tables = (await db.execute(sql`select table_name from information_schema.tables where table_schema = 'public' order by 1`)).rows.map((r) => (r as { table_name: string }).table_name);
    for (const t of ['user', 'session', 'account', 'verification', 'user_profiles', 'subscriptions', 'webhook_events', 'trial_claims', 'usage_counters', 'extension_pairings']) {
      assert.ok(tables.includes(t), t);
    }
    await makeUser('u1');
    await assert.rejects(db.insert(schema.user).values({ id: 'u2', name: 'x', email: 'u1@example.com' }), 'email unique');
    await assert.rejects(db.execute(sql`insert into subscriptions (id, plan, status, paddle_updated_at) values ('s', 'weekly', 'active', now())`), 'plan check');
    await assert.rejects(db.execute(sql`insert into subscriptions (id, plan, status, paddle_updated_at) values ('s', 'monthly', 'gone', now())`), 'status check');
    await assert.rejects(db.execute(sql`insert into usage_counters (subject, metric, window_start, count) values ('u:u1', 'api', now(), -1)`), 'count check');
    await assert.rejects(db.execute(sql`insert into user_profiles (user_id, plan_override) values ('u1', 'gold')`), 'override check');
    await assert.rejects(db.execute(sql`insert into session (id, token, user_id, expires_at) values ('s', 't', 'nobody', now())`), 'session needs a user');
    await assert.rejects(
      db.execute(sql`insert into account (id, account_id, provider_id, user_id) values ('a1', 'g1', 'google', 'u1'), ('a2', 'g1', 'google', 'u1')`),
      'one row per Google identity',
    );
  });

  test('deleting a user cascades personal data and keeps billing records ownerless', async () => {
    await makeUser('u1');
    await db.insert(schema.session).values({ id: 's1', token: 'tok', userId: 'u1', expiresAt: new Date(Date.now() + 1e6) });
    await db.insert(schema.userProfiles).values({ userId: 'u1' });
    await db.insert(schema.subscriptions).values({ id: 'sub_x', userId: 'u1', plan: 'monthly', status: 'canceled', paddleUpdatedAt: new Date() });
    await db.insert(schema.trialClaims).values({ email: 'u1@example.com', userId: 'u1', endsAt: new Date() });
    await db.delete(schema.user).where(eq(schema.user.id, 'u1'));
    assert.equal((await db.select().from(schema.session)).length, 0);
    assert.equal((await db.select().from(schema.userProfiles)).length, 0);
    const [sub] = await db.select().from(schema.subscriptions);
    assert.equal(sub?.userId, null, 'billing record kept without owner');
    const [claim] = await db.select().from(schema.trialClaims);
    assert.equal(claim?.userId, null, 'trial stays used for this email');
  });

  test('no column can hold wallet secrets', () => {
    const forbidden = /(private.?key|seed|mnemonic|secret.?phrase|keystore)/i;
    for (const table of Object.values(schema)) {
      if (typeof table !== 'object' || !table || !(Symbol.for('drizzle:Columns') in table)) continue;
      const cols = (table as unknown as Record<symbol, Record<string, { name: string }>>)[Symbol.for('drizzle:Columns')]!;
      for (const c of Object.values(cols)) assert.doesNotMatch(c.name, forbidden, c.name);
    }
  });
});

/* ---------------------------------------------------------------- quotas */

describe('quotas', async () => {
  const { consumeQuota, usageOf, dayWindow } = await import('../../lib/server/stores');
  beforeEach(reset);

  test('takes up to the limit, then refuses without taking', async () => {
    const now = new Date('2026-11-10T23:59:00Z');
    for (let i = 1; i <= 10; i++) assert.equal(await consumeQuota('u:a', 'crossChain', 1, 10, now), i);
    assert.equal(await consumeQuota('u:a', 'crossChain', 1, 10, now), null);
    assert.equal(await usageOf('u:a', 'crossChain', now), 10);
    assert.equal(await consumeQuota('u:a', 'crossChain', 0, 10, now), null, 'n must be positive');
    assert.equal(await consumeQuota('u:a', 'crossChain', 11, 10, now), null, 'never more than the limit at once');
    assert.equal(await consumeQuota('u:b', 'crossChain', 1, 10, now), 1, 'subjects are independent');
    assert.equal(await consumeQuota('u:a', 'api', 1, 10, now), 1, 'metrics are independent');
  });

  test('daily window resets at 00:00 UTC', async () => {
    const late = new Date('2026-11-10T23:59:59Z');
    const next = new Date('2026-11-11T00:00:01Z');
    assert.equal(dayWindow(late).toISOString(), '2026-11-10T00:00:00.000Z');
    await consumeQuota('u:a', 'crossChain', 10, 10, late);
    assert.equal(await consumeQuota('u:a', 'crossChain', 1, 10, late), null);
    assert.equal(await consumeQuota('u:a', 'crossChain', 1, 10, next), 1);
  });

  test('100 concurrent requests never overshoot the limit', async () => {
    const now = new Date();
    const results = await Promise.all(Array.from({ length: 100 }, () => consumeQuota('u:race', 'crossChain', 1, 25, now)));
    assert.equal(results.filter((r) => r !== null).length, 25);
    assert.equal(await usageOf('u:race', 'crossChain', now), 25);
  });
});

/* ---------------------------------------------------------------- Paddle */

const sign = (body: string, secret = SECRET, ts = Math.floor(Date.now() / 1000)) => `ts=${ts};h1=${createHmac('sha256', secret).update(`${ts}:${body}`).digest('hex')}`;

describe('Paddle webhook', async () => {
  const { verifyPaddleSignature, applyPaddleEvent } = await import('../../lib/server/paddle');
  const { subscriptionStore, subscriptionsOf } = await import('../../lib/server/stores');
  const { planOf } = await import('../../lib/server/session');
  const route = await import('../../app/api/webhooks/paddle/route');
  beforeEach(reset);

  let n = 0;
  const event = (type: string, data: Record<string, unknown>, occurred = new Date()) => ({ event_id: `evt_${++n}`, event_type: type, occurred_at: occurred.toISOString(), data });
  const subData = (o: Record<string, unknown> = {}) => ({
    id: 'sub_01',
    status: 'active',
    customer_id: 'ctm_1',
    custom_data: { userId: 'buyer' },
    items: [{ price: { id: PRICES.monthly } }],
    current_billing_period: { starts_at: new Date().toISOString(), ends_at: new Date(Date.now() + 30 * 864e5).toISOString() },
    management_urls: { update_payment_method: 'https://paddle.example/upd', cancel: 'https://paddle.example/cancel' },
    ...o,
  });
  const post = (body: string, signature: string | null) =>
    route.POST(new Request('https://web3lens.com/api/webhooks/paddle', { method: 'POST', body, headers: signature ? { 'paddle-signature': signature } : {} }));
  const plan = async () => (await planOf({ id: 'buyer', email: 'buyer@example.com', name: 'b' })).plan;

  test('signature: valid, rotated secret, tampered, replayed, missing', () => {
    const body = '{"a":1}';
    assert.equal(verifyPaddleSignature(body, sign(body), [SECRET]), true);
    assert.equal(verifyPaddleSignature(body, sign(body, 'old_secret'), ['old_secret', SECRET]), true, 'rotation');
    assert.equal(verifyPaddleSignature('{"a":2}', sign(body), [SECRET]), false, 'tampered');
    assert.equal(verifyPaddleSignature(body, sign(body, SECRET, Math.floor(Date.now() / 1000) - 600), [SECRET]), false, 'replay');
    assert.equal(verifyPaddleSignature(body, null, [SECRET]), false);
    assert.equal(verifyPaddleSignature(body, 'ts=1;h1=zz', [SECRET]), false);
    assert.equal(verifyPaddleSignature(body, sign(body), []), false);
  });

  test('route: 401 unsigned, 400 malformed, applies signed events, duplicates are no-ops', async () => {
    await makeUser('buyer');
    const body = JSON.stringify(event('subscription.created', subData()));
    assert.equal((await post(body, null)).status, 401);
    assert.equal((await post(body, sign(body, 'wrong'))).status, 401);
    const junk = '{"hello":1}';
    assert.equal((await post(junk, sign(junk))).status, 400);
    const ok = await post(body, sign(body));
    assert.equal(ok.status, 200);
    assert.equal((await ok.json()).result, 'applied');
    assert.equal((await (await post(body, sign(body))).json()).result, 'duplicate');
    assert.equal(await plan(), 'pro');
  });

  test('lifecycle: activate, renew, schedule cancel, expire, past_due, resume', async () => {
    await makeUser('buyer');
    // Events in the recent past (planOf resolves against the real clock).
    const t0 = Date.now() - 60_000;
    const at = (s: number) => new Date(t0 + s * 1000);
    await applyPaddleEvent(subscriptionStore, event('subscription.activated', subData(), at(1)), PRICES);
    assert.equal(await plan(), 'pro');
    // Renewal moves the period forward.
    const renewedEnd = new Date(t0 + 60 * 864e5).toISOString();
    await applyPaddleEvent(subscriptionStore, event('subscription.updated', subData({ current_billing_period: { ends_at: renewedEnd } }), at(2)), PRICES);
    assert.equal((await subscriptionsOf('buyer'))[0]?.endsAt?.toISOString(), renewedEnd);
    // Scheduled cancellation: still Pro until the effective date, no longer renewing.
    const eff = new Date(t0 + 10 * 864e5).toISOString();
    await applyPaddleEvent(subscriptionStore, event('subscription.updated', subData({ scheduled_change: { action: 'cancel', effective_at: eff } }), at(3)), PRICES);
    const p = await planOf({ id: 'buyer', email: 'buyer@example.com', name: 'b' });
    assert.deepEqual([p.plan, p.renews, p.until?.toISOString()], ['pro', false, eff]);
    // Payment failing: past_due keeps Pro while Paddle retries.
    await applyPaddleEvent(subscriptionStore, event('subscription.past_due', subData({ status: 'past_due' }), at(4)), PRICES);
    assert.equal(await plan(), 'pro');
    // Cancelled for good (immediately): Free.
    await applyPaddleEvent(subscriptionStore, event('subscription.canceled', subData({ status: 'canceled', current_billing_period: null, canceled_at: at(5).toISOString() }), at(5)), PRICES);
    assert.equal(await plan(), 'free');
  });

  test('out-of-order events: an older event never overwrites a newer one', async () => {
    await makeUser('buyer');
    const newer = new Date();
    const older = new Date(newer.getTime() - 60_000);
    await applyPaddleEvent(subscriptionStore, event('subscription.canceled', subData({ status: 'canceled', current_billing_period: null }), newer), PRICES);
    assert.equal(await applyPaddleEvent(subscriptionStore, event('subscription.activated', subData(), older), PRICES), 'stale');
    assert.equal(await plan(), 'free');
  });

  test('failure is retried: a failed apply is forgotten, not marked duplicate', async () => {
    await makeUser('buyer');
    const e = event('subscription.created', subData());
    const broken = { ...subscriptionStore, upsert: async () => Promise.reject(new Error('db down')) };
    await assert.rejects(applyPaddleEvent(broken, e, PRICES));
    assert.equal(await applyPaddleEvent(subscriptionStore, e, PRICES), 'applied', 'the retry applies');
  });

  test('lifetime purchase, full refund, chargeback reversal; partial refund keeps access', async () => {
    await makeUser('buyer');
    const txn = { id: 'txn_9', customer_id: 'ctm_1', custom_data: { userId: 'buyer' }, items: [{ price: { id: PRICES.lifetime } }] };
    await applyPaddleEvent(subscriptionStore, event('transaction.completed', txn), PRICES);
    assert.equal(await plan(), 'lifetime');
    assert.equal(await applyPaddleEvent(subscriptionStore, event('adjustment.created', { status: 'approved', action: 'refund', type: 'partial', transaction_id: 'txn_9' }), PRICES), 'partial_refund');
    assert.equal(await plan(), 'lifetime');
    assert.equal(await applyPaddleEvent(subscriptionStore, event('adjustment.created', { status: 'pending_approval', action: 'refund', type: 'full', transaction_id: 'txn_9' }), PRICES), 'ignored');
    await applyPaddleEvent(subscriptionStore, event('adjustment.updated', { status: 'approved', action: 'refund', type: 'full', transaction_id: 'txn_9' }), PRICES);
    assert.equal(await plan(), 'free');
    await applyPaddleEvent(subscriptionStore, event('adjustment.created', { status: 'approved', action: 'chargeback_reverse', transaction_id: 'txn_9' }), PRICES);
    assert.equal(await plan(), 'lifetime');
  });

  test('refund of a subscription charge ends that period, even if a late subscription event arrives', async () => {
    await makeUser('buyer');
    const t0 = new Date();
    const period = { ends_at: new Date(t0.getTime() + 30 * 864e5).toISOString() };
    await applyPaddleEvent(subscriptionStore, event('subscription.activated', subData({ current_billing_period: period }), t0), PRICES);
    await applyPaddleEvent(subscriptionStore, event('adjustment.updated', { status: 'approved', action: 'refund', type: 'full', subscription_id: 'sub_01', transaction_id: 'txn_m1' }, new Date(t0.getTime() + 1000)), PRICES);
    assert.equal(await plan(), 'free');
    await applyPaddleEvent(subscriptionStore, event('subscription.updated', subData({ current_billing_period: period }), new Date(t0.getTime() + 2000)), PRICES);
    assert.equal(await plan(), 'free', 'same period: still refunded');
    const next = { ends_at: new Date(t0.getTime() + 60 * 864e5).toISOString() };
    await applyPaddleEvent(subscriptionStore, event('subscription.updated', subData({ current_billing_period: next }), new Date(t0.getTime() + 3000)), PRICES);
    assert.equal(await plan(), 'pro', 'the next paid period grants Pro again');
  });

  test('other products on the shared account and unknown users are ignored safely', async () => {
    await makeUser('buyer');
    assert.equal(await applyPaddleEvent(subscriptionStore, event('subscription.created', subData({ items: [{ price: { id: 'pri_other_site' } }] })), PRICES), 'ignored');
    assert.equal(await applyPaddleEvent(subscriptionStore, event('subscription.created', subData({ id: 'sub_ghost', custom_data: { userId: 'nobody' } })), PRICES), 'applied');
    const [ghost] = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.id, 'sub_ghost'));
    assert.equal(ghost?.userId, null, 'stored ownerless, not linked to a guessed user');
    // A later event without custom_data never blanks a known owner.
    await applyPaddleEvent(subscriptionStore, event('subscription.created', subData()), PRICES);
    await applyPaddleEvent(subscriptionStore, event('subscription.updated', subData({ custom_data: null }), new Date(Date.now() + 1000)), PRICES);
    assert.equal((await subscriptionsOf('buyer')).length, 1);
  });
});

/* ---------------------------------------------------------------- sessions, /api/me, ownership */

describe('sessions and account API', async () => {
  const { getAuth } = await import('../../lib/server/auth');
  const { currentUser } = await import('../../lib/server/session');
  const me = await import('../../app/api/me/route');
  const sessions = await import('../../app/api/account/sessions/route');
  const account = await import('../../app/api/account/route');
  const trial = await import('../../app/api/billing/trial/route');
  const prepare = await import('../../app/api/billing/prepare/route');
  beforeEach(reset);

  const tokenFor = async (userId: string, expiresAt?: Date) => {
    const ctx = await getAuth()!.$context;
    const s = await ctx.internalAdapter.createSession(userId, false);
    if (expiresAt) await db.update(schema.session).set({ expiresAt }).where(eq(schema.session.id, s.id));
    return s;
  };
  const bearer = (token: string, extra: Record<string, string> = {}) => ({ authorization: `Bearer ${token}`, ...extra });
  const site = { origin: 'https://web3lens.com' };

  test('bearer session resolves; expired and revoked sessions do not', async () => {
    await makeUser('alice');
    const s = await tokenFor('alice');
    assert.equal((await currentUser(new Headers(bearer(s.token))))?.user.id, 'alice');
    const expired = await tokenFor('alice', new Date(Date.now() - 1000));
    assert.equal(await currentUser(new Headers(bearer(expired.token))), null);
    await db.delete(schema.session).where(eq(schema.session.token, s.token));
    assert.equal(await currentUser(new Headers(bearer(s.token))), null);
    assert.equal(await currentUser(new Headers(bearer('forged-token'))), null);
  });

  test('/api/me: signed out, expired bearer = 401, Free and Pro accounts independently', async () => {
    await makeUser('free1');
    await makeUser('pro1');
    await db.insert(schema.subscriptions).values({ id: 'sub_p', userId: 'pro1', plan: 'yearly', status: 'active', endsAt: new Date(Date.now() + 864e5), paddleUpdatedAt: new Date() });
    const anon = await me.GET(new Request('https://web3lens.com/api/me'));
    assert.deepEqual(await anon.json(), { signedIn: false, accounts: true });
    assert.equal((await me.GET(new Request('https://web3lens.com/api/me', { headers: bearer('nope') }))).status, 401);
    const f = await (await me.GET(new Request('https://web3lens.com/api/me', { headers: bearer((await tokenFor('free1')).token) }))).json();
    const p = await (await me.GET(new Request('https://web3lens.com/api/me', { headers: bearer((await tokenFor('pro1')).token) }))).json();
    assert.deepEqual([f.plan, f.limits.batch, f.usage.crossChain.limit], ['free', 10, 10]);
    assert.deepEqual([p.plan, p.limits.batch, p.usage.crossChain.limit, p.renews], ['pro', 500, 500, true]);
  });

  test('/api/me CORS: only our extensions', async () => {
    await makeUser('alice');
    const tok = (await tokenFor('alice')).token;
    const ok = await me.GET(new Request('https://web3lens.com/api/me', { headers: bearer(tok, { origin: 'chrome-extension://bigcbkdjbbmgdicfejljnklmgbpmajlf' }) }));
    assert.equal(ok.headers.get('access-control-allow-origin'), 'chrome-extension://bigcbkdjbbmgdicfejljnklmgbpmajlf');
    const ff = await me.GET(new Request('https://web3lens.com/api/me', { headers: bearer(tok, { origin: 'moz-extension://0f8a5c7e-1234-4cde-9abc-0123456789ab' }) }));
    assert.ok(ff.headers.get('access-control-allow-origin'));
    const evil = await me.GET(new Request('https://web3lens.com/api/me', { headers: bearer(tok, { origin: 'https://evil.example' }) }));
    assert.equal(evil.headers.get('access-control-allow-origin'), null);
    assert.match(ok.headers.get('cache-control') ?? '', /no-store/);
  });

  test('sessions: list own only, revoke own only', async () => {
    await makeUser('alice');
    await makeUser('mallory');
    const a = await tokenFor('alice');
    const m = await tokenFor('mallory');
    const list = await (await sessions.GET(new Request('https://web3lens.com/api/account/sessions', { headers: bearer(a.token) }))).json();
    assert.deepEqual(list.sessions.map((s: { id: string }) => s.id), [a.id]);
    // Mallory can't revoke Alice's session by id.
    const del = await sessions.DELETE(new Request(`https://web3lens.com/api/account/sessions?id=${a.id}`, { method: 'DELETE', headers: bearer(m.token, site) }));
    assert.equal(del.status, 404);
    assert.ok(await currentUser(new Headers(bearer(a.token))));
    // Cross-site request refused.
    assert.equal((await sessions.DELETE(new Request(`https://web3lens.com/api/account/sessions?id=${a.id}`, { method: 'DELETE', headers: bearer(a.token, { origin: 'https://evil.example' }) }))).status, 403);
    assert.equal((await sessions.DELETE(new Request(`https://web3lens.com/api/account/sessions?id=${a.id}`, { method: 'DELETE', headers: bearer(a.token, site) }))).status, 200);
    assert.equal(await currentUser(new Headers(bearer(a.token))), null);
  });

  test('trial: once per email, survives account deletion', async () => {
    await makeUser('tess');
    const tok = (await tokenFor('tess')).token;
    const start = () => trial.POST(new Request('https://web3lens.com/api/billing/trial', { method: 'POST', headers: bearer(tok, site) }));
    assert.equal((await start()).status, 200);
    assert.equal((await start()).status, 409);
    const del = await account.DELETE(new Request('https://web3lens.com/api/account', { method: 'DELETE', headers: bearer(tok, site), body: JSON.stringify({ confirmEmail: 'tess@example.com' }) }));
    assert.equal(del.status, 200);
    await makeUser('tess2', 'TESS@example.com');
    const tok2 = (await tokenFor('tess2')).token;
    const again = await trial.POST(new Request('https://web3lens.com/api/billing/trial', { method: 'POST', headers: bearer(tok2, site) }));
    assert.equal(again.status, 409, 'same email, new account: no second trial');
  });

  test('account deletion: needs same origin and email, refused while a subscription can charge', async () => {
    await makeUser('del');
    const tok = (await tokenFor('del')).token;
    await db.insert(schema.subscriptions).values({ id: 'sub_d', userId: 'del', plan: 'monthly', status: 'active', endsAt: new Date(Date.now() + 864e5), paddleUpdatedAt: new Date() });
    const req = (headers: Record<string, string>, confirmEmail: string) => new Request('https://web3lens.com/api/account', { method: 'DELETE', headers, body: JSON.stringify({ confirmEmail }) });
    assert.equal((await account.DELETE(req(bearer(tok), 'del@example.com'))).status, 403, 'no origin');
    assert.equal((await account.DELETE(req(bearer(tok, site), 'wrong@example.com'))).status, 400);
    assert.equal((await account.DELETE(req(bearer(tok, site), 'del@example.com'))).status, 409);
    await db.update(schema.subscriptions).set({ status: 'canceled' });
    assert.equal((await account.DELETE(req(bearer(tok, site), 'del@example.com'))).status, 200);
    assert.equal((await db.select().from(schema.user)).length, 0);
  });

  test('checkout guard is on the server', async () => {
    await makeUser('subbed');
    const tok = (await tokenFor('subbed')).token;
    const buy = async (plan: string) => prepare.POST(new Request('https://web3lens.com/api/billing/prepare', { method: 'POST', headers: bearer(tok, site), body: JSON.stringify({ plan }) }));
    const first = await buy('monthly');
    assert.equal(first.status, 200);
    assert.deepEqual(await first.json(), { priceId: PRICES.monthly, email: 'subbed@example.com', customData: { userId: 'subbed' } });
    assert.equal((await buy('weekly')).status, 400);
    await db.insert(schema.subscriptions).values({ id: 'sub_s', userId: 'subbed', plan: 'monthly', status: 'active', endsAt: new Date(Date.now() + 864e5), paddleUpdatedAt: new Date() });
    assert.equal((await buy('yearly')).status, 409, 'no second subscription');
    assert.equal((await buy('lifetime')).status, 200, 'upgrade to lifetime allowed');
    await db.insert(schema.subscriptions).values({ id: 'txn:l', userId: 'subbed', plan: 'lifetime', status: 'active', paddleUpdatedAt: new Date() });
    assert.equal((await buy('lifetime')).status, 409);
  });
});

/* ---------------------------------------------------------------- extension pairing */

describe('extension pairing', async () => {
  const start = await import('../../app/api/ext/pair/start/route');
  const approve = await import('../../app/api/ext/pair/approve/route');
  const claim = await import('../../app/api/ext/pair/claim/route');
  const signOut = await import('../../app/api/ext/sign-out/route');
  const { getAuth } = await import('../../lib/server/auth');
  const { currentUser } = await import('../../lib/server/session');
  const { approvePairing, claimPairing, startPairing, PAIRING_TTL_MS } = await import('../../lib/server/stores');
  beforeEach(reset);

  const EXT = 'chrome-extension://bigcbkdjbbmgdicfejljnklmgbpmajlf';
  const verifier = () => randomBytes(32).toString('base64url');
  const h = (v: string) => createHash('sha256').update(v).digest('hex');
  const json = (url: string, body: unknown, headers: Record<string, string>) => new Request(`https://web3lens.com${url}`, { method: 'POST', headers, body: JSON.stringify(body) });

  test('full flow: start, pending, approve, claim once, bearer works, sign out', async () => {
    await makeUser('eve');
    const v = verifier();
    const s = await start.POST(json('/api/ext/pair/start', { verifierHash: h(v), browser: 'chrome' }, { origin: EXT }));
    assert.equal(s.status, 200);
    const { code } = await s.json();
    assert.match(code, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    assert.equal((await claim.POST(json('/api/ext/pair/claim', { code, verifier: v }, { origin: EXT }))).status, 202);
    const site = await getAuth()!.$context.then((c) => c.internalAdapter.createSession('eve', false));
    assert.equal((await approve.POST(json('/api/ext/pair/approve', { code }, { origin: 'https://evil.example', authorization: `Bearer ${site.token}` }))).status, 403);
    assert.equal((await approve.POST(json('/api/ext/pair/approve', { code }, { origin: 'https://web3lens.com', authorization: `Bearer ${site.token}` }))).status, 200);
    assert.equal((await claim.POST(json('/api/ext/pair/claim', { code, verifier: verifier() }, { origin: EXT }))).status, 410, 'wrong verifier');
    const ok = await claim.POST(json('/api/ext/pair/claim', { code, verifier: v }, { origin: EXT }));
    assert.equal(ok.status, 200);
    const body = await ok.json();
    assert.equal(body.me.user.id, 'eve');
    assert.equal((await claim.POST(json('/api/ext/pair/claim', { code, verifier: v }, { origin: EXT }))).status, 410, 'single use');
    assert.equal((await currentUser(new Headers({ authorization: `Bearer ${body.token}` })))?.user.id, 'eve');
    const [row] = await db.select().from(schema.session).where(eq(schema.session.token, body.token));
    assert.match(row?.userAgent ?? '', /^Web3Lens extension/);
    assert.equal((await signOut.POST(new Request('https://web3lens.com/api/ext/sign-out', { method: 'POST', headers: { authorization: `Bearer ${body.token}`, origin: EXT } }))).status, 200);
    assert.equal(await currentUser(new Headers({ authorization: `Bearer ${body.token}` })), null);
    assert.ok(await currentUser(new Headers({ authorization: `Bearer ${site.token}` })), 'the website session is separate');
  });

  test('only extension origins can start or claim; codes expire; races claim once', async () => {
    await makeUser('eve');
    assert.equal((await start.POST(json('/api/ext/pair/start', { verifierHash: h('x') }, { origin: 'https://evil.example' }))).status, 403);
    assert.equal((await start.POST(json('/api/ext/pair/start', { verifierHash: 'short' }, { origin: EXT }))).status, 400);
    const t0 = new Date();
    const v = verifier();
    const code = await startPairing(h(v), null, t0);
    const late = new Date(t0.getTime() + PAIRING_TTL_MS + 1);
    assert.equal(await approvePairing(code, 'eve', late), false, 'expired codes cannot be approved');
    assert.equal(await approvePairing(code, 'eve', t0), true);
    assert.equal(await approvePairing(code, 'eve', t0), false, 'approve once');
    assert.equal(await claimPairing(code, v, late), null, 'expired codes cannot be claimed');
    const racers = await Promise.all(Array.from({ length: 10 }, () => claimPairing(code, v, t0)));
    assert.equal(racers.filter((r) => r === 'eve').length, 1);
  });
});
