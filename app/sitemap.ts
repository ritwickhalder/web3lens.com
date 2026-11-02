import type { MetadataRoute } from 'next';
import { PAGES, SITE } from '@/config/site';
import { allExplorerRoutes, getChain } from '@/lib/chains';

export default function sitemap(): MetadataRoute.Sitemap {
  // Per-browser pages hold nothing worth indexing.
  const pages = PAGES.filter((p) => p.href !== '/saved' && p.href !== '/settings').map((page) => ({
    url: `${SITE.url}${page.href === '/' ? '' : page.href}`,
    changeFrequency: page.href === '/' ? ('weekly' as const) : ('monthly' as const),
    priority: page.href === '/' ? 1 : 0.6,
  }));
  const chains = Object.keys(allExplorerRoutes())
    .filter((id) => getChain(id))
    .map((id) => ({ url: `${SITE.url}/explorer/${id}`, changeFrequency: 'monthly' as const, priority: 0.5 }));
  return [...pages, ...chains];
}
