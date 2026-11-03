import { BLOG, getCategory } from '@/config/blog';
import { SITE } from '@/config/site';
import { getAllPosts } from '@/lib/blog/posts';

export const dynamic = 'force-static';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** RSS 2.0 feed of all posts; regenerated on every build, so new Markdown files appear automatically. */
export function GET() {
  const posts = getAllPosts();
  const items = posts
    .map((p) => {
      const url = `${SITE.url}/blog/${p.slug}`;
      return `    <item>
      <title>${esc(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${esc(p.description)}</description>
      <category>${esc(getCategory(p.category)?.name ?? p.category)}</category>
      <pubDate>${new Date(`${p.date}T00:00:00Z`).toUTCString()}</pubDate>
    </item>`;
    })
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(BLOG.title)}</title>
    <link>${SITE.url}/blog</link>
    <atom:link href="${SITE.url}/blog/rss.xml" rel="self" type="application/rss+xml" />
    <description>${esc(BLOG.description)}</description>
    <language>en</language>
    <lastBuildDate>${new Date(`${posts.reduce((d, p) => (p.updated > d ? p.updated : d), '1970-01-01')}T00:00:00Z`).toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
