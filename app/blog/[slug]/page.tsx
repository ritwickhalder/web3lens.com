import { ArrowLeft, ArrowRight, Clock, GithubLogo, ListBullets, YoutubeLogo } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArticleCta } from '@/components/blog/ArticleCta';
import { Markdown } from '@/components/blog/Markdown';
import { PostCard } from '@/components/blog/PostCard';
import { ShareLinks } from '@/components/blog/ShareLinks';
import { formatDate } from '@/components/blog/format';
import { Breadcrumbs } from '@/components/content/Breadcrumbs';
import { JsonLd } from '@/components/seo/JsonLd';
import { getCategory, type CtaPreset } from '@/config/blog';
import { OTHER_PRODUCTS, SITE } from '@/config/site';
import { adjacentPosts, getAllPosts, getPost, relatedPosts, summary } from '@/lib/blog/posts';
import { pageMetadata } from '@/lib/metadata';
import { blogPosting, faqPage } from '@/lib/structured-data';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props) {
  const post = getPost((await params).slug);
  if (!post) return {};
  return pageMetadata({
    title: post.seoTitle,
    description: post.description,
    path: `/blog/${post.slug}`,
    image: { url: `/blog/${post.slug}/opengraph-image`, alt: post.title },
    article: {
      publishedTime: post.date,
      modifiedTime: post.updated,
      section: getCategory(post.category)?.name ?? post.category,
      tags: post.tags,
      author: SITE.author.github,
    },
  });
}

const END_CTA: Record<string, CtaPreset> = {
  'browser-extension': 'extension',
  'developer-tools': 'tools',
  security: 'risk',
  'explorer-basics': 'extension',
  'addresses-and-transactions': 'extension',
};

