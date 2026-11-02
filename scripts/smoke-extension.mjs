/**
 * Loads extension-chrome/ (identical code to Edge; Firefox shares the bundles) into Chromium with
 * Playwright and exercises the popup, the full-page app, the tools and the background worker.
 * Needs a local Playwright + Chromium (not a project dependency).
 *
 *   node scripts/smoke-extension.mjs [extension-dir]
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const dir = path.resolve(process.argv[2] ?? 'extension-chrome');
const userDir = fs.mkdtempSync(path.join(os.tmpdir(), 'w3l-ext-'));
const ctx = await chromium.launchPersistentContext(userDir, {
  channel: 'chromium',
  headless: true,
  args: [`--disable-extensions-except=${dir}`, `--load-extension=${dir}`],
});
const failures = [];
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` (${detail})` : ''}`);
  if (!ok) failures.push(name);
};
try {
  let [sw] = ctx.serviceWorkers();
  sw ??= await ctx.waitForEvent('serviceworker', { timeout: 15000 });
  const id = new URL(sw.url()).host;
  check('background service worker starts', Boolean(id), id);
  const errors = [];
  const open = async (p) => {
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`${p}: ${e.message}`));
    page.on('console', (m) => m.type() === 'error' && !/Failed to load resource|ERR_|Content Security Policy|fetch/i.test(m.text()) && errors.push(`${p}: ${m.text()}`));
    await page.goto(`chrome-extension://${id}/${p}`);
    return page;
  };

  // Popup: detection, checksum, secret refusal.
  const popup = await open('popup.html');
  await popup.fill('input.input', '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48');
  check('popup detects EVM address', (await popup.textContent('.detect')).includes('EVM address'));
  await popup.fill('input.input', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB4a');
  check('popup flags bad checksum', (await popup.textContent('.detect')).toLowerCase().includes('bad checksum'));
  await popup.fill('input.input', 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');
  check('popup refuses recovery phrase', (await popup.textContent('.detect')).includes('recovery phrase'));
  await popup.fill('input.input', 'bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?amount=1');
  check('popup unwraps payment URI', (await popup.inputValue('input.input')) === '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
  const selected = await popup.$eval('select.select', (s) => s.value);
  check('popup auto-selects chain', selected === 'bitcoin', selected);

  // Explorer handoff opens the right page type in a new tab.
  const [tab] = await Promise.all([ctx.waitForEvent('page'), popup.click('text=Open in explorer ↗')]);
  await tab.waitForLoadState('commit').catch(() => {});
  check('explorer handoff uses per-type route', tab.url().startsWith('https://mempool.space/address/1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'), tab.url());
  await tab.close();

  // Saved + recent persist in storage.local.
  await popup.click('text=Save');
  const app = await open('app.html#saved');
  await app.waitForSelector('.saved-item', { timeout: 5000 });
  check('saved item stored and listed', (await app.textContent('.list')).includes('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'));

  // Tools.
  await app.goto(`chrome-extension://${id}/app.html#tools/unit-converter`);
  await app.waitForSelector('.output');
  check('unit converter', (await app.textContent('.outputs')).includes('1000000000000000000'));
  await app.goto(`chrome-extension://${id}/app.html#tools/hex-converter`);
  await app.waitForSelector('.output');
  check('hex + keccak selector', (await app.textContent('main')).includes('0xa9059cbb'));
  await app.goto(`chrome-extension://${id}/app.html#tools/transaction-decoder`);
  const fixtures = JSON.parse(fs.readFileSync(path.resolve('scripts/test/fixtures/raw-txs.json'), 'utf8'));
  await app.fill('textarea', fixtures[0].raw);
  await app.waitForSelector('.output');
  check('raw tx decoder recovers sender', (await app.textContent('main')).toLowerCase().includes(fixtures[0].from));
  await app.goto(`chrome-extension://${id}/app.html#tools/address-validator`);
  await app.fill('input.input', '0x098B716B8Aaf21512996dC57EB0615e2383E2f96');
  check('validator shows OFAC listing (local snapshot)', (await app.textContent('main')).includes('OFAC listed'));
  await app.goto(`chrome-extension://${id}/app.html#tools/abi-decoder`);
  await app.fill('textarea', '0xa9059cbb000000000000000000000000000000000000000000000000000000000000dead00000000000000000000000000000000000000000000000000000000000003e8');
  check('calldata decoder', (await app.textContent('main')).includes('transfer(address,uint256)'));

  // Batch.
  await app.goto(`chrome-extension://${id}/app.html#batch?q=${encodeURIComponent('vitalik.eth\n1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa\nnonsense')}`);
  await app.click('text=Check all');
  check('batch table', (await app.textContent('table')).includes('ENS name') && (await app.textContent('table')).includes('not recognised'));

  // Settings page renders as the options page.
  const options = await open('options.html');
  check('options page', (await options.textContent('main')).includes('Online lookups'));

  // Native lookups degrade cleanly when the API is unreachable (no deployment yet / offline).
  await app.goto(`chrome-extension://${id}/app.html#result/address/ethereum/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`);
  await app.waitForSelector('.error, .card h2', { timeout: 20000 });
  const text = await app.textContent('main');
  check('result view renders data or a clear error', /Balance|could not be reached|lookup service is unavailable|Too many/.test(text), text.slice(0, 120).replace(/\s+/g, ' '));

  check('no uncaught page errors', errors.length === 0, errors.join(' | '));
} finally {
  await ctx.close();
  fs.rmSync(userDir, { recursive: true, force: true });
}
if (failures.length) {
  console.error(`\n${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('\nExtension smoke test passed');
