/**
 * UI translations for the extension pages (popup, settings, info, full-page app). Catalogs are the
 * JSON files in extension-src/locales/, English is the source and the fallback for any missing key.
 * They are bundled (CSP connect-src only allows web3lens.com, so they can't be fetched at runtime).
 * No DOM or Node APIs at import time, so tests can load it.
 */
import en from '../locales/en.json';
import es from '../locales/es.json';
import pt from '../locales/pt.json';
import fr from '../locales/fr.json';
import de from '../locales/de.json';
import ja from '../locales/ja.json';
import ko from '../locales/ko.json';
import zhCN from '../locales/zh-CN.json';
import ru from '../locales/ru.json';
import id from '../locales/id.json';
import tr from '../locales/tr.json';
import it from '../locales/it.json';
import pl from '../locales/pl.json';
import nl from '../locales/nl.json';
import th from '../locales/th.json';
import { DEFAULT_LOCALE, resolveLocale, type LanguagePref, type Locale } from './locales';

type Tree = { [k: string]: string | Tree };
type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

/** Every key in en.json, e.g. 'popup.tab.lookup'. */
export type MessageKey = Leaves<typeof en>;
export type Params = Record<string, string | number>;

export const CATALOGS: Record<Locale, Tree> = { en, es, pt, fr, de, ja, ko, 'zh-CN': zhCN, ru, id, tr, it, pl, nl, th };

export function flatten(tree: Tree, prefix = '', out: Record<string, string> = {}): Record<string, string> {
  for (const [k, v] of Object.entries(tree)) {
    if (typeof v === 'string') out[prefix + k] = v;
    else flatten(v, `${prefix}${k}.`, out);
  }
  return out;
}

const EN = flatten(en);
const flat = new Map<Locale, Record<string, string>>([['en', EN]]);
let current: Locale = DEFAULT_LOCALE;
let dict = EN;

export function setLocale(code: Locale) {
  current = code;
  if (!flat.has(code)) flat.set(code, flatten(CATALOGS[code] ?? {}));
  dict = flat.get(code)!;
  if (typeof document !== 'undefined') document.documentElement.lang = code;
}

/** Applies the saved preference (`auto` follows the browser) and returns the language in use. */
export function applyLanguage(pref: LanguagePref): Locale {
  const code = resolveLocale(pref);
  setLocale(code);
  return code;
}

export function locale(): Locale {
  return current;
}

function fill(s: string, params?: Params) {
  return params ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m)) : s;
}

/** The current language's text for `key`, else English, else the key itself. */
export function t(key: MessageKey, params?: Params): string {
  return fill(dict[key] || EN[key] || key, params);
}

/**
 * Like t(), for messages with inline markup: `{name}` placeholders may be DOM nodes, and the result
 * is a list of strings and nodes to append (text stays text; nothing is parsed as HTML).
 */
