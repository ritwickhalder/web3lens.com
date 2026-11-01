import type { Metadata } from 'next';
import { SITE } from '@/config/site';

/** Per-page metadata with canonical URL, Open Graph and Twitter tags filled in. */
export function pageMetadata({
  title,
  description = SITE.shortDescription,
  path,
}: {
  title: string;
  description?: string;
  path: string;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path },
    twitter: { title, description },
  };
}
