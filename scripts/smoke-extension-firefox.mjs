/**
 * Loads extension-firefox/ into a locally installed Firefox (fresh profile, temporary add-on) and
 * exercises the popup, the full-page app, the tools, offline mode and the background event page.
 * Talks Marionette directly (no Playwright or geckodriver needed). WebDriver navigation to
 * moz-extension:// pages is refused, so pages are loaded from the browser chrome, which needs
 * MOZ_REMOTE_ALLOW_SYSTEM_ACCESS in this throwaway profile only.
 *
 *   node scripts/smoke-extension-firefox.mjs [extension-dir]     (FIREFOX_BIN overrides the path)
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

const DIR = path.resolve(process.argv[2] ?? 'extension-firefox');
const FIREFOX =
  process.env.FIREFOX_BIN ??
  { win32: 'C:/Program Files/Mozilla Firefox/firefox.exe', darwin: '/Applications/Firefox.app/Contents/MacOS/firefox' }[process.platform] ??
  'firefox';
const UUID = '6f1c2b8e-1d2a-4f0b-9a55-3b7a1e0c9d11';
const base = `moz-extension://${UUID}`;
const PORT = 2829;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'w3l-ff-'));
fs.writeFileSync(
  path.join(profile, 'user.js'),
  [
    `user_pref("marionette.port", ${PORT});`,
    `user_pref("extensions.webextensions.uuids", ${JSON.stringify(JSON.stringify({ 'extension@web3lens.com': UUID }))});`,
    'user_pref("browser.shell.checkDefaultBrowser", false);',
    'user_pref("datareporting.policy.dataSubmissionEnabled", false);',
    'user_pref("browser.aboutwelcome.enabled", false);',
  ].join('\n'),
);
const ff = spawn(FIREFOX, ['--marionette', '--headless', '--no-remote', '-profile', profile], { stdio: 'ignore', env: { ...process.env, MOZ_REMOTE_ALLOW_SYSTEM_ACCESS: '1' } });

// Minimal Marionette client: "len:[0,id,cmd,params]" requests, "[1,id,error,result]" responses.
let sock;
let buf = Buffer.alloc(0);
let nextId = 1;
const pending = new Map();
let greeted;
const greeting = new Promise((r) => (greeted = r));
function onData(d) {
  buf = Buffer.concat([buf, d]);
  for (;;) {
    const colon = buf.indexOf(':');
    if (colon < 0) return;
    // The length prefix counts bytes, so frames are cut from the raw buffer.
    const len = Number(buf.subarray(0, colon).toString());
    if (buf.length < colon + 1 + len) return;
    const msg = JSON.parse(buf.subarray(colon + 1, colon + 1 + len).toString('utf8'));
    buf = buf.subarray(colon + 1 + len);
    if (!Array.isArray(msg)) greeted(msg);
    else {
      const [, id, err, res] = msg;
      const p = pending.get(id);
      pending.delete(id);
      err ? p.reject(new Error(`${err.error}: ${err.message}`)) : p.resolve(res);
    }
  }
}
function send(cmd, params = {}) {
  const id = nextId++;
  const body = Buffer.from(JSON.stringify([0, id, cmd, params]), 'utf8');
  sock.write(`${body.length}:`);
  sock.write(body);
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}
for (let i = 0; i < 60 && !sock; i++) {
  await new Promise((r) => setTimeout(r, 500));
  await new Promise((r) => {
    const s = net.connect(PORT, '127.0.0.1');
    s.once('connect', () => ((sock = s), s.on('data', onData), r()));
    s.once('error', () => r());
  });
}
await greeting;

const failures = [];
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` (${detail})` : ''}`);
  if (!ok) failures.push(name);
};
// Content-side navigation to moz-extension:// is refused, so load it from the browser chrome (like the address bar).
const go = async (p) => {
  await send('Marionette:SetContext', { value: 'chrome' });
  await send('WebDriver:ExecuteScript', {
    script: `const w = Services.wm.getMostRecentWindow('navigator:browser'); w.gBrowser.loadURI(Services.io.newURI(arguments[0]), { triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal() });`,
    args: [`${base}/${p}`],
  });
  await send('Marionette:SetContext', { value: 'content' });
  await new Promise((r) => setTimeout(r, 1200));
};
/** Runs `code` as an async function body in the page; returns its value. */
const js = async (code, ...args) =>
  (await send('WebDriver:ExecuteAsyncScript', { script: `const done = arguments[arguments.length-1]; (async (...a) => { ${code} })(...Array.from(arguments).slice(0,-1)).then(done, e => done({ __err: String(e && e.stack || e) }));`, args, scriptTimeout: 60000 })).value;
