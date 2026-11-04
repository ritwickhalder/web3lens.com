/**
 * Store listing assets for Chrome Web Store, Edge Add-ons and Firefox AMO, captured from the real
 * extension (extension-chrome/) in Chromium and framed with a caption in the Web3Lens style.
 * Live lookups use https://web3lens.com, so balances in the shots are real at capture time.
 *
 *   node scripts/make-store-assets.mjs        (needs a local Playwright + Chromium)
 *
 * Writes store/screenshots/*.png (1280×800), store/promo/*.png (440×280, 1400×560) and
 * store/promo/logo-300.png.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(import.meta.dirname, '..');
const EXT = path.join(ROOT, 'extension-chrome');
const OUT = path.join(ROOT, 'store');
const FONTS = path.join(ROOT, 'extension-src', 'static', 'fonts');
fs.mkdirSync(path.join(OUT, 'screenshots'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'promo'), { recursive: true });

const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'test', 'fixtures', 'raw-txs.json'), 'utf8'));
const dataUrl = (buf) => `data:image/png;base64,${buf.toString('base64')}`;
const fontUrl = (f) => `data:font/woff2;base64,${fs.readFileSync(path.join(FONTS, f)).toString('base64')}`;
const LOGO = '<svg viewBox="0 0 32 32" fill="none" stroke="#4fd1ff" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="12.5" stroke-width="2"/><circle cx="16" cy="16" r="8.5" stroke-width="1" stroke-dasharray="2 2" opacity="0.6"/><path d="M16 1.5v4M16 26.5v4M1.5 16h4M26.5 16h4" stroke-width="1.75"/><path d="M16 11.5 20 13.75v4.5L16 20.5l-4-2.25v-4.5z" stroke-width="1.75" stroke-linejoin="round"/><path d="M16 16v4.5M16 16l4-2.25M16 16l-4-2.25" stroke-width="1.1" stroke-linejoin="round"/></svg>';

const frameCss = `
@font-face { font-family: Manrope; src: url(${fontUrl('manrope-latin.woff2')}) format('woff2'); font-weight: 400 800; }
* { box-sizing: border-box; margin: 0; }
body { width: var(--w); height: var(--h); overflow: hidden; background: #0a1520; color: #f1f6fb; font-family: Manrope, sans-serif;
  background-image: radial-gradient(rgb(79 209 255 / 0.12) 1px, transparent 1.2px); background-size: 28px 28px; }
.brand { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 22px; letter-spacing: -0.02em; }
.brand svg { width: 34px; height: 34px; }
.accent { color: #4fd1ff; }
.label { font-size: 13px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; color: #4fd1ff; }
h1 { font-size: 46px; line-height: 1.05; letter-spacing: -0.035em; font-weight: 800; }
p.lead { color: #a9bccf; font-size: 19px; font-weight: 600; line-height: 1.45; }
.shot { border: 1px solid #2a4a66; border-radius: 16px; box-shadow: 0 30px 80px -30px rgb(0 0 0 / 0.9); display: block; }
.marks { position: relative; }
.marks::before, .marks::after { content: ''; position: absolute; width: 18px; height: 18px; border-color: #4fd1ff; }
.marks::before { top: -6px; left: -6px; border-top: 3px solid; border-left: 3px solid; }
.marks::after { right: -6px; bottom: -6px; border-right: 3px solid; border-bottom: 3px solid; }
`;

/** Caption on the left, screenshot on the right (or full-bleed). */
function frame({ w, h, label, title, lead, shot, shotWidth, layout = 'side' }) {
  const img = `<div class="marks" style="flex-shrink:0"><img class="shot" src="${shot}" style="width:${shotWidth}px"></div>`;
  const text = `<div style="display:flex;flex-direction:column;gap:18px;max-width:${layout === 'side' ? 400 : 1100}px"><div class="brand">${LOGO}<span>Web3<span class="accent">Lens</span></span></div><p class="label">${label}</p><h1>${title}</h1><p class="lead">${lead}</p></div>`;
  const body =
    layout === 'side'
      ? `<div style="display:flex;align-items:center;gap:56px;height:100%;padding:0 64px">${text}${img}</div>`
      : `<div style="display:flex;flex-direction:column;align-items:center;gap:26px;padding:40px 60px;height:100%;text-align:center">${text}${img}</div>`;
  return `<!doctype html><html><head><style>:root{--w:${w}px;--h:${h}px}${frameCss}</style></head><body>${body}</body></html>`;
}

