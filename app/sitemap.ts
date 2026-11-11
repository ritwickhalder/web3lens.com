import type { MetadataRoute } from 'next';
import { BLOG_CATEGORIES } from '@/config/blog';
import { PAGES, PRO_ON_SALE, SITE } from '@/config/site';
import { getAllPosts } from '@/lib/blog/posts';
import { allExplorerRoutes, getChain } from '@/lib/chains';

/** Per-browser pages hold nothing worth indexing; they are excluded here (and noindexed). */
export const SITEMAP_EXCLUDED = ['/saved', '/settings'];

/**
 * Canonical, indexable URLs only. Blog posts and categories come from content/blog, so a new Markdown file is in
 * the sitemap on the next build. Only posts carry lastmod (their real updated date); other pages omit it rather
 * than claim a date that isn't true.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();
  const latest = posts.reduce((d, p) => (p.updated > d ? p.updated : d), '');
  const pages = PAGES.filter((p) => !SITEMAP_EXCLUDED.includes(p.href) && (PRO_ON_SALE || p.href !== '/pricing')).map((page) => ({
    url: `${SITE.url}${page.href === '/' ? '' : page.href}`,
    changeFrequency: page.href === '/' || page.href === '/blog' ? ('weekly' as const) : ('monthly' as const),
    priority: page.href === '/' ? 1 : page.href === '/blog' ? 0.8 : 0.6,
    ...(page.href === '/blog' && latest ? { lastModified: latest } : {}),
  }));
  const blogPosts = posts.map((p) => ({ url: `${SITE.url}/blog/${p.slug}`, lastModified: p.updated, changeFrequency: 'monthly' as const, priority: 0.7 }));
  const categories = BLOG_CATEGORIES.filter((c) => posts.some((p) => p.category === c.slug)).map((c) => {
    const inCat = posts.filter((p) => p.category === c.slug);
    return {
      url: `${SITE.url}/blog/category/${c.slug}`,
      lastModified: inCat.reduce((d, p) => (p.updated > d ? p.updated : d), ''),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    };
  });
  const chains = Object.keys(allExplorerRoutes())
    .filter((id) => getChain(id))
    .map((id) => ({ url: `${SITE.url}/explorer/${id}`, changeFrequency: 'monthly' as const, priority: 0.5 }));
  return [...pages, ...blogPosts, ...categories, ...chains];
}
