import { ArrowRight, BookOpenText } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { GUIDES_FOR_PAGE } from '@/config/blog';
import { getPost } from '@/lib/blog/posts';

/** "Guides" list on product pages, linking to the matching blog articles. */
export function RelatedGuides({ page, className = 'mt-12' }: { page: string; className?: string }) {
  const posts = (GUIDES_FOR_PAGE[page] ?? []).map(getPost).filter((p) => p !== undefined);
  if (!posts.length) return null;
  return (
    <section aria-labelledby="related-guides" className={className}>
      <h2 id="related-guides" className="label mb-4 flex items-center gap-2">
        <BookOpenText aria-hidden weight="duotone" className="size-4" /> Guides
      </h2>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {posts.map((p) => (
          <li key={p.slug}>
            <Link href={`/blog/${p.slug}`} className="group flex h-full flex-col rounded-xl border border-line bg-ink-2 p-5 transition-colors hover:border-accent/60">
              <span className="text-base font-extrabold tracking-tight text-fg group-hover:text-accent">{p.title}</span>
              <span className="mt-1.5 line-clamp-2 text-sm font-medium text-muted">{p.description}</span>
              <span className="mt-auto flex items-center gap-1.5 pt-3 text-sm font-bold text-fg group-hover:text-accent">
                {p.readingMinutes} min read <ArrowRight aria-hidden weight="bold" className="size-3.5" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
