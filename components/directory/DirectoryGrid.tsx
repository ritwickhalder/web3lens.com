'use client';

import { ArrowUpRight, AtSign, Globe, MessageCircle, MessagesSquare, Search, Users, Youtube } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

export type DirectoryEntry = { source: string; name: string; url: string };

const SOURCE_STYLE: Record<string, { icon: typeof Globe; label: string; color: string }> = {
  'Youtube Channel': { icon: Youtube, label: 'YouTube', color: '#ff5a5f' },
  Forums: { icon: MessagesSquare, label: 'Forums', color: '#f7931a' },
  Website: { icon: Globe, label: 'Websites', color: '#52e3cf' },
  'Facebook Group': { icon: Users, label: 'Facebook', color: '#7a9cff' },
  Reddit: { icon: MessageCircle, label: 'Reddit', color: '#ff7a45' },
  'Twitter Profile': { icon: AtSign, label: 'Twitter', color: '#8f7cff' },
};
const FALLBACK_STYLE = { icon: Globe, label: 'Other', color: '#8d93a6' };

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** Filterable card grid of directory links (replaces the legacy DataTables table). */
export function DirectoryGrid({ entries }: { entries: DirectoryEntry[] }) {
  const [search, setSearch] = useState('');
  const [source, setSource] = useState<string | null>(null);

  const sources = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entries) counts.set(e.source, (counts.get(e.source) ?? 0) + 1);
    return [...counts.entries()];
  }, [entries]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return entries.filter(
      (e) => (!source || e.source === source) && (!s || `${e.name} ${e.source} ${e.url}`.toLowerCase().includes(s)),
    );
  }, [entries, search, source]);

  const filterButton = (key: string | null, label: string, count: number) => (
    <button
      key={label}
      type="button"
      aria-pressed={source === key}
      onClick={() => setSource(key)}
      className="flex items-center gap-2 rounded-full border border-line px-3.5 py-1.5 text-sm text-muted transition-colors hover:text-fg aria-pressed:border-lime/50 aria-pressed:bg-lime/10 aria-pressed:text-fg"
    >
      {label}
      <span className="font-mono text-[11px] text-faint">{count}</span>
    </button>
  );

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by type">
          {filterButton(null, 'All', entries.length)}
          {sources.map(([key, count]) => filterButton(key, (SOURCE_STYLE[key] ?? FALLBACK_STYLE).label, count))}
        </div>
        <label className="relative block lg:w-72">
          <span className="sr-only">Search the directory</span>
          <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search channels, sites, forums…"
            className="w-full rounded-full border border-line bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-fg outline-none placeholder:text-faint focus:border-lime/60"
          />
        </label>
      </div>

      <p className="mt-6 text-xs text-faint" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? 'resource' : 'resources'}
      </p>

      {filtered.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-line-strong p-10 text-center text-sm text-muted">
          Nothing matches "{search}". Know a great resource?{' '}
          <Link href="/contact" className="text-lime underline-offset-4 hover:underline">
            Suggest it
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => {
            const style = SOURCE_STYLE[e.source] ?? FALLBACK_STYLE;
            const Icon = style.icon;
            return (
              <li key={`${e.name}|${e.url}`}>
                <a
                  href={e.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass group flex h-full items-start gap-4 rounded-2xl p-4 transition-colors hover:border-line-strong hover:bg-white/[0.05]"
                >
                  <span
                    className="grid size-10 shrink-0 place-items-center rounded-xl"
                    style={{ color: style.color, background: `color-mix(in oklab, ${style.color} 12%, transparent)` }}
                  >
                    <Icon aria-hidden className="size-5" strokeWidth={1.7} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium leading-snug text-fg">{e.name}</span>
                    <span className="mt-1 block truncate font-mono text-[11px] text-faint">{hostname(e.url)}</span>
                  </span>
                  <ArrowUpRight aria-hidden className="size-4 shrink-0 text-faint transition-colors group-hover:text-lime" />
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
