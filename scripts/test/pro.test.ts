/**
 * Phase 2 (Pro features) against a real Postgres (PGlite): batch balances limits and quota, cloud sync and its
 * merge rules, collections, investigations, API keys on /api/v1, ownership between users.
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
import type { MultichainResult } from '../../lib/lookup-types';

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
  await db.execute(sql`truncate "user", subscriptions, usage_counters, trial_claims cascade`);
  const { clearApiKeyCache } = await import('../../lib/server/api-keys');
  clearApiKeyCache();
}

async function makeUser(id: string, pro = false) {
  await db.insert(schema.user).values({ id, name: id, email: `${id}@example.com`, emailVerified: true });
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
const addr = (i: number) => `0x${i.toString(16).padStart(40, '0')}`;

/* ---------------------------------------------------------------- pure */

describe('saved items: caps and merge (pure)', async () => {
  const { applyUpsert, mergeImport, sanitizeSaved } = await import('../../lib/saved');
  const { mergeSaved, toCloud } = await import('../../lib/saved-sync');
  const item = (q: string, at: number) => sanitizeSaved([{ query: q, chainId: 'ethereum', addedAt: at, updatedAt: at }])[0]!;

  test('cap blocks new items only; existing items stay editable and are never cut', () => {
    const list = Array.from({ length: 60 }, (_, i) => item(addr(i), i));
    assert.equal(sanitizeSaved(list).length, 60, 'storage keeps everything over a plan cap');
    assert.equal(applyUpsert(list, { query: addr(999), chainId: 'ethereum' }, 50).result, 'limit');
    const edit = applyUpsert(list, { query: addr(3), chainId: 'ethereum', label: 'x' }, 50);
    assert.equal(edit.result, 'updated');
    assert.equal(edit.list.length, 60);
    assert.equal(applyUpsert(list, { query: addr(999), chainId: 'ethereum' }, 2000).result, 'added');
    const imp = mergeImport(list.slice(0, 45), [item(addr(100), 1), ...Array.from({ length: 9 }, (_, i) => item(addr(200 + i), 1)), item(addr(1), 1)], 50);
    assert.deepEqual([imp.list.length, imp.imported, imp.skipped], [50, 6, 5]);
  });

  test('merge: newest wins, deletions travel, offline-empty answers delete nothing', () => {
    const a = item(addr(1), 100);
    const b = item(addr(2), 100);
    // Server empty (first sync or failed read): everything is pushed, nothing removed.
    const first = mergeSaved([a, b], [], []);
    assert.deepEqual([first.items.length, first.push.length, first.changed], [2, 2, false]);
    // Remote edit newer → taken; local newer → pushed.
    const remoteA = { ...toCloud(a), label: 'remote', updatedAt: 200 };
    const remoteB = { ...toCloud(b), label: 'old', updatedAt: 50 };
    const m = mergeSaved([a, b], [], [remoteA, remoteB]);
    assert.equal(m.items.find((x) => x.id === a.id)?.label, 'remote');
    assert.deepEqual(m.push.map((p) => p.key), [b.id]);
    // Deleted elsewhere after our last edit → removed here (remembered as a tombstone).
    const del = mergeSaved([a], [], [{ ...toCloud(a), updatedAt: 300, deletedAt: 300 }]);
    assert.deepEqual([del.items.length, del.tombstones[0]?.id], [0, a.id]);
    // Deleted elsewhere before our newer edit → kept and pushed back.
    const keep = mergeSaved([{ ...a, updatedAt: 400 }], [], [{ ...toCloud(a), updatedAt: 300, deletedAt: 300 }]);
    assert.deepEqual([keep.items.length, keep.push.length], [1, 1]);
    // Deleted here → pushed as a deletion; a remote item deleted here earlier doesn't come back.
    const local = mergeSaved([], [{ id: a.id, deletedAt: 500 }], [toCloud(a)]);
    assert.deepEqual([local.items.length, local.push[0]?.deletedAt], [0, 500]);
    // Added on another device → appears here.
    const added = mergeSaved([], [], [toCloud(b)]);
    assert.deepEqual([added.items.length, added.changed], [1, true]);
  });
});

/* ---------------------------------------------------------------- batch balances */

