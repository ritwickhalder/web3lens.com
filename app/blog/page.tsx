import { BlogSearch } from '@/components/blog/BlogSearch';
import { CategoryNav } from '@/components/blog/CategoryNav';
import { PostCard } from '@/components/blog/PostCard';
import { PostList, searchText } from '@/components/blog/PostList';
import { PageShell } from '@/components/content/PageShell';
import { JsonLd } from '@/components/seo/JsonLd';
import { BLOG } from '@/config/blog';
import { getAllPosts, summary } from '@/lib/blog/posts';
import { pageMetadata } from '@/lib/metadata';
import { blog } from '@/lib/structured-data';

export const metadata = pageMetadata({
  title: 'Blog: guides to block explorers, addresses and Web3 tools',
  description: BLOG.description,
  path: '/blog',
});

export default function BlogIndex() {
  const posts = getAllPosts().map(summary);
  const numbered = new Map(posts.map((p, i) => [p.slug, i + 1]));
  const [featured, ...rest] = posts;
  return (
    <PageShell
      layout="stacked"
      breadcrumbs={[{ name: 'Blog', path: '/blog' }]}
      eyebrow="Blog"
      title={
        <>
          Guides for reading <span className="text-accent">the chain.</span>
        </>
      }
      lead="Practical, tested guides to block explorers, address formats, transactions, risk checks and developer tools, from the developer who builds Web3Lens."
    >
      <JsonLd data={blog(posts)} />
      <div className="space-y-6">
        <CategoryNav />
        <BlogSearch listId="all-posts" total={posts.length} />
      </div>
      {featured && (
        <section aria-label="Latest article" className="mt-10">
          <ul data-filter="all-posts">
            <li data-search={searchText(featured)}>
              <PostCard post={featured} featured index={numbered.get(featured.slug)} />
            </li>
          </ul>
        </section>
      )}
      <section aria-label="All articles" className="mt-4">
        <PostList id="all-posts" posts={rest} numbered={numbered} />
      </section>
    </PageShell>
  );
}
