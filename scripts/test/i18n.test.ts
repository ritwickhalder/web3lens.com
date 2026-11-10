/**
 * Extension translations (extension-src/locales/*.json): every language has exactly the English keys,
 * the same {placeholders}, keeps chain names, symbols and technical terms verbatim, and every key the
 * code uses exists. The website is not translated.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { TOOLS } from '../../config/tools';
import { buildFiles } from '../build-extensions.mjs';
import { CATALOGS, detectLabel, detectNote, flatten, setLocale, t } from '../../extension-src/src/i18n';
import { LOCALES, matchLocale, resolveLocale } from '../../extension-src/src/locales';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const DIR = path.join(ROOT, 'extension-src', 'locales');
const read = (code: string) => flatten(JSON.parse(fs.readFileSync(path.join(DIR, `${code}.json`), 'utf8')));
const EN = read('en');
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

/** Names and identifiers that must appear unchanged in every language whenever the English text has them. */
const PROTECTED = [
  'Web3Lens', 'web3lens.com', 'OFAC', 'EVM', 'ENS', 'Bitcoin', 'Ethereum', 'Solana', 'Tron', 'Stellar', 'TON', 'USDC', 'USDT',
  'Vitalik Buterin', 'ERC-20', 'EIP-55', 'EIP-1559', 'EIP-7702', 'EIP-1967', 'SPL', 'Token-2022', 'gwei', 'sat/vB', 'BTC', 'ETH',
  'SOL', 'CoinGecko', 'mempool.space', 'Blockscout', 'revoke.cash', 'openchain.xyz', '4byte.directory', 'keccak256', 'SHA-256',
  'UTF-8', 'int256', 'base58check', 'bech32', 'Bech32', 'CashAddr', 'SS58', 'ABI', 'JSON', 'CSV', 'RPC', 'L1', 'UTC', 'Unix', 'HTTP',
  'QR', 'USD', 'WIF', 'NFT', 'Uniswap', 'YouTube', 'w3', 'owner()', 'mint/pause/blacklist/upgrade', '0x',
];

test('one catalog per language, 15 left-to-right languages, English first', () => {
  assert.deepEqual(
    LOCALES.map((l) => l.code),
    ['en', 'es', 'pt', 'fr', 'de', 'ja', 'ko', 'zh-CN', 'ru', 'id', 'tr', 'it', 'pl', 'nl', 'th'],
  );
  assert.deepEqual(fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).sort(), LOCALES.map((l) => `${l.code}.json`).sort());
  for (const { code } of LOCALES) assert.ok(CATALOGS[code], code);
});

test('every language has exactly the English keys, no empty strings, no stray whitespace', () => {
  for (const { code } of LOCALES) {
    const cat = read(code);
    const missing = Object.keys(EN).filter((k) => !(k in cat));
    const extra = Object.keys(cat).filter((k) => !(k in EN));
    assert.deepEqual(missing, [], `${code}: missing translations`);
    assert.deepEqual(extra, [], `${code}: keys not in en.json`);
    for (const [k, v] of Object.entries(cat)) {
      assert.equal(typeof v, 'string', `${code}: ${k}`);
      assert.ok(v.trim().length > 0, `${code}: ${k} is empty`);
      assert.equal(v, v.trim(), `${code}: ${k} has leading/trailing whitespace (put spacing in code)`);
      assert.doesNotMatch(v, /<[a-z/][^>]*>/i, `${code}: ${k} contains markup`);
    }
  }
});

test('placeholders match English in every language', () => {
  for (const { code } of LOCALES) {
    const cat = read(code);
    for (const [k, v] of Object.entries(EN)) assert.deepEqual(placeholders(cat[k]), placeholders(v), `${code}: ${k}`);
  }
});

test('chain names, token symbols and technical identifiers stay untranslated', () => {
  for (const { code } of LOCALES) {
    const cat = read(code);
    for (const [k, v] of Object.entries(EN)) {
      for (const term of PROTECTED) {
        if (v.includes(term)) assert.ok(cat[k].includes(term), `${code}: ${k} must keep "${term}": ${cat[k]}`);
      }
    }
  }
});

/** Technical notation that reads the same in every language. */
const SAME_AS_ENGLISH = new Set(['result.conf', 'tool.hex-converter.short']);

test('translations are actually translated (not copied English) for prose strings', () => {
  for (const { code } of LOCALES.filter((l) => l.code !== 'en')) {
    const cat = read(code);
    const same = Object.entries(EN).filter(([k, v]) => v.split(' ').length >= 4 && cat[k] === v && !SAME_AS_ENGLISH.has(k)).map(([k]) => k);
    assert.deepEqual(same, [], `${code}: untranslated sentences`);
  }
});

