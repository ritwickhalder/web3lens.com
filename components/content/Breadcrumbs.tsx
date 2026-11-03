import { CaretRight } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbList } from '@/lib/structured-data';

export type Crumb = { name: string; path: string };

/** Visible breadcrumb trail plus matching BreadcrumbList structured data. The last crumb is the current page. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const all = [{ name: 'Home', path: '/' }, ...items];
  return (
    <nav aria-label="Breadcrumb" className="mb-5">
      <JsonLd data={breadcrumbList(all)} />
      <ol className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-muted">
        {all.map((c, i) => (
          <li key={c.path} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && <CaretRight aria-hidden weight="bold" className="size-3 shrink-0 text-faint" />}
            {i === all.length - 1 ? (
              <span aria-current="page" className="truncate text-fg/90">
                {c.name}
              </span>
            ) : (
              <Link href={c.path} className="hover:text-accent">
                {c.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
