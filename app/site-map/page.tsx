import type { Icon } from '@phosphor-icons/react';
import { BookOpenText, Code, FileText, Info, MagnifyingGlass, SquaresFour } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { PageArt } from '@/components/content/PageArt';
import { PageShell } from '@/components/content/PageShell';
import { PAGES, SITE } from '@/config/site';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Sitemap: Every Page on Web3Lens',
  description: `Every page on ${SITE.domain}: blockchain explorer search for each chain, tools, guides, the gas tracker and the browser extension.`,
  path: '/site-map',
});

type Group = { name: string; icon: Icon; match: (href: string) => boolean };

/** Display groups for PAGES; anything unmatched lands in "More" so a new page is never dropped. */
const GROUPS: Group[] = [
  { name: 'Search & explore', icon: MagnifyingGlass, match: (h) => ['/', '/search', '/explorer', '/gas', '/batch'].includes(h) },
  { name: 'Developer tools', icon: Code, match: (h) => h === '/tools' || h.startsWith('/tools/') },
  { name: 'Learn', icon: BookOpenText, match: (h) => ['/blog', '/blockchain-guide', '/directory'].includes(h) },
  { name: 'Your Web3Lens', icon: SquaresFour, match: (h) => ['/saved', '/settings', '/pricing', '/extension', '/bookmark'].includes(h) },
  { name: 'Information', icon: Info, match: (h) => ['/about', '/contact', '/terms', '/privacy-policy', '/site-map'].includes(h) },
];

export default function SiteMapPage() {
  const host = SITE.url.replace(/^https?:\/\//, '');
  const pages: { label: string; href: string }[] = [...PAGES];
  const grouped = GROUPS.map((g) => ({ ...g, pages: pages.filter((p) => g.match(p.href)) }));
  const rest = pages.filter((p) => !GROUPS.some((g) => g.match(p.href)));
  if (rest.length) grouped.push({ name: 'More', icon: FileText, match: () => false, pages: rest });

  return (
    <PageShell eyebrow="Information" title="Sitemap" lead={`Every page on ${host}, grouped by what it is for.`} art={<PageArt scene="sitemap" />}>
      <div className="gap-4 md:columns-2 2xl:columns-3">
        {grouped.map((g) => (
          <section key={g.name} aria-labelledby={`map-${g.name}`} className="mb-4 break-inside-avoid rounded-xl border border-line bg-ink-2 p-2">
            <h2 id={`map-${g.name}`} className="flex items-center gap-2.5 px-3 py-2 text-base font-extrabold text-fg">
              <g.icon aria-hidden weight="duotone" className="size-5 text-accent" />
              {g.name}
            </h2>
            <ul>
              {g.pages.map((page) => (
                <li key={page.href}>
                  <Link href={page.href} className="group flex items-baseline justify-between gap-3 rounded-md px-3 py-1.5 hover:bg-ink-3">
                    <span className="text-[15px] font-bold text-fg/85 group-hover:text-accent">{page.label}</span>
                    <span className="truncate text-xs font-semibold text-faint">{page.href}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <section aria-label="Machine-readable sitemap" className="mb-4 break-inside-avoid rounded-xl border border-dashed border-line-strong p-4">
          <p className="text-sm font-semibold text-muted">
            For search engines: <a href="/sitemap.xml" className="font-bold text-accent hover:underline">{`${host}/sitemap.xml`}</a>
          </p>
        </section>
      </div>
    </PageShell>
  );
}