describe('batch balances', async () => {
  const route = await import('../../app/api/batch/balances/route');
  const { setBatchLookup } = await import('../../lib/server/batch-balances');
  let calls = 0;
  before(() =>
    setBatchLookup(async (address) => {
      calls++;
      return { address, rows: [], fetchedAt: Date.now() } as unknown as MultichainResult;
    }),
  );
  after(() => setBatchLookup(null));
  beforeEach(async () => {
    await reset();
    calls = 0;
  });
  const post = (n: number, init: { token?: string; ip?: string; origin?: string | null } = {}) =>
    route.POST(req('/api/batch/balances', { method: 'POST', token: init.token, origin: init.origin, body: { addresses: Array.from({ length: n }, (_, i) => addr(i + 1)) }, headers: { 'x-forwarded-for': init.ip ?? '10.0.0.1' } }));

  test('free: 5 rows per batch, 10 a day all-or-nothing; pro: 500', async () => {
    await makeUser('f');
    await makeUser('p', true);
    const f = await token('f');
    const p = await token('p');
    assert.equal((await post(6, { token: f })).status, 413);
    assert.equal(calls, 0, 'refused before any provider call');
    assert.equal((await post(5, { token: f })).status, 200);
    assert.equal((await post(5, { token: f })).status, 200);
    const over = await post(1, { token: f });
    assert.equal(over.status, 429);
    const body = await over.json();
    assert.deepEqual([body.upgrade, body.usage.used, body.usage.limit], [true, 10, 10]);
    assert.equal(calls, 10);
    const pro = await post(200, { token: p });
    assert.equal(pro.status, 200);
    assert.equal((await pro.json()).usage.used, 200);
  });

  test('anonymous callers are metered per IP against the Free limits', async () => {
    assert.equal((await post(5, { ip: '1.1.1.1' })).status, 200);
    assert.equal((await post(5, { ip: '1.1.1.1' })).status, 200);
    assert.equal((await post(1, { ip: '1.1.1.1' })).status, 429);
    assert.equal((await post(1, { ip: '2.2.2.2' })).status, 200, 'another IP has its own budget');
    const subjects = (await db.select().from(schema.usageCounters)).map((r) => r.subject);
    assert.ok(subjects.every((s) => s.startsWith('ip:') && !s.includes('1.1.1.1')), 'IPs are stored hashed');
  });

  test('concurrent batches never overshoot the daily quota', async () => {
    await makeUser('f');
    const f = await token('f');
    const results = await Promise.all(Array.from({ length: 20 }, () => post(1, { token: f })));
    assert.equal(results.filter((r) => r.status === 200).length, 10);
  });

  test('before Pro is on sale, everyone keeps the pre-Pro limits (50 rows, no daily meter)', async () => {
    const saved = process.env.PADDLE_WEBHOOK_SECRET;
    delete process.env.PADDLE_WEBHOOK_SECRET;
    try {
      await makeUser('f');
      const f = await token('f');
      assert.equal((await post(50, { token: f, ip: '3.3.3.3' })).status, 200);
      assert.equal((await post(51, { token: f, ip: '3.3.3.4' })).status, 413);
      assert.equal((await db.select().from(schema.usageCounters)).length, 0, 'nothing metered');
    } finally {
      process.env.PADDLE_WEBHOOK_SECRET = saved;
    }
  });

  test('other origins and bad input are refused', async () => {
    assert.equal((await post(1, { origin: 'https://evil.example' })).status, 403);
    const bad = await route.POST(req('/api/batch/balances', { method: 'POST', body: { addresses: ['not-an-address'] } }));
    assert.equal(bad.status, 400);
  });
});

/* ---------------------------------------------------------------- sync */