const userDir = fs.mkdtempSync(path.join(os.tmpdir(), 'w3l-store-'));
const ctx = await chromium.launchPersistentContext(userDir, { channel: 'chromium', headless: true, args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`], deviceScaleFactor: 1 });
let [sw] = ctx.serviceWorkers();
sw ??= await ctx.waitForEvent('serviceworker');
const id = new URL(sw.url()).host;
const ext = (p) => `chrome-extension://${id}/${p}`;

async function capture(url, { width, height, prepare, wait = 600, clipHeight }) {
  const page = await ctx.newPage();
  await page.setViewportSize({ width, height });
  await page.goto(url);
  await page.waitForTimeout(400);
  if (prepare) await prepare(page);
  await page.waitForTimeout(wait);
  const buf = await page.screenshot({ clip: { x: 0, y: 0, width, height: clipHeight ?? height } });
  await page.close();
  return buf;
}

async function render(html, file, w, h) {
  const page = await ctx.newPage();
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(html, { waitUntil: 'load' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, file), clip: { x: 0, y: 0, width: w, height: h } });
  await page.close();
  console.log('wrote', file);
}

// Seed a little history so the popup shows recents.
const seed = await ctx.newPage();
await seed.goto(ext('popup.html'));
await seed.evaluate(() =>
  chrome.storage.local.set({
    recent: [
      { chainId: 'bitcoin', query: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa' },
      { chainId: 'ethereum', query: 'vitalik.eth' },
      { chainId: 'tron', query: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' },
    ],
  }),
);
await seed.close();

// 1. Popup: detection with chain chips.
const popup = await capture(ext('popup.html'), {
  width: 720,
  height: 600,
  prepare: async (p) => {
    await p.fill('.search-input', '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
  },
});
// 2. Result page with live data.
const result = await capture(ext('app.html#result/address/ethereum/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'), { width: 1200, height: 900, wait: 9000 });
// 3. Risk checks for a sanctioned address (Ronin bridge exploiter).
const risk = await capture(ext('app.html#result/address/ethereum/0x098B716B8Aaf21512996dC57EB0615e2383E2f96'), {
  width: 1200,
  height: 900,
  wait: 9000,
  prepare: async (p) => {
    await p.waitForSelector('text=Risk checks', { timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(6000);
    await p.evaluate(() => {
      const h = [...document.querySelectorAll('h2')].find((x) => x.textContent === 'Risk checks');
      h?.scrollIntoView({ block: 'start' });
      window.scrollBy(0, -24);
    });
  },
});
// 4. Raw transaction decoder.
const tools = await capture(ext('app.html#tools/transaction-decoder'), {
  width: 1200,
  height: 900,
  prepare: async (p) => {
    await p.fill('textarea', fx.find((f) => f.type === 4).raw);
  },
});
// 5. Batch search in light theme.
const batchPage = await ctx.newPage();
await batchPage.goto(ext('popup.html'));
await batchPage.evaluate(() => chrome.storage.local.set({ settings: { network: true, apiBase: 'https://web3lens.com', theme: 'light' } }));
await batchPage.close();
const batch = await capture(ext(`app.html#batch?q=${encodeURIComponent(['vitalik.eth', '0x098B716B8Aaf21512996dC57EB0615e2383E2f96', 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB4a', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'].join('\n'))}`), {
  width: 1200,
  height: 900,
  prepare: async (p) => {
    await p.click('text=Check all');
  },
});

const W = 1280;
const H = 800;
await render(frame({ w: W, h: H, label: 'Search any chain', title: 'Paste anything. It’s <span class="accent">recognised and checked.</span>', lead: '30+ address and hash formats with checksum validation, 700+ chains, and the right page of the right explorer.', shot: dataUrl(popup), shotWidth: 640 }), 'screenshots/1-search.png', W, H);
await render(frame({ w: W, h: H, label: 'Native results', title: 'Balances, tokens and activity, <span class="accent">with sources.</span>', lead: 'Every number says where it came from and when. Unavailable data is shown as unavailable, never guessed.', shot: dataUrl(result), shotWidth: 660 }), 'screenshots/2-results.png', W, H);
await render(frame({ w: W, h: H, label: 'Risk checks', title: 'Sanctions, scam reports and <span class="accent">approvals.</span>', lead: 'OFAC snapshot, reported scams, contract checks and token approvals. “No reports” is never called safe.', shot: dataUrl(risk), shotWidth: 660 }), 'screenshots/3-risk.png', W, H);
await render(frame({ w: W, h: H, label: 'Developer tools', title: 'Decode transactions <span class="accent">locally.</span>', lead: 'Raw transactions, calldata, units, hashes, timestamps and gas: in your browser, nothing broadcast.', shot: dataUrl(tools), shotWidth: 660 }), 'screenshots/4-tools.png', W, H);
await render(frame({ w: W, h: H, label: 'Batch search', title: 'Check a whole list <span class="accent">at once.</span>', lead: 'Up to 50 values: formats, checksums and sanctions, with CSV export and private saved labels. Light or dark.', shot: dataUrl(batch), shotWidth: 660 }), 'screenshots/5-batch.png', W, H);

// Promo tiles.
const tile = (w, h, size) =>
  `<!doctype html><html><head><style>:root{--w:${w}px;--h:${h}px}${frameCss}</style></head><body><div style="height:100%;display:flex;flex-direction:column;justify-content:center;gap:${size > 1 ? 22 : 12}px;padding:0 ${size > 1 ? 90 : 34}px"><div class="brand" style="font-size:${size > 1 ? 40 : 24}px">${LOGO.replace('<svg', `<svg style="width:${size > 1 ? 60 : 36}px;height:${size > 1 ? 60 : 36}px"`)}<span>Web3<span class="accent">Lens</span></span></div><h1 style="font-size:${size > 1 ? 58 : 27}px">Look up anything,<br>on <span class="accent">any chain.</span></h1>${size > 1 ? '<p class="lead" style="font-size:22px">Auto-detect · 700+ chains · balances · risk checks · dev tools</p>' : ''}</div></body></html>`;
await render(tile(440, 280, 1), 'promo/small-tile-440x280.png', 440, 280);
await render(tile(1400, 560, 2), 'promo/marquee-1400x560.png', 1400, 560);
await render(
  `<!doctype html><html><head><style>:root{--w:300px;--h:300px}${frameCss} body{background-image:none;display:grid;place-items:center}</style></head><body>${LOGO.replace('<svg', '<svg style="width:210px;height:210px"')}</body></html>`,
  'promo/logo-300.png',
  300,
  300,
);

await ctx.close();
fs.rmSync(userDir, { recursive: true, force: true });
