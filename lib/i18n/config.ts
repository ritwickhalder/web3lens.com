/**
 * Languages the homepage and /pricing are published in.
 *
 * English stays at the paths it has always used (`/`, `/pricing`); every other language lives under a prefix
 * (`/de`, `/de/pricing`). Every other page is English-only. Adding a language: add it here and add
 * `lib/i18n/messages/<code>.json` (plus its entry in `messages/chrome.json`); a missing string falls back to English.
 */
export const DEFAULT_LOCALE = 'en';

export const LOCALES = ['en', 'de', 'es', 'fr', 'it', 'pt-BR', 'nl', 'pl', 'tr', 'ru', 'id', 'vi', 'ja', 'ko', 'zh-CN', 'zh-TW'] as const;

export type Locale = (typeof LOCALES)[number];

/** Every locale except English: the ones served under a `/<locale>` prefix. */
export const PREFIXED_LOCALES = LOCALES.filter((l) => l !== DEFAULT_LOCALE) as Exclude<Locale, 'en'>[];

export const LOCALE_META: Record<Locale, { nativeName: string; ogLocale: string; numberLocale: string }> = {
  en: { nativeName: 'English', ogLocale: 'en_US', numberLocale: 'en-US' },
  de: { nativeName: 'Deutsch', ogLocale: 'de_DE', numberLocale: 'de-DE' },
  es: { nativeName: 'Español', ogLocale: 'es_ES', numberLocale: 'es-ES' },
  fr: { nativeName: 'Français', ogLocale: 'fr_FR', numberLocale: 'fr-FR' },
  it: { nativeName: 'Italiano', ogLocale: 'it_IT', numberLocale: 'it-IT' },
  'pt-BR': { nativeName: 'Português (Brasil)', ogLocale: 'pt_BR', numberLocale: 'pt-BR' },
  nl: { nativeName: 'Nederlands', ogLocale: 'nl_NL', numberLocale: 'nl-NL' },
  pl: { nativeName: 'Polski', ogLocale: 'pl_PL', numberLocale: 'pl-PL' },
  tr: { nativeName: 'Türkçe', ogLocale: 'tr_TR', numberLocale: 'tr-TR' },
  ru: { nativeName: 'Русский', ogLocale: 'ru_RU', numberLocale: 'ru-RU' },
  id: { nativeName: 'Bahasa Indonesia', ogLocale: 'id_ID', numberLocale: 'id-ID' },
  vi: { nativeName: 'Tiếng Việt', ogLocale: 'vi_VN', numberLocale: 'vi-VN' },
  ja: { nativeName: '日本語', ogLocale: 'ja_JP', numberLocale: 'ja-JP' },
  ko: { nativeName: '한국어', ogLocale: 'ko_KR', numberLocale: 'ko-KR' },
  'zh-CN': { nativeName: '简体中文', ogLocale: 'zh_CN', numberLocale: 'zh-CN' },
  'zh-TW': { nativeName: '繁體中文', ogLocale: 'zh_TW', numberLocale: 'zh-TW' },
};

/** Paths published in every locale. */
export const LOCALIZED_PATHS = ['/', '/pricing'] as const;
export type LocalizedPath = (typeof LOCALIZED_PATHS)[number];

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/**
 * Public URL of a page in a language: `('/pricing', 'de')` -> `/de/pricing`, `('/#support', 'de')` -> `/de#support`.
 * English, and paths that are not translated, come back unchanged.
 */
export function localizePath(path: string, locale: string): string {
  if (locale === DEFAULT_LOCALE || !isLocale(locale)) return path;
  const match = path.match(/^([^?#]*)(.*)$/);
  const pathname = match?.[1] || '/';
  const rest = match?.[2] ?? '';
  if (!(LOCALIZED_PATHS as readonly string[]).includes(pathname)) return path;
  return `/${locale}${pathname === '/' ? '' : pathname}${rest}`;
}

/** The language of a URL path: `/de` and `/de/pricing` are German, everything else is English. */
export function localeFromPath(pathname: string | null | undefined): Locale {
  const m = /^\/([^/?#]+)(\/pricing)?\/?$/.exec(pathname ?? '');
  const seg = m?.[1];
  return seg && seg !== DEFAULT_LOCALE && isLocale(seg) ? seg : DEFAULT_LOCALE;
}

/** Numbers in the page's language (English keeps its en-US grouping). */
export function formatNumber(value: number, locale: string): string {
  return value.toLocaleString(isLocale(locale) ? LOCALE_META[locale].numberLocale : 'en-US');
}