describe('cloud sync of saved items', async () => {
  const route = await import('../../app/api/sync/saved/route');
  const { toCloud } = await import('../../lib/saved-sync');
  const { sanitizeSaved } = await import('../../lib/saved');
  const { pushSaved } = await import('../../lib/server/pro-stores');
  beforeEach(reset);
  const cloud = (i: number, at = 1000, extra: Record<string, unknown> = {}) => ({ ...toCloud(sanitizeSaved([{ query: addr(i), chainId: 'ethereum', addedAt: at, updatedAt: at }])[0]!), ...extra });
  const push = (t: string, items: unknown[]) => route.POST(req('/api/sync/saved', { method: 'POST', token: t, body: { items } }));
  const pull = async (t: string, since?: string) => (await route.GET(req(`/api/sync/saved${since ? `?since=${encodeURIComponent(since)}` : ''}`, { token: t }))).json();

  test('Pro pushes and pulls; newest edit wins; deletions sync; cursor returns only changes', async () => {
    await makeUser('p', true);
    const t = await token('p');
    assert.equal((await (await push(t, [cloud(1), cloud(2)])).json()).written, 2);
    const all = await pull(t);
    assert.equal(all.items.length, 2);
    // An older write of item 1 is ignored; a newer one applies.
    await push(t, [cloud(1, 500, { label: 'stale' })]);
    await push(t, [cloud(1, 2000, { label: 'fresh' })]);
    const after1 = await pull(t, all.cursor);
    assert.deepEqual(after1.items.map((x: { label: string }) => x.label), ['fresh']);
    // Deletion travels as a tombstone.
    await push(t, [cloud(2, 3000, { deletedAt: 3000 })]);
    const after2 = await pull(t, after1.cursor);
    assert.equal(after2.items[0].deletedAt, 3000);
  });

  test('Free users can read but not write; another user never sees your items', async () => {
    await makeUser('p', true);
    await makeUser('f');
    await makeUser('other', true);
    const tp = await token('p');
    await push(tp, [cloud(1)]);
    const tf = await token('f');
    const r = await push(tf, [cloud(1)]);
    assert.equal(r.status, 402);
    assert.deepEqual((await pull(tf)).items, []);
    assert.deepEqual((await pull(await token('other'))).items, [], 'isolated per user');
    // Downgrade: reads still work.
    await db.delete(schema.subscriptions).where(eq(schema.subscriptions.userId, 'p'));
    assert.equal((await pull(tp)).items.length, 1);
    assert.equal((await push(tp, [cloud(2)])).status, 402);
  });

  test('the cloud cap refuses new items but always accepts edits and deletions', async () => {
    await makeUser('p', true);
    const items = Array.from({ length: 5 }, (_, i) => cloud(i));
    assert.deepEqual(await pushSaved('p', items, 3), { written: 3, refused: 2 });
    const edits = (await db.select().from(schema.savedItems)).map((r) => ({ ...cloud(0), key: r.itemKey, query: r.query, updatedAt: 9000, label: 'edited' }));
    assert.equal((await pushSaved('p', [...edits, cloud(10)], 3)).written, 3);
  });

  test('malformed items are dropped, not stored', async () => {
    await makeUser('p', true);
    const r = await (await push(await token('p'), [cloud(1), { key: 'x', query: '', updatedAt: 1 }, { ...cloud(2), key: 'forged' }])).json();
    assert.deepEqual([r.written, r.rejected], [1, 2]);
  });
});

/* ---------------------------------------------------------------- collections & investigations */

describe('collections and investigations', async () => {
  const cols = await import('../../app/api/collections/route');
  const col = await import('../../app/api/collections/[id]/route');
  const invs = await import('../../app/api/investigations/route');
  const inv = await import('../../app/api/investigations/[id]/route');
  beforeEach(reset);
  const p = (id: string) => ({ params: Promise.resolve({ id }) });

  test('collections: Pro only, owner only, names unique, deleting keeps saved items', async () => {
    await makeUser('a', true);
    await makeUser('b', true);
    await makeUser('f');
    const ta = await token('a');
    const tb = await token('b');
    assert.equal((await cols.POST(req('/api/collections', { method: 'POST', token: await token('f'), body: { name: 'x' } }))).status, 402);
    const created = await cols.POST(req('/api/collections', { method: 'POST', token: ta, body: { name: 'Exchanges' } }));
    assert.equal(created.status, 201);
    const { id } = await created.json();
    assert.equal((await cols.POST(req('/api/collections', { method: 'POST', token: ta, body: { name: 'exchanges' } }))).status, 409);
    assert.equal((await col.PATCH(req(`/api/collections/${id}`, { method: 'PATCH', token: ta, body: { add: ['ethereum:0xabc', 'ethereum:0xdef'] } }), p(id))).status, 200);
    assert.equal((await col.PATCH(req(`/api/collections/${id}`, { method: 'PATCH', token: tb, body: { name: 'mine now' } }), p(id))).status, 404, 'foreign id');
    assert.equal((await col.DELETE(req(`/api/collections/${id}`, { method: 'DELETE', token: tb }), p(id))).status, 404);
    const list = await (await cols.GET(req('/api/collections', { token: ta }))).json();
    assert.deepEqual(list.collections[0].itemKeys.sort(), ['ethereum:0xabc', 'ethereum:0xdef']);
    assert.deepEqual((await (await cols.GET(req('/api/collections', { token: tb }))).json()).collections, []);
    for (let i = 0; i < 19; i++) await cols.POST(req('/api/collections', { method: 'POST', token: ta, body: { name: `c${i}` } }));
    assert.equal((await cols.POST(req('/api/collections', { method: 'POST', token: ta, body: { name: 'one too many' } }))).status, 409);
  });

  test('investigations: Pro saves up to 100, owner-scoped, sanitised', async () => {
    await makeUser('a', true);
    await makeUser('b', true);
    const ta = await token('a');
    const body = { investigation: { v: 1, t: 'Case 1', items: [{ q: addr(1), l: 'hot wallet', evil: '<script>' }] } };
    const r = await invs.POST(req('/api/investigations', { method: 'POST', token: ta, body }));
    assert.equal(r.status, 201);
    const { id } = await r.json();
    const got = await (await inv.GET(req(`/api/investigations/${id}`, { token: ta }), p(id))).json();
    assert.deepEqual(got.investigation.items[0], { q: addr(1), l: 'hot wallet' });
    assert.equal((await inv.GET(req(`/api/investigations/${id}`, { token: await token('b') }), p(id))).status, 404);
    assert.equal((await inv.GET(req('/api/investigations/not-a-uuid', { token: ta }), p('not-a-uuid'))).status, 404);
    for (let i = 0; i < 99; i++) await db.insert(schema.investigations).values({ userId: 'a', title: `x${i}`, body: body.investigation });
    assert.equal((await invs.POST(req('/api/investigations', { method: 'POST', token: ta, body }))).status, 409);
    assert.equal((await inv.DELETE(req(`/api/investigations/${id}`, { method: 'DELETE', token: ta }), p(id))).status, 200);
  });
});