const PRE = `
  const $ = (s) => document.querySelector(s);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const until = async (f, ms = 40000) => { const t = Date.now(); while (Date.now() - t < ms) { if (f()) return true; await wait(250); } return false; };
  const fill = async (sel, v) => { const e = $(sel); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); await wait(150); };
  window.__errs = window.__errs || [];
`;
const errors = [];
const trackErrors = () => js(`window.addEventListener('error', e => (window.__errs ||= []).push(e.message)); window.addEventListener('unhandledrejection', e => (window.__errs ||= []).push(String(e.reason)));`);
const collectErrors = async (p) => {
  const e = await js('return window.__errs || []');
  for (const m of e ?? []) errors.push(`${p}: ${m}`);
};

try {
  const { capabilities } = await send('WebDriver:NewSession', { capabilities: {} });
  console.log(`Firefox ${capabilities?.browserVersion ?? '?'}`);
  const add = await send('Addon:Install', { path: DIR, temporary: true });
  check('installs as a temporary add-on', add.value === 'extension@web3lens.com', add.value);

  await go('popup.html');
  await send('WebDriver:SetWindowRect', { width: 720, height: 700 }).catch(() => {});
  await trackErrors();
  const p1 = await js(`${PRE}
    const out = {};
    await fill('.search-input', '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'); out.evm = $('.detect').textContent;
    await fill('.search-input', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB4a'); out.bad = $('.detect').textContent;
    await fill('.search-input', 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'); out.secret = $('.detect').textContent;
    await fill('.search-input', 'bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?amount=1'); out.uri = $('.search-input').value; out.chain = $('.picker-name').textContent;
    out.logos = document.querySelectorAll('.picker-glyph svg.glyph').length;
    out.bg = getComputedStyle(document.body).backgroundColor;
    out.fonts = [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family).join(',');
    document.querySelectorAll('.actions button')[1].click(); await wait(300);
    $('#tab-tools').click(); await wait(300); out.tools = $('.tool-pane').textContent;
    $('#tab-saved').click(); await wait(300); out.saved = $('.saved-list').textContent;
    $('#tab-gas').click(); await until(() => /fetched|error|unavailable|reached/.test($('.popup-main').textContent)); out.gas = $('.popup-main').textContent;
    $('#tab-lookup').click(); await wait(200);
    $('button[aria-label="Settings"]').click(); await wait(200); out.settings = $('dialog.modal').textContent; $('dialog.modal').close();
    $('button[aria-label="About, shortcuts and more tools"]').click(); await wait(200); out.info = $('dialog.modal').textContent; $('dialog.modal').close();
    await fill('.search-input', '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
    $('.chain-chip').click(); $('.search-btn').click();
    await until(() => /ETH|reached|unavailable|long/.test($('.results').textContent)); await wait(500); out.result = $('.results').textContent;
    return out;`);
  if (p1?.__err) throw new Error(p1.__err);
  check('popup detects EVM address', p1.evm.includes('EVM address'));
  check('popup flags bad checksum', p1.bad.toLowerCase().includes('bad checksum'));
  check('popup refuses recovery phrase', p1.secret.includes('recovery phrase'));
  check('popup unwraps payment URI and picks Bitcoin', p1.uri === '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa' && p1.chain === 'Bitcoin', `${p1.uri} ${p1.chain}`);
  check('coin logos render', p1.logos === 1);
  check('light theme by default', p1.bg === 'rgb(245, 248, 251)', p1.bg);
  check('bundled Manrope loads (no remote fonts)', /Manrope/.test(p1.fonts), p1.fonts);
  check('tools tab: unit converter', p1.tools.includes('1000000000000000000'));
  check('saved tab lists saved item', p1.saved.includes('Bitcoin'));
  check('gas tab: live data from web3lens.com', /Ethereum/.test(p1.gas) && /fetched/.test(p1.gas), p1.gas.replace(/\s+/g, ' ').slice(0, 100));
  check('settings dialog', p1.settings.includes('Online lookups'));
  check('info dialog', /Alt[\s\S]*SummaryTube/.test(p1.info));
  check('popup live lookup (Ethereum, vitalik)', /Balance/.test(p1.result) && /ETH/.test(p1.result), p1.result.replace(/\s+/g, ' ').slice(0, 120));
  await collectErrors('popup');

  const fx = JSON.parse(fs.readFileSync(path.resolve('scripts/test/fixtures/raw-txs.json'), 'utf8'));
  await go('app.html#saved');
  await trackErrors();
  check('saved page lists the item', (await js(`return document.querySelector('.list').textContent`)).includes('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'));
  await go('app.html#tools/hex-converter');
  check('hex + keccak selector', (await js(`return document.querySelector('main').textContent`)).includes('0xa9059cbb'));
  await go('app.html#tools/transaction-decoder');
  check('raw tx decoder recovers sender', (await js(`${PRE} await fill('textarea', arguments[0]); return $('main').textContent.toLowerCase()`, fx[0].raw)).includes(fx[0].from));
  await go('app.html#tools/address-validator');
  check('validator OFAC listing (local)', (await js(`${PRE} await fill('input.input', '0x098B716B8Aaf21512996dC57EB0615e2383E2f96'); return $('main').textContent`)).includes('OFAC listed'));
  await go(`app.html#batch?q=${encodeURIComponent('vitalik.eth\n1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa\nnonsense')}`);
  const batch = await js(`${PRE} [...document.querySelectorAll('button.btn')].find(b => b.textContent === 'Check all').click(); await wait(300); return $('table').textContent`);
  check('batch table', batch.includes('ENS name') && batch.includes('not recognised'));
  await go('app.html#result/address/ethereum/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
  await trackErrors();
  const full = await js(`${PRE} await until(() => /Risk checks/.test($('main').textContent) && /OFAC/.test($('main').textContent)); return $('main').textContent`);
  check('full result: live balance + risk checks', /Balance/.test(full) && /OFAC/.test(full), full.replace(/\s+/g, ' ').slice(0, 120));
  await collectErrors('app');

  await go('options.html');
  check('options page', (await js(`return document.querySelector('main').textContent`)).includes('Online lookups'));
  await js(`await browser.storage.local.set({ settings: { network: false, apiBase: 'https://web3lens.com', theme: 'dark' } })`);
  await go('app.html#result/address/ethereum/0x098B716B8Aaf21512996dC57EB0615e2383E2f96');
  const off = await js(`return [document.querySelector('main').textContent, getComputedStyle(document.body).backgroundColor]`);
  check('offline mode: no lookup, local OFAC still flags', /Online lookups are turned off/.test(off[0]) && /OFAC sanctions list/.test(off[0]));
  check('dark theme applies', off[1] === 'rgb(10, 21, 32)', off[1]);

  // Background event page: menus/omnibox registered without errors (checked from an extension page).
  const bgInfo = await js(`return { contextMenus: typeof browser.contextMenus?.create, omnibox: typeof browser.omnibox?.setDefaultSuggestion, bg: !!(await browser.runtime.getBackgroundPage?.()) }`).catch((e) => ({ err: String(e) }));
  check('background event page runs; menus and omnibox APIs present', bgInfo?.bg === true && bgInfo.contextMenus === 'function' && bgInfo.omnibox === 'function', JSON.stringify(bgInfo));
  check('no uncaught page errors', errors.length === 0, errors.join(' | '));
} catch (e) {
  check('run completed', false, e.stack);
} finally {
  await send('Marionette:Quit').catch(() => {});
  await new Promise((r) => setTimeout(r, 2000));
  ff.kill();
  fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
}
console.log(failures.length ? `\n${failures.length} check(s) failed` : '\nFirefox smoke test passed');
process.exit(failures.length ? 1 : 0);
