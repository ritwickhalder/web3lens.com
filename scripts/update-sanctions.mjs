/**
 * Refreshes data/sanctions.json: digital-currency addresses on the US Treasury OFAC SDN list, as
 * extracted daily by github.com/0xB10C/ofac-sanctioned-digital-currency-addresses (MIT; the SDN
 * list itself is US-government public data).
 *
 *   npm run sanctions:update
 *
 * The site and extensions only say "listed / not listed in this snapshot (date)"; they never infer
 * that an unlisted address is safe.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'data', 'sanctions.json');
const BASE = 'https://raw.githubusercontent.com/0xB10C/ofac-sanctioned-digital-currency-addresses/lists';
const TICKERS = ['ETH', 'XBT', 'LTC', 'USDT', 'USDC', 'TRX', 'BSC', 'ARB', 'ETC', 'BCH', 'XMR', 'ZEC', 'DASH', 'BTG', 'XVG', 'SOL', 'XRP'];

const lists = {};
for (const t of TICKERS) {
  const res = await fetch(`${BASE}/sanctioned_addresses_${t}.json`);
  if (res.status === 404) continue;
  if (!res.ok) throw new Error(`${t}: HTTP ${res.status}`);
  const addresses = await res.json();
  if (!Array.isArray(addresses)) throw new Error(`${t}: unexpected format`);
  lists[t] = [...new Set(addresses.map((a) => String(a).trim()).filter(Boolean))].sort();
  console.log(`${t}: ${lists[t].length}`);
}
if (!lists.ETH?.length || !lists.XBT?.length) throw new Error('ETH/XBT lists missing; not overwriting');
const out = {
  source: 'US Treasury OFAC SDN list, via 0xB10C/ofac-sanctioned-digital-currency-addresses',
  sourceUrl: 'https://github.com/0xB10C/ofac-sanctioned-digital-currency-addresses',
  fetchedAt: new Date().toISOString(),
  lists,
};
fs.writeFileSync(OUT, `${JSON.stringify(out)}\n`);
console.log(`Wrote ${path.relative(ROOT, OUT)} (${(fs.statSync(OUT).size / 1024).toFixed(1)} KB)`);
