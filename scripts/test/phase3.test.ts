/**
 * Phase 3 against a real Postgres (PGlite): watch diffs, the watchlist API, the cron (alerts, errors, Pro-only,
 * emails, unsubscribe links), alerts and the admin tools.
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import { after, before, beforeEach, describe, test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { eq, sql } from 'drizzle-orm';
import * as schema from '../../lib/db/schema';
import { setDbForTests } from '../../lib/db';
import type { Snapshot } from '../../lib/server/watch';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
Object.assign(process.env, {
  DATABASE_URL: 'postgres://pglite.invalid/test',
  BETTER_AUTH_SECRET: 'test-secret-test-secret-test-secret-123456',
  BETTER_AUTH_URL: 'https://web3lens.com',
  GOOGLE_CLIENT_ID: 'test-client',
  GOOGLE_CLIENT_SECRET: 'test-client-secret',
  PADDLE_WEBHOOK_SECRET: 'whsec_test',
  NEXT_PUBLIC_PADDLE_PRICE_MONTHLY: 'pri_m',
  NEXT_PUBLIC_PADDLE_PRICE_YEARLY: 'pri_y',
  NEXT_PUBLIC_PADDLE_PRICE_LIFETIME: 'pri_l',
  CRON_SECRET: 'cron-secret-123',
  ADMIN_EMAILS: 'boss@example.com',
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

const reset = () => db.execute(sql`truncate "user", subscriptions, usage_counters, admin_actions cascade`);
async function makeUser(id: string, pro = false, email = `${id}@example.com`) {
  await db.insert(schema.user).values({ id, name: id, email, emailVerified: true });
  if (pro) await db.insert(schema.subscriptions).values({ id: `sub_${id}`, userId: id, plan: 'monthly', status: 'active', endsAt: new Date(Date.now() + 30 * 864e5), paddleUpdatedAt: new Date() });
}
async function token(userId: string) {
  const { getAuth } = await import('../../lib/server/auth');
  return (await (await getAuth()!.$context).internalAdapter.createSession(userId, false)).token;
}
const SITE = 'https://web3lens.com';
const req = (url: string, init: { method?: string; token?: string; body?: unknown; origin?: string | null; headers?: Record<string, string> } = {}) => {
  const headers: Record<string, string> = { ...init.headers };
  if (init.origin !== null) headers.origin = init.origin ?? SITE;
  if (init.token) headers.authorization = `Bearer ${init.token}`;
  if (init.body !== undefined) headers['content-type'] = 'application/json';
  return new Request(`${SITE}${url}`, { method: init.method ?? 'GET', headers, body: init.body === undefined ? undefined : JSON.stringify(init.body) });
};
const ADDR = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const p = (id: string) => ({ params: Promise.resolve({ id }) });

describe('watch diffs (pure)', async () => {
  const { diffWatch } = await import('../../lib/server/watch');
  const snap = (count: number, balance: string): Snapshot => ({ count, balance, source: 'test', fetchedAt: 0 });
  test('EVM: baseline, sent, received, other balance moves, nothing', () => {
    assert.equal(diffWatch('evm', { count: null, balance: null }, snap(5, '100')), null, 'first check is a baseline');
    assert.equal(diffWatch('evm', { count: 5, balance: '100' }, snap(6, '90')), 'sent');
    assert.equal(diffWatch('evm', { count: 5, balance: '100' }, snap(5, '150')), 'received');
    assert.equal(diffWatch('evm', { count: 5, balance: '100' }, snap(5, '80')), 'balance_changed');
    assert.equal(diffWatch('evm', { count: 5, balance: '100' }, snap(5, '100')), null);
  });
  test('UTXO: direction from the balance', () => {
    assert.equal(diffWatch('utxo', { count: 3, balance: '1000' }, snap(4, '1500')), 'received');
    assert.equal(diffWatch('utxo', { count: 3, balance: '1000' }, snap(4, '200')), 'sent');
    assert.equal(diffWatch('utxo', { count: 3, balance: '1000' }, snap(5, '1000')), 'balance_changed');
    assert.equal(diffWatch('utxo', { count: 3, balance: '1000' }, snap(3, '1000')), null);
  });
});

describe('watchlist API and cron', async () => {
  const watches = await import('../../app/api/watches/route');
  const watch = await import('../../app/api/watches/[id]/route');
  const cron = await import('../../app/api/cron/watches/route');
  const unsub = await import('../../app/api/watches/unsubscribe/route');
  const alertsRoute = await import('../../app/api/alerts/route');
  const { setWatchFetcher, unsubscribeToken } = await import('../../lib/server/watch');
  const { setMailTransport } = await import('../../lib/server/alert-mail');
  const { pruneAlerts } = await import('../../lib/server/watch-store');

  let state = new Map<string, Snapshot | Error>();
  const mails: { to: string; subject: string; text: string }[] = [];
  before(() => {
    setWatchFetcher(async (chainId, address) => {
      const s = state.get(`${chainId}:${address.toLowerCase()}`);
      if (!s) throw new Error('no fixture');
      if (s instanceof Error) throw s;
      return s;
    });
    setMailTransport({ sendMail: async (m) => void mails.push(m) });
  });
  after(() => {
    setWatchFetcher(null);
    setMailTransport(null);
  });
  beforeEach(async () => {
    await reset();
    state = new Map();
    mails.length = 0;
  });
  const set = (balance: string, count: number, chain = 'ethereum', a = ADDR) => state.set(`${chain}:${a.toLowerCase()}`, { count, balance, source: 'fixture-rpc', fetchedAt: Date.now() });
  const runCron = (secret = 'cron-secret-123') => cron.GET(new Request(`${SITE}/api/cron/watches`, { headers: secret ? { authorization: `Bearer ${secret}` } : {} }));
  const dueNow = () => db.update(schema.watches).set({ nextCheckAt: new Date(Date.now() - 1000) });

  test('Pro only, validated, owner-scoped, one per address and chain', async () => {
    await makeUser('f');
    await makeUser('a', true);
    await makeUser('b', true);
    const ta = await token('a');
    assert.equal((await watches.POST(req('/api/watches', { method: 'POST', token: await token('f'), body: { chainId: 'ethereum', address: ADDR } }))).status, 402);
    assert.equal((await watches.POST(req('/api/watches', { method: 'POST', token: ta, body: { chainId: 'solana', address: ADDR } }))).status, 400);
    assert.equal((await watches.POST(req('/api/watches', { method: 'POST', token: ta, body: { chainId: 'ethereum', address: '0x123' } }))).status, 400);
    const r = await watches.POST(req('/api/watches', { method: 'POST', token: ta, body: { chainId: 'ethereum', address: ADDR, label: 'vb' } }));
    assert.equal(r.status, 201);
    const { id } = await r.json();
    assert.equal((await watches.POST(req('/api/watches', { method: 'POST', token: ta, body: { chainId: 'ethereum', address: ADDR.toLowerCase() } }))).status, 409);
    const tb = await token('b');
    assert.deepEqual((await (await watches.GET(req('/api/watches', { token: tb }))).json()).watches, []);
    assert.equal((await watch.DELETE(req(`/api/watches/${id}`, { method: 'DELETE', token: tb }), p(id))).status, 404);
    assert.equal((await watch.PATCH(req(`/api/watches/${id}`, { method: 'PATCH', token: ta, body: { notifyEmail: false } }), p(id))).status, 200);
  });

  test('cap of 50', async () => {
    await makeUser('a', true);
    for (let i = 0; i < 50; i++) await db.insert(schema.watches).values({ userId: 'a', chainId: 'ethereum', address: `0x${i.toString(16).padStart(40, '0')}` });
    assert.equal((await watches.POST(req('/api/watches', { method: 'POST', token: await token('a'), body: { chainId: 'base', address: ADDR } }))).status, 409);
  });

  test('cron: secret required; baseline, then alerts, emails with unsubscribe; errors never alert', async () => {
    assert.equal((await runCron('')).status, 401);
    assert.equal((await runCron('wrong-secret-xx')).status, 401);
    await makeUser('a', true);
    const ta = await token('a');
    const { id } = await (await watches.POST(req('/api/watches', { method: 'POST', token: ta, body: { chainId: 'ethereum', address: ADDR, label: 'Treasury' } }))).json();
    set('1000000000000000000', 7);
    assert.equal((await (await runCron()).json()).checks.alerts, 0, 'baseline only');
    set('2000000000000000000', 7);
    await dueNow();
    const run = await (await runCron()).json();
    assert.equal(run.checks.alerts, 1);
    assert.equal(run.mail.sent, 1);
    assert.equal(mails[0]!.to, 'a@example.com');
    assert.match(mails[0]!.subject, /Treasury/);
    assert.match(mails[0]!.text, /Received funds on Ethereum \(\+1 ETH\)/);
    const list = await (await alertsRoute.GET(req('/api/alerts', { token: ta }))).json();
    assert.deepEqual([list.unread, list.alerts[0].kind], [1, 'received']);
    // Provider down: no alert, error recorded.
    state.set(`ethereum:${ADDR.toLowerCase()}`, new Error('rpc down'));
    await dueNow();
    assert.equal((await (await runCron()).json()).checks.errors, 1);
    const w = (await (await watches.GET(req('/api/watches', { token: ta }))).json()).watches[0];
    assert.equal(w.lastError, 'rpc down');
    assert.equal((await (await alertsRoute.GET(req('/api/alerts', { token: ta }))).json()).alerts.length, 1);
    // Unsubscribe link from the email turns email off for that watch only; forged tokens don't.
    const link = mails[0]!.text.match(/unsubscribe\?t=([^\s]+)/)![1]!;
    assert.equal((await unsub.GET(new Request(`${SITE}/api/watches/unsubscribe?t=${link}`))).status, 200);
    assert.equal((await db.select().from(schema.watches).where(eq(schema.watches.id, id)))[0]?.notifyEmail, false);
    const forged = `${id}.${'A'.repeat(43)}`;
    assert.equal((await unsub.GET(new Request(`${SITE}/api/watches/unsubscribe?t=${encodeURIComponent(forged)}`))).status, 400);
    assert.notEqual(unsubscribeToken(id), unsubscribeToken('00000000-0000-0000-0000-000000000000'));
    // Mark read.
    await alertsRoute.POST(req('/api/alerts', { method: 'POST', token: ta, body: { read: 'all' } }));
    assert.equal((await (await alertsRoute.GET(req('/api/alerts', { token: ta }))).json()).unread, 0);
  });

  test('cron checks only Pro owners; a downgrade pauses without deleting', async () => {
    await makeUser('a', true);
    await db.insert(schema.watches).values({ userId: 'a', chainId: 'ethereum', address: ADDR, lastCount: 1, lastBalance: '5' });
    await db.delete(schema.subscriptions);
    set('9', 2);
    const run = await (await runCron()).json();
    assert.deepEqual([run.checks.checked, run.checks.skipped], [0, 1]);
    assert.equal((await db.select().from(schema.watches)).length, 1, 'kept');
  });

  test('alerts are pruned after 90 days', async () => {
    await makeUser('a', true);
    const [w] = await db.insert(schema.watches).values({ userId: 'a', chainId: 'ethereum', address: ADDR }).returning();
    await db.insert(schema.alerts).values([
      { userId: 'a', watchId: w!.id, kind: 'sent', detail: {}, createdAt: new Date(Date.now() - 91 * 864e5) },
      { userId: 'a', watchId: w!.id, kind: 'sent', detail: {}, createdAt: new Date() },
    ]);
    assert.equal(await pruneAlerts(), 1);
  });
});

describe('admin', async () => {
  const users = await import('../../app/api/admin/users/route');
  const user = await import('../../app/api/admin/users/[id]/route');
  const me = await import('../../app/api/me/route');
  const { currentUser } = await import('../../lib/server/session');
  beforeEach(reset);

  test('non-admins get 404; overrides change the plan; suspend ends sessions and blocks new ones; audited', async () => {
    await makeUser('boss', false, 'boss@example.com');
    await makeUser('joe');
    const tb = await token('boss');
    const tj = await token('joe');
    assert.equal((await users.GET(req('/api/admin/users?email=joe@example.com', { token: tj }))).status, 404);
    assert.equal((await user.POST(req('/api/admin/users/joe', { method: 'POST', token: tj, body: { action: 'suspend' } }), p('joe'))).status, 404);
    const found = await (await users.GET(req('/api/admin/users?email=JOE@example.com', { token: tb }))).json();
    assert.equal(found.plan.plan, 'free');
    assert.equal((await user.POST(req('/api/admin/users/joe', { method: 'POST', token: tb, body: { action: 'override', plan: 'pro', until: new Date(Date.now() + 864e5).toISOString() } }), p('joe'))).status, 200);
    assert.equal((await (await me.GET(req('/api/me', { token: tj }))).json()).plan, 'pro');
    assert.equal((await user.POST(req('/api/admin/users/joe', { method: 'POST', token: tb, body: { action: 'suspend' }, origin: 'https://evil.example' }), p('joe'))).status, 403);
    assert.equal((await user.POST(req('/api/admin/users/joe', { method: 'POST', token: tb, body: { action: 'suspend' } }), p('joe'))).status, 200);
    assert.equal(await currentUser(new Headers({ authorization: `Bearer ${tj}` })), null, 'sessions ended');
    await assert.rejects(token('joe'), 'suspended accounts cannot start sessions');
    await user.POST(req('/api/admin/users/joe', { method: 'POST', token: tb, body: { action: 'unsuspend' } }), p('joe'));
    assert.ok(await token('joe'));
    assert.equal((await user.POST(req('/api/admin/users/boss', { method: 'POST', token: tb, body: { action: 'suspend' } }), p('boss'))).status, 400);
    const audit = await db.select().from(schema.adminActions).where(eq(schema.adminActions.targetUserId, 'joe'));
    assert.deepEqual(audit.map((a) => a.action).sort(), ['override', 'suspend', 'unsuspend']);
  });
});
