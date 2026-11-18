/**
 * Website translations (lib/i18n): the homepage and /pricing in 16 languages. Each catalog only translates strings
 * the site shows, keeps every {placeholder} and <tag>, and anything untranslated falls back to English.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { LOCALES, PREFIXED_LOCALES, localeFromPath, localizePath } from '../../lib/i18n/config';
import { getCatalog } from '../../lib/i18n/dictionaries';
import { createTx } from '../../lib/i18n/format';
import { localeAlternates } from '../../lib/i18n/seo';

const DIR = path.resolve(import.meta.dirname, '..', '..', 'lib', 'i18n', 'messages');
const read = (file: string): Record<string, string> => JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
const EN = read('en.json');
const CHROME = read('chrome.json') as unknown as Record<string, Record<string, string>>;
const tokens = (s: string) => [...s.matchAll(/\{\w+\}|<\/?[a-zA-Z]+\s*\/?>/g)].map((m) => m[0]).sort().join();

test('one page catalog and one header/footer catalog per non-English language', () => {
  const files = fs.readdirSync(DIR).filter((f) => !['en.json', 'chrome.json'].includes(f)).map((f) => f.replace(/\.json$/, '')).sort();
  assert.deepEqual(files, [...PREFIXED_LOCALES].sort());
  assert.deepEqual(Object.keys(CHROME).sort(), [...PREFIXED_LOCALES].sort());
});

for (const locale of PREFIXED_LOCALES) {
  test(`${locale}: known strings only, placeholders and tags kept, nothing empty`, () => {
    const merged = { ...CHROME[locale], ...read(`${locale}.json`) };
    for (const [en, tr] of Object.entries(merged)) {
      assert.ok(en in EN, `${locale}: "${en}" is not a source string (changed English? update the catalogs)`);
      assert.ok(tr.trim(), `${locale}: empty translation for "${en}"`);
      assert.equal(tokens(tr), tokens(en), `${locale}: placeholders or tags differ in "${en}"`);
    }
    // Header and footer strings live only in chrome.json, page strings only in the page catalog.
    for (const key of Object.keys(read(`${locale}.json`))) assert.ok(!(key in CHROME[locale]), `${locale}: "${key}" is in both catalogs`);
  });
}

test('missing translations fall back to English, and English has no catalog', () => {
  const tx = createTx(getCatalog('de'));
  assert.equal(tx('A sentence nobody translated'), 'A sentence nobody translated');
  assert.equal(tx('{count} more', { count: 5 }), '5 weitere');
  assert.deepEqual(getCatalog('en'), {});
  assert.deepEqual(getCatalog('xx'), {});
});

test('localized paths: English keeps its URLs, other languages get a prefix, other pages stay English', () => {
  assert.equal(localizePath('/', 'en'), '/');
  assert.equal(localizePath('/pricing', 'ja'), '/ja/pricing');
  assert.equal(localizePath('/#support', 'de'), '/de#support');
  assert.equal(localizePath('/tools', 'de'), '/tools');
  assert.equal(localeFromPath('/zh-TW/pricing'), 'zh-TW');
  assert.equal(localeFromPath('/de/blog'), 'en');
  assert.equal(localeFromPath('/en'), 'en');
  assert.equal(localeFromPath('/tools'), 'en');
});

test('hreflang covers every language plus x-default, canonical is the page itself', () => {
  const alt = localeAlternates('/pricing', 'fr');
  assert.equal(alt.canonical, '/fr/pricing');
  assert.deepEqual(Object.keys(alt.languages ?? {}).sort(), [...LOCALES, 'x-default'].sort());
  assert.equal((alt.languages as Record<string, string>)['x-default'], '/pricing');
});
