/**
 * Browser smoke test of the account and Pro pages against a running site, with the account APIs mocked (no Neon,
 * Google or Paddle needed): each page renders for a signed-out visitor, a Free and a Pro account, in dark and light,
 * on a phone and a laptop, without page errors or horizontal overflow, and shows the key controls. Needs a local
 * Playwright + Chromium (not a project dependency).
 *
 *   npm run build && npm start   then, in another terminal:   node scripts/smoke-pro.mjs [base-url]
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const BASE = process.argv[2] ?? 'http://localhost:3000';

const LIMITS = {
  free: { batch: 10, batchBalances: 5, crossChainPerDay: 10, apiPerDay: 0, apiPerMinuteShared: 60, savedLocal: 50, savedCloud: 0, investigations: 0, exports: ['csv'], watches: 0 },
  pro: { batch: 500, batchBalances: 500, crossChainPerDay: 500, apiPerDay: 1000, apiPerMinuteShared: 60, savedLocal: 2000, savedCloud: 2000, investigations: 100, exports: ['csv', 'json'], watches: 50 },
};
const ADDR = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const me = (plan) =>
  plan === 'signedOut'
    ? { signedIn: false, accounts: true, billing: true }
    : {
        signedIn: true,
        accounts: true,
        billing: true,
        user: { id: 'u1', email: 'demo@example.com', name: 'Demo', image: null },
        plan,
        tier: plan === 'free' ? 'free' : 'pro',
        until: plan === 'free' ? null : '2026-12-10T00:00:00Z',
        source: plan === 'free' ? 'none' : 'paddle',
        renews: plan !== 'free',
        manageUrl: plan === 'free' ? null : 'https://example.com/manage',
        limits: LIMITS[plan === 'free' ? 'free' : 'pro'],
        usage: { crossChain: { used: 3, limit: plan === 'free' ? 10 : 500, resetsAt: '2026-11-12T00:00:00Z' }, api: { used: 0, limit: plan === 'free' ? 0 : 1000, resetsAt: '2026-11-12T00:00:00Z' } },
        trial: { status: plan === 'free' ? 'available' : 'used', endsAt: null },
        checkedAt: new Date().toISOString(),
      };
const multichain = (address) => ({
  address,
  fetchedAt: new Date().toISOString(),
  priceSource: { name: 'CoinGecko' },
  rows: [{ chain: { id: 'ethereum', name: 'Ethereum', symbol: 'ETH' }, status: 'ok', balance: '1.5', balanceWei: '1500000000000000000', nonce: 3, usd: 5000 }],
});
const saved = [{ id: `ethereum:${ADDR.toLowerCase()}`, query: ADDR, chainId: 'ethereum', label: 'Treasury', note: '', favourite: false, addedAt: 1, updatedAt: 1 }];

async function mock(page, plan) {
  await page.route('**/api/me', (r) => r.fulfill({ json: me(plan) }));
  await page.route('**/api/account/sessions', (r) => r.fulfill({ json: { sessions: [{ id: 's1', kind: 'web', createdAt: '2026-11-01T00:00:00Z', expiresAt: '2027-01-01T00:00:00Z', current: true }] } }));
  await page.route('**/api/account/keys', (r) => r.fulfill({ json: { keys: [], cap: 5 } }));
  await page.route('**/api/collections', (r) => r.fulfill({ json: { collections: [{ id: 'c1', name: 'Exchanges', itemKeys: [] }], cap: 20 } }));
  await page.route('**/api/sync/saved**', (r) => r.fulfill({ json: r.request().method() === 'GET' ? { items: [], cursor: null } : { written: 0, refused: 0 } }));
  await page.route('**/api/investigations', (r) => r.fulfill({ json: { investigations: [], cap: 100 } }));
  await page.route('**/api/watches', (r) => r.fulfill({ json: { watches: [{ id: 'w1', chainId: 'ethereum', address: ADDR, label: 'Treasury', notifyEmail: true, lastCheckedAt: null, lastError: null, balance: null, createdAt: '2026-11-01T00:00:00Z' }], cap: 50 } }));
  await page.route('**/api/alerts', (r) => r.fulfill({ json: { alerts: [], unread: 0 } }));
  await page.route('**/api/batch/balances', (r) => r.fulfill({ json: { results: JSON.parse(r.request().postData() ?? '{}').addresses.map((a) => ({ address: a, result: multichain(a), error: null })), usage: { used: 1, limit: 500 } } }));
}

/** [path, plan, text that must appear]. */
const CASES = [
  ['/pricing', 'signedOut', 'Free for everyone'],
  ['/pricing', 'pro', 'You have Pro'],
  ['/account', 'signedOut', 'Continue with Google'],
  ['/account', 'free', 'Start free trial'],
  ['/account', 'pro', 'Your Pro tools'],
  ['/batch', 'free', 'up to 10'],
  ['/batch', 'pro', 'up to 500'],
  ['/saved', 'pro', 'Sync now'],
  ['/investigate', 'pro', 'Your investigations'],
  ['/watchlist', 'free', 'See Pro'],
  ['/watchlist', 'pro', 'Watched addresses'],
  ['/portfolio', 'pro', 'Fetch balances'],
  ['/extension/connect?code=ABCD-EFGH', 'pro', 'ABCD-EFGH'],
];

const failures = [];
const browser = await chromium.launch();
for (const [path, plan, expect] of CASES) {
  for (const [width, theme] of [
    [390, 'light'],
    [1366, 'dark'],
  ]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.addInitScript(
      ([t, s]) => {
        localStorage.setItem('w3l:theme', JSON.stringify(t));
        localStorage.setItem('w3l:saved', JSON.stringify(s));
      },
      [theme, saved],
    );
    await mock(page, plan);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const res = await page.goto(BASE + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const text = (await page.textContent('main')) ?? '';
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const label = `${path} (${plan}, ${width}px ${theme})`;
    const problems = [];
    if (!res || res.status() !== 200) problems.push(`HTTP ${res?.status()}`);
    if (errors.length) problems.push(`page errors: ${errors.join('; ')}`);
    if (overflow > 1) problems.push(`horizontal overflow ${overflow}px`);
    if (!text.includes(expect)) problems.push(`missing "${expect}"`);
    console.log(`${problems.length ? 'FAIL' : 'ok  '} ${label}${problems.length ? `: ${problems.join(', ')}` : ''}`);
    if (problems.length) failures.push(label);
    await page.close();
  }
}

// /admin is a 404 for anyone not in ADMIN_EMAILS (here: everyone).
const admin = await browser.newPage();
const adminRes = await admin.goto(`${BASE}/admin`);
console.log(`${adminRes?.status() === 404 ? 'ok  ' : 'FAIL'} /admin is 404 for non-admins (${adminRes?.status()})`);
if (adminRes?.status() !== 404) failures.push('/admin');
await browser.close();

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('\nPro smoke test passed');