export function tx(key: MessageKey, params: Record<string, string | number | Node | (string | Node)[]>): (string | Node)[] {
  const s = dict[key] || EN[key] || key;
  const out: (string | Node)[] = [];
  let last = 0;
  for (const m of s.matchAll(/\{(\w+)\}/g)) {
    const v = params[m[1]];
    if (v === undefined) continue;
    if (m.index! > last) out.push(s.slice(last, m.index));
    if (Array.isArray(v)) out.push(...v);
    else out.push(typeof v === 'number' ? String(v) : v);
    last = m.index! + m[0].length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

const UNITS: [number, Intl.RelativeTimeFormatUnit][] = [
  [31536000, 'year'],
  [2592000, 'month'],
  [86400, 'day'],
  [3600, 'hour'],
  [60, 'minute'],
  [1, 'second'],
];

/** "3 hours ago" / "in 2 days" in the current language (Intl, no data shipped). */
export function relTime(ms: number, now = Date.now(), style: Intl.RelativeTimeFormatStyle = 'long'): string {
  const diff = Math.round((ms - now) / 1000);
  const rtf = new Intl.RelativeTimeFormat(current, { numeric: 'auto', style });
  const abs = Math.abs(diff);
  for (const [secs, unit] of UNITS) {
    if (abs >= secs) return rtf.format(Math.sign(diff) * Math.floor(abs / secs), unit);
  }
  return rtf.format(0, 'second');
}

/** lib/format's timeAgo() in the current language: past times only, clock drift reads as "now". */
export function ago(ts: number | string | null | undefined, now = Date.now()): string {
  if (ts === null || ts === undefined || ts === '') return '';
  const ms = typeof ts === 'number' ? (ts < 1e12 ? ts * 1000 : ts) : new Date(ts).getTime();
  if (!Number.isFinite(ms)) return '';
  const s = (now - ms) / 1000;
  if (s < -300) return t('time.future');
  return relTime(Math.min(ms, now), now, 'short');
}

// ------------------------------------------------------------------ shared-lib text
// lib/ (shared with the website) returns English labels; these map the known shapes to the catalog
// and leave chain names, symbols and anything unknown as they are.

const LABEL_PATTERNS: [RegExp, MessageKey][] = [
  [/^Bech32 address \((.+)\)$/, 'detect.bech32'],
  [/^(.+) testnet address$/, 'detect.testnetAddress'],
  [/^(.+) stake address$/, 'detect.stakeAddress'],
  [/^(.+) address \(raw\)$/, 'detect.addressRaw'],
  [/^(.+) transaction hash$/, 'detect.txHashOf'],
  [/^(.+) extrinsic hash$/, 'detect.extrinsicHash'],
  [/^(.+) operation hash$/, 'detect.operationHash'],
  [/^(.+) block hash$/, 'detect.blockHash'],
  [/^(.+) secret key$/, 'detect.secretKey'],
  [/^(.+) signature$/, 'detect.signature'],
  [/^(.+) DNS name$/, 'detect.dnsName'],
  [/^(.+) name$/, 'detect.name'],
  [/^(.+) account$/, 'detect.account'],
  [/^(.+) contract$/, 'detect.contract'],
  [/^(.+) address$/, 'detect.address'],
];
const LABEL_EXACT: Record<string, MessageKey> = {
  'Transaction hash': 'detect.transactionHash',
  'Block number': 'detect.blockNumber',
  'Recovery phrase': 'detect.recoveryPhrase',
  'Private key (WIF)': 'detect.privateKey',
};

/** A detection label ("Bitcoin address", "EVM transaction hash") in the current language. */
export function detectLabel(label: string): string {
  if (LABEL_EXACT[label]) return t(LABEL_EXACT[label]);
  for (const [re, key] of LABEL_PATTERNS) {
    const m = re.exec(label);
    if (m) return t(key, { chain: m[1], hrp: m[1] });
  }
  return label;
}

const NOTE_EXACT: Record<string, MessageKey> = {
  'The checksum does not match. The value may contain a typo; check it before sending funds.': 'detect.note.badChecksum',
  'This looks like a private key. Anyone who has it controls the funds. Web3Lens will not search it.': 'detect.note.privateKey',
  'This is a Stellar secret key. Anyone who has it controls the account. Web3Lens will not search it.': 'detect.note.stellarSecret',
  'This looks like a wallet recovery phrase. Anyone who has it controls the wallet. Web3Lens will not search it; never paste it into a website.': 'detect.note.recoveryPhrase',
};

/** A detection note (checksum and secret warnings) in the current language. */
export function detectNote(note: string): string {
  if (NOTE_EXACT[note]) return t(NOTE_EXACT[note]);
  let m = /^A valid bech32 address for "(.+)", a network Web3Lens doesn't list yet\.$/.exec(note);
  if (m) return t('detect.note.bech32Unknown', { hrp: m[1] });
  m = /^Version byte (0x[0-9a-f]+) isn't one Web3Lens recognises\.$/.exec(note);
  if (m) return t('detect.note.versionByte', { byte: m[1] });
  return note;
}
