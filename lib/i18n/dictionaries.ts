import { DEFAULT_LOCALE, isLocale, type Locale } from './config';
import type { Catalog } from './format';
import chrome from './messages/chrome.json';
import de from './messages/de.json';
import es from './messages/es.json';
import fr from './messages/fr.json';
import it from './messages/it.json';
import ptBR from './messages/pt-BR.json';
import nl from './messages/nl.json';
import pl from './messages/pl.json';
import tr from './messages/tr.json';
import ru from './messages/ru.json';
import id from './messages/id.json';
import vi from './messages/vi.json';
import ja from './messages/ja.json';
import ko from './messages/ko.json';
import zhCN from './messages/zh-CN.json';
import zhTW from './messages/zh-TW.json';

/**
 * Page catalogs: English text → translation for the homepage and /pricing. `messages/chrome.json` holds the header
 * and footer strings (shared with every page, so client components can read them by URL); `getCatalog` merges both.
 * English has no catalog: the source strings are in the components, and `messages/en.json` lists them all.
 */
const PAGES: Record<Exclude<Locale, 'en'>, Catalog> = {
  de, es, fr, it, 'pt-BR': ptBR, nl, pl, tr, ru, id, vi, ja, ko, 'zh-CN': zhCN, 'zh-TW': zhTW,
};

const CHROME = chrome as Record<Exclude<Locale, 'en'>, Catalog>;
const EMPTY: Catalog = {};

export function getCatalog(locale: string): Catalog {
  if (!isLocale(locale) || locale === DEFAULT_LOCALE) return EMPTY;
  return { ...CHROME[locale], ...PAGES[locale] };
}
