'use client';

import { usePathname } from 'next/navigation';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { chromeCatalog } from './chrome';
import { localeFromPath, type Locale } from './config';
import { createTx, type Catalog, type Tx } from './format';

type I18nValue = { locale: Locale; catalog: Catalog };

const I18nContext = createContext<I18nValue | null>(null);

/** Wraps a translated page: its client components read this language and catalog. */
export function I18nProvider({ locale, catalog, children }: { locale: Locale; catalog: Catalog; children: ReactNode }) {
  const value = useMemo(() => ({ locale, catalog }), [locale, catalog]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Outside a provider (the header and footer, which the root layout renders for every page) the language comes from
 * the URL and only the small header/footer catalog is used; on every English page that is English.
 */
export function useLocale(): Locale {
  const ctx = useContext(I18nContext);
  const pathname = usePathname();
  return ctx?.locale ?? localeFromPath(pathname);
}

export function useTx(): Tx {
  const ctx = useContext(I18nContext);
  const pathname = usePathname();
  const catalog = ctx ? ctx.catalog : chromeCatalog(localeFromPath(pathname));
  return useMemo(() => createTx(catalog), [catalog]);
}
