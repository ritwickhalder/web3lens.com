/**
 * The extension's UI languages and browser-language matching. Kept free of the catalogs themselves
 * so store.ts (and with it background.js) can validate the saved choice without bundling them.
 */
export const LOCALES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'pt', name: 'Português' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'zh-CN', name: '简体中文' },
  { code: 'ru', name: 'Русский' },
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'it', name: 'Italiano' },
  { code: 'pl', name: 'Polski' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'th', name: 'ไทย' },
] as const;

export type Locale = (typeof LOCALES)[number]['code'];
/** The saved choice: a language, or `auto` to follow the browser. */
export type LanguagePref = 'auto' | Locale;

export const DEFAULT_LOCALE: Locale = 'en';

export function isLocale(v: unknown): v is Locale {
  return typeof v === 'string' && LOCALES.some((l) => l.code === v);
}

/**
 * First supported language in the browser's preference list: exact tag, then base language
 * (`pt-BR` → `pt`, any `zh-*` → `zh-CN`, `in` → `id`), else English.
 */
export function matchLocale(langs: readonly string[]): Locale {
  for (const raw of langs) {
    const tag = String(raw ?? '').trim().replace(/_/g, '-').toLowerCase();
    if (!tag) continue;
    const exact = LOCALES.find((l) => l.code.toLowerCase() === tag);
    if (exact) return exact.code;
    const base = tag.split('-')[0];
    if (base === 'zh') return 'zh-CN';
    if (base === 'in') return 'id'; // legacy Indonesian tag
    const byBase = LOCALES.find((l) => l.code.split('-')[0].toLowerCase() === base);
    if (byBase) return byBase.code;
  }
  return DEFAULT_LOCALE;
}

export function browserLanguages(): string[] {
  if (typeof navigator === 'undefined') return [];
  return navigator.languages?.length ? [...navigator.languages] : navigator.language ? [navigator.language] : [];
}

export function resolveLocale(pref: LanguagePref, langs: readonly string[] = browserLanguages()): Locale {
  return pref === 'auto' ? matchLocale(langs) : pref;
}

export function localeName(code: Locale): string {
  return LOCALES.find((l) => l.code === code)?.name ?? code;
}
