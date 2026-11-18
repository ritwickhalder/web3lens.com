import { cache } from 'react';
import { DEFAULT_LOCALE, isLocale, type Locale } from './config';
import { getCatalog } from './dictionaries';
import { createTx, type Tx } from './format';

/**
 * The language of the page being rendered, for server components. A translated page calls `setRequestLocale` before
 * rendering its children; React's `cache` scopes the value to the request. Every English-only page reads English.
 */
const current = cache(() => ({ locale: DEFAULT_LOCALE as Locale }));

export function setRequestLocale(locale: string) {
  current().locale = isLocale(locale) ? locale : DEFAULT_LOCALE;
}

export function getLocale(): Locale {
  return current().locale;
}

export function getTx(): Tx {
  return createTx(getCatalog(getLocale()));
}