export default async function BlogPost({ params }: Props) {
  const post = getPost((await params).slug);
  if (!post) notFound();
  const category = getCategory(post.category)!;
  const url = `${SITE.url}/blog/${post.slug}`;
  const related = relatedPosts(post).map(summary);
  const { prev, next } = adjacentPosts(post.slug);
  const used = new Set(post.blocks.flatMap((b) => (b.t === 'directive' ? [b.arg] : [])));
  const endCta = used.has(END_CTA[post.category]) ? (used.has('search') ? null : 'search') : END_CTA[post.category];
  const toc = post.toc.filter((t) => t.level === 2);

  return (
    <main className="wrap pt-10 sm:pt-14">
      <JsonLd data={post.faq.length ? [blogPosting({ ...post, category: category.name }), faqPage(post.faq)] : blogPosting({ ...post, category: category.name })} />
      <article>
        <header className="max-w-4xl">
          <Breadcrumbs
            items={[
              { name: 'Blog', path: '/blog' },
              { name: category.name, path: `/blog/category/${category.slug}` },
              { name: post.title, path: `/blog/${post.slug}` },
            ]}
          />
          <Link href={`/blog/category/${category.slug}`} className="label hover:underline">
            {category.name}
          </Link>
          <h1 className="heading mt-3 text-[2.25rem] sm:text-5xl xl:text-[3.25rem]">{post.title}</h1>
          <p className="mt-5 max-w-3xl text-lg font-medium leading-relaxed text-muted sm:text-xl">{post.description}</p>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-line py-4 text-sm font-semibold text-muted">
            <span>
              By{' '}
              <a href={post.author.url} rel="author noopener" target="_blank" className="font-bold text-fg underline decoration-line-strong underline-offset-4 hover:text-accent">
                {post.author.name}
              </a>
            </span>
            <span>
              Published <time dateTime={post.date}>{formatDate(post.date)}</time>
            </span>
            {post.updated !== post.date && (
              <span>
                Updated <time dateTime={post.updated}>{formatDate(post.updated)}</time>
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Clock aria-hidden weight="bold" className="size-4" /> {post.readingMinutes} min read
            </span>
          </div>
        </header>

        <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_17rem] xl:gap-20">
          <div className="min-w-0 max-w-[48rem]">
            {toc.length > 2 && (
              <details className="mb-8 rounded-xl border border-line bg-ink-2 lg:hidden">
                <summary className="flex cursor-pointer items-center gap-2 px-5 py-4 text-[15px] font-extrabold text-fg">
                  <ListBullets aria-hidden weight="bold" className="size-4 text-accent" /> On this page
                </summary>
                <ol className="space-y-2 px-5 pb-5 text-[15px] font-semibold">
                  {toc.map((t) => (
                    <li key={t.id}>
                      <a href={`#${t.id}`} className="text-muted hover:text-accent">
                        {t.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </details>
            )}

            <div className="prose-article">
              <Markdown blocks={post.blocks} />
            </div>

            {endCta && <ArticleCta preset={endCta} />}

            <footer className="mt-12 space-y-8 border-t border-line pt-8">
              {post.tags.length > 0 && (
                <div>
                  <p className="label mb-3">Topics</p>
                  <ul className="flex flex-wrap gap-2">
                    {post.tags.map((t) => (
                      <li key={t} className="rounded-md border border-line px-3 py-1 text-sm font-semibold text-muted">
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <p className="label mb-3">Share this article</p>
                <ShareLinks url={url} title={post.title} />
              </div>
              <section aria-label="About the author" className="flex flex-col gap-4 rounded-2xl border border-line bg-ink-2 p-6 sm:flex-row">
                <span className="grid size-14 shrink-0 place-items-center rounded-full bg-accent/10 text-xl font-extrabold text-accent">RH</span>
                <div className="text-[15px] font-medium leading-relaxed text-muted">
                  <p className="text-base font-extrabold text-fg">{post.author.name}</p>
                  <p className="mt-1">
                    Ritwick has built and run Web3Lens since 2018, including its address detection, explorer routing and browser extensions. He also makes free
                    browser tools such as{' '}
                    {OTHER_PRODUCTS.slice(0, 3).map((p, i) => (
                      <span key={p.href}>
                        <a href={p.href} target="_blank" rel="noopener" className="font-bold text-fg underline decoration-line-strong underline-offset-4 hover:text-accent">
                          {p.name}
                        </a>
                        {i < 1 ? ', ' : i === 1 ? ' and ' : '.'}
                      </span>
                    ))}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                    <a href={SITE.author.github} target="_blank" rel="noopener me" className="inline-flex items-center gap-1.5 font-bold text-fg hover:text-accent">
                      <GithubLogo aria-hidden weight="bold" className="size-4" /> github.com/ritwickhalder
                    </a>
                    <a href={SITE.author.youtube} target="_blank" rel="noopener me" className="inline-flex items-center gap-1.5 font-bold text-fg hover:text-accent">
                      <YoutubeLogo aria-hidden weight="bold" className="size-4" /> youtube.com/@ritwick.halder
                    </a>
                  </div>
                </div>
              </section>
            </footer>
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-28 space-y-8">
              {toc.length > 0 && (
                <nav aria-label="On this page">
                  <p className="label mb-3">On this page</p>
                  <ol className="space-y-2.5 border-l border-line text-sm font-semibold">
                    {toc.map((t) => (
                      <li key={t.id}>
                        <a href={`#${t.id}`} className="-ml-px block border-l-2 border-transparent pl-4 text-muted hover:border-accent hover:text-fg">
                          {t.text}
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              )}
              <div>
                <p className="label mb-3">Share</p>
                <ShareLinks url={url} title={post.title} />
              </div>
            </div>
          </aside>
        </div>
      </article>

      {(prev || next) && (
        <nav aria-label="More articles" className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {prev ? (
            <Link href={`/blog/${prev.slug}`} className="group rounded-2xl border border-line bg-ink-2 p-6 transition-colors hover:border-accent/60">
              <span className="flex items-center gap-1.5 text-sm font-bold text-muted">
                <ArrowLeft aria-hidden weight="bold" className="size-4" /> Previous article
              </span>
              <span className="mt-2 block text-lg font-extrabold tracking-tight text-fg group-hover:text-accent">{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={`/blog/${next.slug}`} className="group rounded-2xl border border-line bg-ink-2 p-6 text-right transition-colors hover:border-accent/60">
              <span className="flex items-center justify-end gap-1.5 text-sm font-bold text-muted">
                Next article <ArrowRight aria-hidden weight="bold" className="size-4" />
              </span>
              <span className="mt-2 block text-lg font-extrabold tracking-tight text-fg group-hover:text-accent">{next.title}</span>
            </Link>
          )}
        </nav>
      )}

      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="mt-16">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <h2 id="related-heading" className="heading text-3xl">
              Related articles
            </h2>
            <Link href="/blog" className="text-[15px] font-bold text-muted hover:text-accent">
              All articles →
            </Link>
          </div>
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {related.map((p) => (
              <li key={p.slug}>
                <PostCard post={p} headingLevel="h3" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
