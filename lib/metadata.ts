import type { Metadata } from 'next';
import { SITE } from '@/config/site';

/** Per-page metadata with canonical URL, Open Graph and Twitter tags filled in. */
export function pageMetadata({
  title,
  description = SITE.shortDescription,
  path,
  noindex = false,
}: {
  title: string;
  description?: string;
  path: string;
  /** Per-query result pages: keep them out of search indexes but let crawlers follow links. */
  noindex?: boolean;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path },
    twitter: { title, description },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
