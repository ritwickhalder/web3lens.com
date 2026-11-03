import { notFound } from 'next/navigation';
import { BlogSearch } from '@/components/blog/BlogSearch';
import { CategoryNav } from '@/components/blog/CategoryNav';
import { PostList } from '@/components/blog/PostList';
import { PageShell } from '@/components/content/PageShell';
import { JsonLd } from '@/components/seo/JsonLd';
import { BLOG_CATEGORIES, getCategory } from '@/config/blog';
import { getAllPosts, postsInCategory, summary } from '@/lib/blog/posts';
import { pageMetadata } from '@/lib/metadata';
import { collectionPage } from '@/lib/structured-data';

type Props = { params: Promise<{ category: string }> };

export function generateStaticParams() {
  return BLOG_CATEGORIES.filter((c) => postsInCategory(c.slug).length > 0).map((c) => ({ category: c.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props) {
  const c = getCategory((await params).category);
  if (!c) return {};
  return pageMetadata({ title: `${c.name} articles`, description: c.description, path: `/blog/category/${c.slug}` });
}

export default async function CategoryPage({ params }: Props) {
  const c = getCategory((await params).category);
  if (!c) notFound();
  const all = getAllPosts();
  const numbered = new Map(all.map((p, i) => [p.slug, i + 1]));
  const posts = postsInCategory(c.slug).map(summary);
  return (
    <PageShell
      layout="stacked"
      breadcrumbs={[
        { name: 'Blog', path: '/blog' },
        { name: c.name, path: `/blog/category/${c.slug}` },
      ]}
      eyebrow="Blog category"
      title={c.name}
      lead={c.description}
    >
      <JsonLd data={collectionPage(`${c.name} articles`, `/blog/category/${c.slug}`, c.description)} />
      <div className="mb-8 space-y-6">
        <CategoryNav current={c.slug} />
        <BlogSearch listId="category-posts" total={posts.length} />
      </div>
      <PostList id="category-posts" posts={posts} numbered={numbered} />
    </PageShell>
  );
}
