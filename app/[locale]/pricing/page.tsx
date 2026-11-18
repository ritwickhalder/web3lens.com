import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PricingPage from '../../pricing/page';
import { HtmlLang } from '@/components/i18n/LanguageLinks';
import { PRO_ON_SALE } from '@/config/site';
import { I18nProvider } from '@/lib/i18n/client';
import { PREFIXED_LOCALES, localizePath, type Locale } from '@/lib/i18n/config';
import { getCatalog } from '@/lib/i18n/dictionaries';
import { createTx } from '@/lib/i18n/format';
import { PRICING_META } from '@/lib/i18n/pages';
import { localeAlternates, openGraphLocales } from '@/lib/i18n/seo';
import { setRequestLocale } from '@/lib/i18n/server';
import { pageMetadata } from '@/lib/metadata';

/** /pricing in every language except English (which stays at `/pricing`). */
export const dynamicParams = false;

export function generateStaticParams() {
  return PREFIXED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const tx = createTx(getCatalog(locale));
  const base = pageMetadata({
    title: tx(PRICING_META.title),
    description: tx(PRICING_META.description),
    path: localizePath('/pricing', locale),
    // Same rule as the English page: indexed only once Pro is on sale.
    noindex: !PRO_ON_SALE,
  });
  return {
    ...base,
    alternates: { ...base.alternates, ...localeAlternates('/pricing', locale) },
    openGraph: { ...base.openGraph, ...openGraphLocales(locale) },
  };
}

export default async function LocalizedPricing({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!(PREFIXED_LOCALES as readonly string[]).includes(locale)) notFound();
  setRequestLocale(locale);
  return (
    <I18nProvider locale={locale as Locale} catalog={getCatalog(locale)}>
      <HtmlLang locale={locale} />
      <PricingPage />
    </I18nProvider>
  );
}
