import type { Metadata } from 'next';
import { DEFAULT_LOCALE, LOCALES, LOCALE_META, isLocale, localizePath, type LocalizedPath } from './config';

/** Canonical plus one hreflang alternate per language and `x-default` (English), relative to `metadataBase`. */
export function localeAlternates(path: LocalizedPath, locale: string): NonNullable<Metadata['alternates']> {
  const current = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l] = localizePath(path, l);
  languages['x-default'] = path;
  return { canonical: localizePath(path, current), languages };
}

/** `og:locale` for this language and `og:locale:alternate` for the others. */
export function openGraphLocales(locale: string) {
  const current = isLocale(locale) ? locale : DEFAULT_LOCALE;
  return {
    locale: LOCALE_META[current].ogLocale,
    alternateLocale: LOCALES.filter((l) => l !== current).map((l) => LOCALE_META[l].ogLocale),
  };
}
