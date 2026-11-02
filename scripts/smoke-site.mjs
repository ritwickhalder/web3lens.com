/**
 * Browser smoke test of a running site (default http://localhost:3000): every page renders without
 * page errors or horizontal overflow on a phone and a laptop, legacy URLs redirect, search works end
 * to end against live data, and basic load timings are reported. Needs a local Playwright + Chromium
 * (not a project dependency).
 *
 *   npm run build && npm start   then, in another terminal:   node scripts/smoke-site.mjs [base-url]
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const BASE = process.argv[2] ?? 'http://localhost:3000';
const PAGES = [
  '/',
  '/search',
  '/explorer',
  '/explorer/bitcoin',
  '/explorer/base',
  '/gas',
  '/tools',
  '/tools/unit-converter',
  '/tools/address-validator',
  '/tools/hex-converter',
  '/tools/timestamp-converter',
  '/tools/gas-calculator',
  '/tools/abi-decoder',
  '/tools/transaction-decoder',
  '/batch',
  '/saved',
  '/settings',
  '/investigate',
  '/extension',
  '/directory',
  '/blockchain-guide',
  '/about',
  '/contact',
  '/terms',
  '/privacy-policy',
  '/bookmark',
  '/site-map',
];
const failures = [];
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` (${detail})` : ''}`);
  if (!ok) failures.push(name);
};

const browser = await chromium.launch();
try {
  for (const [width, label] of [
    [390, 'phone'],
    [1024, 'laptop'],
    [1280, 'wide'],
    [1440, 'desktop'],
  ]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    for (const p of PAGES) {
      errors.length = 0;
      const res = await page.goto(BASE + p, { waitUntil: 'load' });
      await page.waitForTimeout(150);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      check(`${label} ${p}`, res?.status() === 200 && overflow <= 0 && errors.length === 0, `${res?.status()}${overflow > 0 ? `, overflows by ${overflow}px` : ''}${errors.length ? `, ${errors[0]}` : ''}`);
    }
    await page.close();
  }

  // Light theme: every page renders, and the stored choice applies before React loads (no dark flash).
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(() => localStorage.setItem('w3l:theme', '"light"'));
    const lp = await ctx.newPage();
    const errors = [];
    lp.on('pageerror', (e) => errors.push(e.message));
    for (const p of PAGES) {
      errors.length = 0;
      await lp.goto(BASE + p, { waitUntil: 'domcontentloaded' });
      const early = await lp.evaluate(() => document.documentElement.dataset.theme);
      await lp.waitForLoadState('load');
      const bg = await lp.evaluate(() => getComputedStyle(document.body).backgroundColor);
      check(`light ${p}`, early === 'light' && bg === 'rgb(245, 248, 251)' && errors.length === 0, `${early} ${bg}${errors.length ? `, ${errors[0]}` : ''}`);
    }
    await lp.goto(`${BASE}/`);
    await lp.getByRole('button', { name: /^Theme: Light/ }).click();
    check('theme toggle cycles to System', (await lp.evaluate(() => document.documentElement.dataset.theme)) === 'system');
    await ctx.close();
  }

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  for (const [from, to] of [
    ['/about.html', '/about'],
    ['/contact.php', '/contact'],
    ['/sitemap.html', '/site-map'],
  ]) {
    await page.goto(BASE + from);
    check(`legacy redirect ${from}`, new URL(page.url()).pathname === to, page.url());
  }
  const gsc = await page.goto(`${BASE}/google1db8a47adb37d2f9.html`);
  check('Search Console verification file', gsc?.status() === 200);
  const os = await page.request.get(`${BASE}/opensearch.xml`);
  check('OpenSearch descriptor', os.status() === 200 && (await os.text()).includes('{searchTerms}'));

  // Home: detection and the results-first search flow.
  await page.goto(`${BASE}/`);
  const nav = await page.evaluate(() => performance.getEntriesByType('navigation')[0].toJSON());
  console.log(`     home: DOMContentLoaded ${Math.round(nav.domContentLoadedEventEnd)} ms, load ${Math.round(nav.loadEventEnd)} ms`);
  const input = page.getByLabel('Address, transaction hash, block or name');
  await input.fill('vitalik.eth');
  check('home detects ENS', (await page.textContent('main')).includes('ENS name'));
  await input.fill('https://etherscan.io/tx/0xd3997379f69ff8ee644d46a06d41e6011aad26a3edceb63137178e549ff066aa');
  check('home unwraps explorer link', (await input.inputValue()).startsWith('0xd3997379'));
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.waitForURL(/\/search\?q=0xd399/, { timeout: 15000 }).catch(() => {});
  check('EVM tx without a chosen chain opens the cross-chain overview', page.url().includes('/search?q=0xd399'), page.url());
  await page.waitForSelector('text=Found on Ethereum', { timeout: 30000 }).catch(() => {});
  check('tx locator finds the chain (live)', (await page.textContent('main')).includes('Found on Ethereum'));
  await page.goto(`${BASE}/search?q=1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa&chain=bitcoin`);
  check('/search with a chain redirects to the native page', page.url().includes('/address/bitcoin/1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'));
  // The route streams: a loading skeleton first, then the data.
  await page.waitForSelector('text=Source:', { timeout: 30000 }).catch(() => {});
  check('native page shows a sourced balance (live)', (await page.textContent('main')).includes('Source:'));
  await page.waitForSelector('text=OFAC sanctions', { timeout: 30000 }).catch(() => {});
  const main = await page.textContent('main');
  check('risk panel loads and never says safe', main.includes('does not mean it is safe') || main.includes('risk signal'));

  await page.goto(`${BASE}/address/ethereum/jesse.base.eth`);
  check('off-chain ENS name resolves via CCIP-read (live)', (await page.textContent('main')).includes('jesse.base.eth resolves to this address'));

  // Every Blockscout-backed chain must actually return token data (a provider-side block once broke this silently).
  for (const chain of ['ethereum', 'base', 'arbitrum', 'optimism', 'polygon', 'zksync', 'scroll', 'gnosischain']) {
    const r = await page.request.get(`${BASE}/api/v1/address?chain=${chain}&q=0x0E678aCf9988e284f448C6224Ea36bb9E9d56803`, { timeout: 60000 });
    const body = await r.json().catch(() => ({}));
    check(`tokens section loads on ${chain} (live)`, body.tokens?.status === 'ok', body.tokens?.reason ?? String(r.status()));
  }

  await page.goto(`${BASE}/batch`);
  await page.fill('#batch-input', 'vitalik.eth\n0x098B716B8Aaf21512996dC57EB0615e2383E2f96');
  await page.click('text=Check all');
  check('batch flags the OFAC-listed address', (await page.textContent('table')).includes('OFAC listed'));
} finally {
  await browser.close();
}
if (failures.length) {
  console.error(`\n${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('\nSite smoke test passed');
