import { DEFAULT_LOCALE, type Locale } from './config';
import type { Catalog } from './format';
import chrome from './messages/chrome.json';

const CHROME = chrome as Record<Exclude<Locale, 'en'>, Catalog>;
const EMPTY: Catalog = {};

/** Header and footer strings for a language. Small enough to ship to the browser for every language. */
export function chromeCatalog(locale: Locale): Catalog {
  return locale === DEFAULT_LOCALE ? EMPTY : (CHROME[locale] ?? EMPTY);
}
