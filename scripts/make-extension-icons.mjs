/**
 * Renders the extension icons (16/32/48/128 px PNG) from the site's lens mark into
 * extension-src/icons/. Needs a local Playwright + Chromium (dev machines / CI images that have it);
 * the PNGs are committed, so normal builds don't run this.
 *
 *   node scripts/make-extension-icons.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'extension-src', 'icons');

const svg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" stroke="#4fd1ff">
  <rect width="32" height="32" rx="7" fill="#0a1520" stroke="none"/>
  <circle cx="16" cy="16" r="10.5" stroke-width="${size <= 16 ? 2.6 : 2}"/>
  <path d="M16 3v4M16 25v4M3 16h4M25 16h4" stroke-width="${size <= 16 ? 2.2 : 1.75}"/>
  <path d="M16 11.5 20 13.75v4.5L16 20.5l-4-2.25v-4.5z" stroke-width="${size <= 16 ? 2.2 : 1.75}" stroke-linejoin="round"/>
</svg>`;

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
for (const size of [16, 32, 48, 128]) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg(size)}</body></html>`);
  await page.screenshot({ path: path.join(OUT, `icon-${size}.png`), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  await page.close();
}
await browser.close();
console.log('Wrote', fs.readdirSync(OUT).join(', '));
