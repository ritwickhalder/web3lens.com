import type { Metadata } from 'next';
import { SITE } from '@/config/site';

const DEFAULT_IMAGE = { url: '/opengraph-image', width: 1200, height: 630, alt: 'Web3Lens: look up anything, on any chain' };

/**
 * Per-page metadata with canonical URL, Open Graph and Twitter tags filled in. Open Graph and Twitter are set in
 * full here because a page-level `openGraph` replaces the root one (it would otherwise drop the image, type and
 * site name).
 */
export function pageMetadata({
  title,
  description = SITE.shortDescription,
  path,
  noindex = false,
  image,
  article,
  absoluteTitle = false,
}: {
  title: string;
  description?: string;
  path: string;
  /** Per-query result pages: keep them out of search indexes but let crawlers follow links. */
  noindex?: boolean;
  /** Social image path; defaults to the site-wide generated image. */
  image?: { url: string; alt: string };
  /** Blog posts: Open Graph article fields. */
  article?: { publishedTime: string; modifiedTime: string; section: string; tags: string[]; author: string };
  /** Use the title as is, without the "| Web3Lens" suffix. */
  absoluteTitle?: boolean;
}): Metadata {
  const img = image ? { ...image, width: 1200, height: 630 } : DEFAULT_IMAGE;
  const socialTitle = absoluteTitle ? title : `${title} | ${SITE.name}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path, types: { 'application/rss+xml': [{ url: '/blog/rss.xml', title: `${SITE.name} Blog` }] } },
    openGraph: {
      title: socialTitle,
      description,
      url: path,
      siteName: SITE.name,
      locale: 'en_US',
      images: [img],
      ...(article
        ? { type: 'article', publishedTime: article.publishedTime, modifiedTime: article.modifiedTime, section: article.section, tags: article.tags, authors: [article.author] }
        : { type: 'website' }),
    },
    twitter: { card: 'summary_large_image', site: SITE.twitter, title: socialTitle, description, images: [img] },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
