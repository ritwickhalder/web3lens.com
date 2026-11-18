import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import HomePage from '../page';
import { HtmlLang } from '@/components/i18n/LanguageLinks';
import { SITE } from '@/config/site';
import { CHAIN_COUNT_LABEL } from '@/lib/chains';
import { I18nProvider } from '@/lib/i18n/client';
import { PREFIXED_LOCALES, localizePath, type Locale } from '@/lib/i18n/config';
import { getCatalog } from '@/lib/i18n/dictionaries';
import { createTx } from '@/lib/i18n/format';
import { HOME_META } from '@/lib/i18n/pages';
import { localeAlternates, openGraphLocales } from '@/lib/i18n/seo';
import { setRequestLocale } from '@/lib/i18n/server';
import { pageMetadata } from '@/lib/metadata';

/**
 * The homepage in every language except English (which stays at `/`). Only these locales exist; any other
 * one-segment path (`/xx`, `/en`) is still a 404.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return PREFIXED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const tx = createTx(getCatalog(locale));
  const base = pageMetadata({
    title: tx(SITE.title),
    absoluteTitle: true,
    description: tx(HOME_META.description, { chains: CHAIN_COUNT_LABEL }),
    path: localizePath('/', locale),
  });
  return {
    ...base,
    alternates: { ...base.alternates, ...localeAlternates('/', locale) },
    openGraph: { ...base.openGraph, ...openGraphLocales(locale) },
  };
}

export default async function LocalizedHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!(PREFIXED_LOCALES as readonly string[]).includes(locale)) notFound();
  setRequestLocale(locale);
  return (
    <I18nProvider locale={locale as Locale} catalog={getCatalog(locale)}>
      <HtmlLang locale={locale} />
      <HomePage />
    </I18nProvider>
  );
}
