import type { MetadataRoute } from 'next';
import { PAGES, SITE } from '@/config/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((page) => ({
    url: `${SITE.url}${page.href === '/' ? '' : page.href}`,
    changeFrequency: page.href === '/' ? 'weekly' : 'monthly',
    priority: page.href === '/' ? 1 : 0.6,
  }));
}
