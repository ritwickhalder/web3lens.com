/**
 * Product emails (lib/server/lifecycle-mail.ts) against a real Postgres (PGlite): the upgrade nudge, the trial-ended
 * email and the abandoned-checkout reminder, plus the opt-out and the "off until Pro is on sale" switch.
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import { after, before, beforeEach, describe, test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { setDbForTests } from '../../lib/db';
import * as schema from '../../lib/db/schema';
import {
  emailUnsubscribeToken,
  optOut,
  pickNudges,
  recordCheckoutIntent,
  renderLifecycleEmail,
  runLifecycleEmails,
  verifyEmailUnsubscribe,
} from '../../lib/server/lifecycle-mail';
import { setMailerForTests, type OutgoingMail } from '../../lib/server/mailer';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const NOW = new Date('2026-11-17T10:00:00Z');
const DAY = 86_400_000;
const HOUR = 3_600_000;
const ago = (ms: number) => new Date(NOW.getTime() - ms);

const BILLING_ENV = {
  DATABASE_URL: 'postgres://pglite.invalid/test',
  BETTER_AUTH_SECRET: 'test-secret-test-secret-test-secret-123456',
  BETTER_AUTH_URL: 'https://web3lens.com',
  GOOGLE_CLIENT_ID: 'test-client',
  GOOGLE_CLIENT_SECRET: 'test-client-secret',
  PADDLE_WEBHOOK_SECRET: 'whsec_test',
  NEXT_PUBLIC_PADDLE_PRICE_MONTHLY: 'pri_m',
  NEXT_PUBLIC_PADDLE_PRICE_YEARLY: 'pri_y',
  NEXT_PUBLIC_PADDLE_PRICE_LIFETIME: 'pri_l',
};
Object.assign(process.env, BILLING_ENV);

let pg: PGlite;
let db: ReturnType<typeof drizzle<typeof schema>>;
const sent: OutgoingMail[] = [];

before(async () => {
  pg = new PGlite();
  db = drizzle(pg, { schema });
  await migrate(db, { migrationsFolder: path.join(ROOT, 'drizzle') });
  setDbForTests(db);
});
after(async () => {
  setDbForTests(null);
  setMailerForTests(undefined);
  await pg.close();
});
beforeEach(async () => {
  sent.length = 0;
  setMailerForTests({ sendMail: async (m) => void sent.push(m) });
  Object.assign(process.env, BILLING_ENV);
  delete process.env.ADMIN_EMAILS;
  await db.execute(sql`truncate "user", subscriptions, trial_claims, lifecycle_emails, checkout_intents, email_opt_outs, user_profiles cascade`);
});

async function makeUser(id: string, ageDays: number, over: Partial<{ verified: boolean }> = {}) {
  const createdAt = ago(ageDays * DAY);
  await db.insert(schema.user).values({ id, name: `${id} Person`, email: `${id}@example.com`, emailVerified: over.verified ?? true, createdAt, updatedAt: createdAt });
}

const kinds = () => sent.map((m) => `${m.to} ${m.subject}`).sort();

describe('lifecycle emails', () => {
  test('do nothing until Pro is on sale', async () => {
    delete process.env.NEXT_PUBLIC_PADDLE_PRICE_LIFETIME;
    await makeUser('free', 10);
    assert.deepEqual(await runLifecycleEmails({ now: NOW }), { skipped: 'billing_not_configured' });
    assert.equal(sent.length, 0);
  });

  test('skip cleanly without SMTP', async () => {
    setMailerForTests(null);
    await makeUser('free', 10);
    assert.deepEqual(await runLifecycleEmails({ now: NOW }), { skipped: 'smtp_not_configured' });
  });

  test('nudge free accounts 3–180 days old, once in 30 days; never during a trial, never paid or opted out', async () => {
    await makeUser('free', 10);
    await makeUser('young', 1);
    await makeUser('old', 200);
    await makeUser('unverified', 10, { verified: false });
    await makeUser('trial', 10);
    await db.insert(schema.trialClaims).values({ email: 'trial@example.com', userId: 'trial', startedAt: ago(2 * DAY), endsAt: new Date(NOW.getTime() + 5 * DAY) });
    await makeUser('paid', 10);
    await db.insert(schema.subscriptions).values({ id: 'sub_1', userId: 'paid', plan: 'yearly', status: 'active', endsAt: new Date(NOW.getTime() + 300 * DAY), paddleUpdatedAt: NOW });
    await makeUser('forcedfree', 10);
    await db.insert(schema.userProfiles).values({ userId: 'forcedfree', planOverride: 'free' });
    await makeUser('optout', 10);
    await optOut('optout');
    await makeUser('admin', 10);
    process.env.ADMIN_EMAILS = 'admin@example.com';

    const run = await runLifecycleEmails({ now: NOW });
    assert.ok(!('skipped' in run));
    assert.deepEqual(kinds(), ['free@example.com A few things Web3Lens Pro can do for you']);
    sent.length = 0;
    await runLifecycleEmails({ now: new Date(NOW.getTime() + DAY) });
    assert.equal(sent.length, 0, 'not again within 30 days');
  });

  test('a trial that just ended gets the trial-ended email first, once, even after an earlier nudge', async () => {
    await makeUser('ended', 9);
    await db.insert(schema.trialClaims).values({ email: 'ended@example.com', userId: 'ended', startedAt: ago(8 * DAY), endsAt: ago(DAY) });
    await db.insert(schema.lifecycleEmails).values({ userId: 'ended', email: 'ended@example.com', kind: 'nudge', status: 'sent', createdAt: ago(9 * DAY) });
    await runLifecycleEmails({ now: NOW });
    assert.deepEqual(kinds(), ['ended@example.com Your Web3Lens Pro trial has ended']);
    sent.length = 0;
    await runLifecycleEmails({ now: new Date(NOW.getTime() + DAY) });
    assert.equal(sent.length, 0);
  });

  test('remind once about a checkout prepared 2–36 hours ago, unless they paid; the nudge then waits', async () => {
    await makeUser('buyer', 1);
    await makeUser('payer', 1);
    await makeUser('fresh', 1);
    await db.insert(schema.checkoutIntents).values([
      { userId: 'buyer', plan: 'lifetime', createdAt: ago(5 * HOUR) },
      { userId: 'payer', plan: 'monthly', createdAt: ago(5 * HOUR) },
      { userId: 'fresh', plan: 'monthly', createdAt: ago(HOUR) },
    ]);
    await db.insert(schema.subscriptions).values({ id: 'sub_p', userId: 'payer', plan: 'monthly', status: 'active', endsAt: new Date(NOW.getTime() + 20 * DAY), paddleUpdatedAt: NOW });
    await runLifecycleEmails({ now: NOW });
    assert.deepEqual(kinds(), ['buyer@example.com Your Web3Lens Pro checkout is still open']);
    assert.match(sent[0]!.text, /Web3Lens Pro Lifetime/);
    sent.length = 0;
    // Two days later the account is old enough for a nudge, but the reminder holds it for 3 days.
    const toBuyer = () => sent.filter((m) => m.to === 'buyer@example.com').map((m) => m.subject);
    await runLifecycleEmails({ now: new Date(NOW.getTime() + 2 * DAY) });
    assert.deepEqual(toBuyer(), []);
    await runLifecycleEmails({ now: new Date(NOW.getTime() + 4 * DAY) });
    assert.deepEqual(toBuyer(), ['A few things Web3Lens Pro can do for you']);
  });

  test('a failed send is logged and retried on the next run', async () => {
    await makeUser('free', 10);
    setMailerForTests({ sendMail: async () => Promise.reject(new Error('smtp down')) });
    const run = await runLifecycleEmails({ now: NOW });
    assert.ok(!('skipped' in run) && run.failed === 1);
    setMailerForTests({ sendMail: async (m) => void sent.push(m) });
    await runLifecycleEmails({ now: NOW });
    assert.equal(sent.length, 1);
  });

  test('dry run sends and records nothing', async () => {
    await makeUser('free', 10);
    const run = await runLifecycleEmails({ now: NOW, dryRun: true });
    assert.ok(!('skipped' in run) && run.nudges === 1);
    assert.equal(sent.length, 0);
    assert.equal((await db.select().from(schema.lifecycleEmails)).length, 0);
  });

  test('checkout intents are recorded best effort and never throw', async () => {
    await makeUser('u', 1);
    await recordCheckoutIntent('u', 'yearly');
    await recordCheckoutIntent('no-such-user', 'yearly');
    assert.equal((await db.select().from(schema.checkoutIntents)).length, 1);
  });
});

describe('unsubscribe and copy', () => {
  test('unsubscribe tokens are signed per user', () => {
    const t = emailUnsubscribeToken('abc123XYZ');
    assert.equal(verifyEmailUnsubscribe(t), 'abc123XYZ');
    assert.equal(verifyEmailUnsubscribe(t.replace('abc123XYZ', 'zzz123XYZ')), null);
    assert.equal(verifyEmailUnsubscribe('nope'), null);
  });

  test('every email has a one-click unsubscribe, escapes the name and tags the link', () => {
    for (const kind of ['nudge', 'trial_ended', 'checkout_recovery'] as const) {
      const m = renderLifecycleEmail({ userId: 'u1', email: 'a@example.com', name: '<img src=x> Ada', kind, plan: 'yearly' }, 'https://web3lens.com');
      assert.match(m.headers!['List-Unsubscribe']!, /^<https:\/\/web3lens\.com\/api\/email\/unsubscribe\?t=/);
      assert.ok(!m.html.includes('<img src=x>'));
      assert.match(m.text, new RegExp(`utm_campaign=${kind === 'nudge' ? 'still_on_free' : kind}`));
    }
  });

  test('pickNudges is pure: a forced-Free override is never a lead', () => {
    const users = [{ id: 'a', email: 'a@x.y', name: 'A', emailVerified: true, createdAt: ago(10 * DAY) }];
    assert.equal(pickNudges(users, new Map([['a', { plan: 'free', source: 'admin', trialEndsAt: null }]]), [], NOW.getTime()).length, 0);
    assert.equal(pickNudges(users, new Map([['a', { plan: 'free', source: 'none', trialEndsAt: null }]]), [], NOW.getTime()).length, 1);
  });
});