test('every key used in extension-src exists, and every English key is used', () => {
  const src = path.join(ROOT, 'extension-src', 'src');
  const code = fs.readdirSync(src, { recursive: true }).filter((f) => String(f).endsWith('.ts')).map((f) => fs.readFileSync(path.join(src, String(f)), 'utf8')).join('\n');
  const used = new Set([...code.matchAll(/['`]([a-zA-Z0-9]+(?:\.[a-zA-Z0-9-]+)+)['`]/g)].map((m) => m[1]).filter((k) => /^[a-z]/.test(k) && !/\.(json|html|com|js|eth)$/.test(k)));
  for (const tool of TOOLS) for (const f of ['title', 'short', 'description']) used.add(`tool.${tool.slug}.${f}`);
  for (const k of used) if (/^(common|theme|language|picker|popup|hero|examples|scan|toolsNav|tool|gas|saved|settings|info|search|source|api|result|risk|multichain|locate|unit|validator|hex|time|gascalc|abi|txdec|app|batch|savedPage|detect|account|pro)\./.test(k)) assert.ok(k in EN, `used but missing from en.json: ${k}`);
  const unused = Object.keys(EN).filter((k) => !used.has(k));
  assert.deepEqual(unused, [], 'keys in en.json that nothing uses');
});

test('every developer tool has its title, summary and description translated', () => {
  for (const tool of TOOLS) {
    assert.equal(EN[`tool.${tool.slug}.title`], tool.title, 'en.json tool titles match config/tools.ts');
    assert.equal(EN[`tool.${tool.slug}.description`], tool.description);
  }
});

test('browser-language detection: exact tag, base language, Chinese variants, English fallback', () => {
  assert.equal(matchLocale(['pt-BR']), 'pt');
  assert.equal(matchLocale(['pt_PT']), 'pt');
  assert.equal(matchLocale(['zh-CN']), 'zh-CN');
  assert.equal(matchLocale(['zh-TW']), 'zh-CN');
  assert.equal(matchLocale(['zh']), 'zh-CN');
  assert.equal(matchLocale(['en-GB']), 'en');
  assert.equal(matchLocale(['fr-CA', 'en']), 'fr');
  assert.equal(matchLocale(['ar', 'he', 'de-AT']), 'de', 'skips unsupported (incl. RTL) languages');
  assert.equal(matchLocale(['in-ID']), 'id');
  assert.equal(matchLocale(['xx']), 'en');
  assert.equal(matchLocale([]), 'en');
  assert.equal(resolveLocale('auto', ['ko-KR']), 'ko');
  assert.equal(resolveLocale('th', ['ko-KR']), 'th', 'a saved choice wins over the browser');
});

test('saved language preference is validated (unknown values fall back to automatic)', async () => {
  // store.ts reaches the WebExtension API through browser.ts at import time.
  (globalThis as { chrome?: unknown }).chrome ??= {};
  const { sanitizeSettings } = await import('../../extension-src/src/store');
  assert.equal(sanitizeSettings({}).language, 'auto');
  assert.equal(sanitizeSettings({ language: 'ja' }).language, 'ja');
  assert.equal(sanitizeSettings({ language: 'zh-CN' }).language, 'zh-CN');
  assert.equal(sanitizeSettings({ language: 'ar' }).language, 'auto');
  assert.equal(sanitizeSettings({ language: 42 }).language, 'auto');
});

test('t() fills placeholders, translates shared-lib labels and falls back to English', () => {
  setLocale('es');
  assert.equal(t('scan.found', { count: 3 }), 'Encontrados: 3');
  assert.equal(detectLabel('Bitcoin address'), 'Dirección de Bitcoin');
  assert.equal(detectLabel('EVM transaction hash'), 'Hash de transacción de EVM');
  assert.equal(detectLabel('Something new'), 'Something new', 'unknown labels pass through');
  assert.match(detectNote('The checksum does not match. The value may contain a typo; check it before sending funds.'), /checksum no coincide/);
  setLocale('de');
  assert.ok(t('common.copy') !== 'Copy');
  // A language missing a key shows English for it.
  const saved = CATALOGS.pl;
  CATALOGS.pl = {};
  setLocale('pl');
  assert.equal(t('common.copy'), 'Copy');
  CATALOGS.pl = saved;
  setLocale('en');
  assert.equal(t('popup.tab.lookup'), 'Lookup');
});

test('catalogs ship in popup.js and app.js only (background stays lean); pages keep LTR', async () => {
  const files = (await buildFiles()) as Record<string, Buffer>;
  const popup = files['popup.js'].toString('utf8');
  const app = files['app.js'].toString('utf8');
  const bg = files['background.js'].toString('utf8');
  for (const { code } of LOCALES) {
    const sample = read(code)['popup.tab.scan'];
    assert.ok(popup.includes(sample) && app.includes(sample), `${code} catalog bundled`);
  }
  assert.ok(!bg.includes(read('ja')['popup.tab.scan']), 'background.js must not bundle the catalogs');
  for (const page of ['popup.html', 'app.html', 'options.html']) assert.doesNotMatch(files[page].toString('utf8'), /dir="rtl"/);
});
