import Link from 'next/link';
import { BLOG_CATEGORIES } from '@/config/blog';
import { getAllPosts } from '@/lib/blog/posts';

/** Category links (crawlable pages, not just client-side filters). */
export function CategoryNav({ current }: { current?: string }) {
  const posts = getAllPosts();
  const chip = 'inline-flex h-9 items-center gap-2 rounded-md border px-3.5 text-sm font-bold transition-colors';
  return (
    <nav aria-label="Blog categories">
      <ul className="flex flex-wrap gap-2">
        <li>
          <Link href="/blog" aria-current={!current ? 'page' : undefined} className={`${chip} ${!current ? 'border-accent bg-accent/10 text-accent' : 'border-line text-fg/80 hover:border-line-strong hover:text-fg'}`}>
            All <span className="text-muted">{posts.length}</span>
          </Link>
        </li>
        {BLOG_CATEGORIES.map((c) => {
          const active = c.slug === current;
          return (
            <li key={c.slug}>
              <Link
                href={`/blog/category/${c.slug}`}
                aria-current={active ? 'page' : undefined}
                className={`${chip} ${active ? 'border-accent bg-accent/10 text-accent' : 'border-line text-fg/80 hover:border-line-strong hover:text-fg'}`}
              >
                {c.name} <span className="text-muted">{posts.filter((p) => p.category === c.slug).length}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
