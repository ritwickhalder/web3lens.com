import type { MetadataRoute } from 'next';
import { SITE } from '@/config/site';

/**
 * Live-lookup pages are kept away from crawlers: each is a server render plus provider calls, they are noindex
 * anyway, and they link to each other without end (an address lists its transactions and counterparties).
 * `/search?` blocks result URLs only; the empty /search page stays crawlable. Account pages are private and noindex.
 */
export const ROBOTS_DISALLOW = ['/api/', '/address/', '/tx/', '/search?', '/account', '/auth/', '/extension/connect'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ROBOTS_DISALLOW },
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