/* ---------------------------------------------------------------- API keys */

describe('API keys', async () => {
  const keys = await import('../../app/api/account/keys/route');
  const detect = await import('../../app/api/v1/detect/route');
  beforeEach(reset);
  const call = (key?: string, ip = '9.9.9.9') => detect.GET(new Request(`${SITE}/api/v1/detect?q=${addr(1)}`, { headers: { 'x-forwarded-for': ip, ...(key ? { 'x-api-key': key } : {}) } }));

  test('create once, stored hashed, never listed in full; revoke works at once', async () => {
    await makeUser('p', true);
    const t = await token('p');
    const created = await keys.POST(req('/api/account/keys', { method: 'POST', token: t, body: { name: 'CI' } }));
    assert.equal(created.status, 201);
    const { key, id } = await created.json();
    assert.match(key, /^w3l_[A-Za-z0-9]{8}_[A-Za-z0-9]{32}$/);
    const [row] = await db.select().from(schema.apiKeys);
    assert.notEqual(row?.keyHash, key);
    assert.ok(!JSON.stringify(await (await keys.GET(req('/api/account/keys', { token: t }))).json()).includes(key.split('_')[2]), 'secret never listed');
    const ok = await call(key);
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get('x-ratelimit-limit'), '1000');
    assert.equal(ok.headers.get('x-ratelimit-remaining'), '999');
    assert.equal(ok.headers.get('cache-control'), 'private, no-store');
    assert.equal((await keys.DELETE(req(`/api/account/keys?id=${id}`, { method: 'DELETE', token: t }))).status, 200);
    assert.equal((await call(key)).status, 401);
  });

  test('Free cannot create keys; a key stops when Pro ends; 1,000 a day across keys', async () => {
    await makeUser('f');
    assert.equal((await keys.POST(req('/api/account/keys', { method: 'POST', token: await token('f'), body: {} }))).status, 402);
    await makeUser('p', true);
    const t = await token('p');
    const { key } = await (await keys.POST(req('/api/account/keys', { method: 'POST', token: t, body: {} }))).json();
    const { key: key2 } = await (await keys.POST(req('/api/account/keys', { method: 'POST', token: t, body: {} }))).json();
    await db.insert(schema.usageCounters).values({ subject: 'u:p', metric: 'api', windowStart: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())), count: 999 });
    assert.equal((await call(key)).status, 200);
    const over = await call(key2);
    assert.equal(over.status, 429, 'the daily quota is per user, not per key');
    assert.equal(over.headers.get('x-ratelimit-remaining'), '0');
    const { clearApiKeyCache } = await import('../../lib/server/api-keys');
    await db.delete(schema.subscriptions).where(eq(schema.subscriptions.userId, 'p'));
    clearApiKeyCache();
    assert.equal((await call(key)).status, 402);
  });

  test('bad keys are 401; keyless calls behave as before; 5 active keys max', async () => {
    assert.equal((await call('w3l_nope')).status, 401);
    const plain = await call();
    assert.equal(plain.status, 200);
    assert.equal(plain.headers.get('x-ratelimit-limit'), null);
    assert.match(plain.headers.get('cache-control') ?? '', /public/);
    await makeUser('p', true);
    const t = await token('p');
    for (let i = 0; i < 5; i++) assert.equal((await keys.POST(req('/api/account/keys', { method: 'POST', token: t, body: {}, headers: { 'x-forwarded-for': `7.7.7.${i}` } }))).status, 201);
    assert.equal((await keys.POST(req('/api/account/keys', { method: 'POST', token: t, body: {}, headers: { 'x-forwarded-for': '7.7.7.9' } }))).status, 409);
  });
});
