/**
 * Install/uninstall lifecycle, the uninstall survey (validation, storage on PGlite, email fallback), the welcome
 * email and the public changelog.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { after, before, beforeEach, describe, test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { CHANGELOG } from '../../content/changelog';
import { setDbForTests } from '../../lib/db';
import * as schema from '../../lib/db/schema';
import { setMailerForTests, type OutgoingMail } from '../../lib/server/mailer';
import { recentUninstallFeedback, saveUninstallFeedback } from '../../lib/server/uninstall-store';
import { firstName, renderWelcomeEmail, sendWelcomeEmail } from '../../lib/server/welcome-mail';
import { normalizeBrowser, normalizeVersion, parseUninstallFeedback, UNINSTALL_FOLLOW_UPS, UNINSTALL_REASONS } from '../../lib/uninstall';

const ROOT = path.resolve(import.meta.dirname, '..', '..');

describe('extension lifecycle', () => {
  // lifecycle.ts imports the browser adapter, which needs a `chrome` global; give it a minimal one.
  const created: string[] = [];
  const store: Record<string, unknown> = {};
  let uninstallUrl = '';
  before(() => {
    (globalThis as Record<string, unknown>).chrome = {
      runtime: { getManifest: () => ({ version: '1.2.3', name: 'Web3Lens' }), setUninstallURL: async (u: string) => void (uninstallUrl = u) },
      storage: { local: { get: async (k: string[]) => Object.fromEntries(k.filter((x) => x in store).map((x) => [x, store[x]])), set: async (o: Record<string, unknown>) => void Object.assign(store, o) } },
      tabs: { create: async ({ url }: { url: string }) => void created.push(url) },
    };
  });

  test('builds anonymous welcome and uninstall URLs', async () => {
    const { browserFamily, uninstallUrl: build, welcomeUrl } = await import('../../extension-src/src/lifecycle');
    assert.equal(welcomeUrl(), 'https://web3lens.com/?welcome=true');
    assert.equal(build({ browser: 'chrome', version: '1.1.0' }), 'https://web3lens.com/uninstall?product=w3l&v=1.1.0&b=chrome');
    assert.equal(build({ browser: 'firefox' }), 'https://web3lens.com/uninstall?product=w3l&b=firefox');
    assert.equal(browserFamily('Mozilla/5.0 Chrome/130 Safari/537.36 Edg/130'), 'edge');
    assert.equal(browserFamily('Mozilla/5.0 Chrome/130 Safari/537.36 OPR/110'), 'opera');
    assert.equal(browserFamily('Mozilla/5.0 Chrome/130 Safari/537.36', true), 'brave');
    assert.equal(browserFamily('Mozilla/5.0 Gecko/20100101 Firefox/140.0'), 'firefox');
    assert.equal(browserFamily('Mozilla/5.0 Chrome/130 Safari/537.36'), 'chrome');
  });

  test('opens the welcome page on a fresh install only, and only once', async () => {
    const { maybeOpenWelcomePage, refreshUninstallUrl } = await import('../../extension-src/src/lifecycle');
    await maybeOpenWelcomePage({ reason: 'update' });
    await maybeOpenWelcomePage({ reason: 'chrome_update' });
    assert.deepEqual(created, []);
    await maybeOpenWelcomePage({ reason: 'install' });
    await maybeOpenWelcomePage({ reason: 'install' });
    assert.deepEqual(created, ['https://web3lens.com/?welcome=true']);
    await refreshUninstallUrl();
    assert.match(uninstallUrl, /^https:\/\/web3lens\.com\/uninstall\?product=w3l&v=1\.2\.3&b=[a-z]+$/);
  });

  test('the extension builds carry the lifecycle code and no new permission', () => {
    for (const dir of ['extension-chrome', 'extension-edge', 'extension-firefox']) {
      const bg = readFileSync(path.join(ROOT, dir, 'background.js'), 'utf8');
      assert.match(bg, /setUninstallURL/, `${dir} registers the uninstall survey`);
      assert.match(bg, /welcome/, `${dir} opens the welcome page`);
      const perms: string[] = JSON.parse(readFileSync(path.join(ROOT, dir, 'manifest.json'), 'utf8')).permissions ?? [];
      assert.ok(!perms.includes('tabs'), `${dir} needs no tabs permission`);
    }
  });
});

describe('uninstall survey validation', () => {
  test('every reason has a follow-up', () => {
    for (const r of UNINSTALL_REASONS) assert.ok(UNINSTALL_FOLLOW_UPS[r.id], r.id);
  });

  test('rejects unknown reasons and routes the answer to the right column', () => {
    assert.equal(parseUninstallFeedback({ reason: 'drop table' }).ok, false);
    assert.equal(parseUninstallFeedback(null).ok, false);
    const switched = parseUninstallFeedback({ reason: 'found_another', answer: '  Etherscan  ', version: '1.0.1', browser: 'edge' });
    assert.ok(switched.ok);
    assert.deepEqual(switched.value, { reason: 'found_another', details: null, competitor: 'Etherscan', version: '1.0.1', browser: 'edge', visitKey: null });
    const other = parseUninstallFeedback({ reason: 'other', answer: 'x'.repeat(900), browser: 'netscape', visitKey: 'not-a-uuid' });
    assert.ok(other.ok);
    assert.equal(other.value.details!.length, 500);
    assert.equal(other.value.competitor, null);
    assert.equal(other.value.browser, 'other');
    assert.equal(other.value.visitKey, null);
  });

  test('normalises query values', () => {
    assert.equal(normalizeVersion('1.1.0'), '1.1.0');
    assert.equal(normalizeVersion('1.1.0<script>'), null);
    assert.equal(normalizeBrowser('FIREFOX'), 'firefox');
    assert.equal(normalizeBrowser(['chrome']), 'other');
  });
});

describe('uninstall survey storage', () => {
  let pg: PGlite;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  const sent: OutgoingMail[] = [];
  const feedback = (over: Partial<Parameters<typeof saveUninstallFeedback>[0]> = {}) => ({
    reason: 'not_working' as const,
    details: 'Lookup failed',
    competitor: null,
    version: '1.1.0',
    browser: 'chrome' as const,
    visitKey: '6f1c1d5e-6a4b-4c7e-9a2b-0c1d2e3f4a5b',
    ...over,
  });

  before(async () => {
    pg = new PGlite();
    db = drizzle(pg, { schema });
    await migrate(db, { migrationsFolder: path.join(ROOT, 'drizzle') });
  });
  after(async () => {
    setDbForTests(null);
    setMailerForTests(undefined);
    delete process.env.DATABASE_URL;
    await pg.close();
  });
  beforeEach(async () => {
    sent.length = 0;
    setMailerForTests({ sendMail: async (m) => void sent.push(m) });
    await db.execute(sql`truncate uninstall_feedback`);
  });

  test('stores answers once per visit, with nothing personal', async () => {
    process.env.DATABASE_URL = 'postgres://pglite.invalid/test';
    setDbForTests(db);
    assert.equal(await saveUninstallFeedback(feedback()), 'saved');
    assert.equal(await saveUninstallFeedback(feedback()), 'saved');
    assert.equal(await saveUninstallFeedback(feedback({ visitKey: null })), 'saved');
    const rows = await recentUninstallFeedback();
    assert.equal(rows.length, 2);
    assert.deepEqual(Object.keys(rows[0]!).sort(), ['browser', 'competitor', 'createdAt', 'details', 'extensionVersion', 'id', 'reason', 'visitKey']);
    assert.equal(sent.length, 0);
  });

  test('without a database, answers are emailed to the owner; without SMTP too, nothing pretends to work', async () => {
    delete process.env.DATABASE_URL;
    setDbForTests(null);
    assert.equal(await saveUninstallFeedback(feedback({ details: '<b>broken</b>' })), 'emailed');
    assert.equal(sent.length, 1);
    assert.match(sent[0]!.subject, /Uninstall survey: Something wasn't working/);
    assert.ok(!sent[0]!.html.includes('<b>broken</b>'), 'answer is escaped');
    setMailerForTests(null);
    assert.equal(await saveUninstallFeedback(feedback()), 'unavailable');
    assert.deepEqual(await recentUninstallFeedback(), []);
  });
});

describe('welcome email', () => {
  test('greets by first name, links the site and never asks for secrets', () => {
    const m = renderWelcomeEmail({ email: 'a@example.com', name: 'Ada Lovelace' }, { base: 'https://web3lens.com', proOnSale: false });
    assert.equal(m.to, 'a@example.com');
    assert.equal(m.subject, 'Welcome to Web3Lens');
    assert.match(m.text, /^Hi Ada,/);
    assert.match(m.text, /https:\/\/web3lens\.com\/extension/);
    assert.match(m.text, /never asks for private keys/);
    assert.ok(!/Pro free/.test(m.text), 'no trial offer while Pro is not on sale');
    assert.match(renderWelcomeEmail({ email: 'a@example.com', name: null }, { proOnSale: true }).text, /^Hi,[\s\S]*Try Pro free for 7 days/);
    assert.equal(firstName('<script>\u0000 x'), '<script>');
    assert.ok(!renderWelcomeEmail({ email: 'a@example.com', name: '<img src=x>' }, { proOnSale: false }).html.includes('<img'), 'name is escaped');
  });

  test('is skipped without SMTP and never throws', async () => {
    setMailerForTests(null);
    assert.equal(await sendWelcomeEmail({ email: 'a@example.com', name: 'A' }), false);
    setMailerForTests({ sendMail: async () => Promise.reject(new Error('smtp down')) });
    assert.equal(await sendWelcomeEmail({ email: 'a@example.com', name: 'A' }), false);
    setMailerForTests(undefined);
  });
});

describe('changelog', () => {
  test('entries are dated, newest first, and non-empty', () => {
    assert.ok(CHANGELOG.length > 0);
    for (const [i, e] of CHANGELOG.entries()) {
      assert.match(e.date, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(e.title && e.items.length > 0, e.title);
      if (i > 0) assert.ok(CHANGELOG[i - 1]!.date >= e.date, `${e.title} is in date order`);
    }
  });
});
