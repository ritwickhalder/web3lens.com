'use client';

import type { Icon } from '@phosphor-icons/react';
import {
  ArrowUpRight,
  ChatsCircle,
  FacebookLogo,
  Globe,
  MagnifyingGlass,
  RedditLogo,
  SquaresFour,
  XLogo,
  YoutubeLogo,
} from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { useMemo, useState } from 'react';

export type DirectoryEntry = { source: string; name: string; url: string };

const SOURCE_STYLE: Record<string, { icon: Icon; label: string; color: string }> = {
  'Youtube Channel': { icon: YoutubeLogo, label: 'YouTube', color: '#ff4e45' },
  Forums: { icon: ChatsCircle, label: 'Forums', color: '#f7931a' },
  Website: { icon: Globe, label: 'Websites', color: '#4fd1ff' },
  'Facebook Group': { icon: FacebookLogo, label: 'Facebook', color: '#4c8dff' },
  Reddit: { icon: RedditLogo, label: 'Reddit', color: '#ff6a2b' },
  'Twitter Profile': { icon: XLogo, label: 'X / Twitter', color: '#e6edf3' },
};
const FALLBACK_STYLE = { icon: Globe, label: 'Other', color: '#a9bccf' };

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** Filterable grid of directory links (replaces the legacy DataTables table). */
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

  const tab = (key: string | null, label: string, count: number, TabIcon: Icon, color?: string) => (
    <button
      key={label}
      type="button"
      aria-pressed={source === key}
      onClick={() => setSource(key)}
      className="flex shrink-0 items-center gap-2 rounded-full border border-line bg-ink-2 py-2 pl-2.5 pr-3.5 text-[15px] font-bold text-fg/80 transition-colors hover:border-line-strong hover:text-fg aria-pressed:border-accent aria-pressed:bg-accent/10 aria-pressed:text-fg"
    >
      <TabIcon aria-hidden weight="duotone" className="size-5" style={color ? { color } : undefined} />
      {label}
      <span className="rounded-full bg-ink-3 px-2 text-xs font-extrabold text-muted">{count}</span>
    </button>
  );

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 gap-2 overflow-x-auto pb-1 [scrollbar-width:none] lg:flex-wrap lg:overflow-visible lg:pb-0" role="group" aria-label="Filter by type">
          {tab(null, 'All', entries.length, SquaresFour)}
          {sources.map(([key, count]) => {
            const s = SOURCE_STYLE[key] ?? FALLBACK_STYLE;
            return tab(key, s.label, count, s.icon, s.color);
          })}
        </div>
        <label className="relative block shrink-0 lg:w-96">
          <span className="sr-only">Search the directory</span>
          <MagnifyingGlass aria-hidden weight="bold" className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-faint" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search channels, sites, forums…"
            className="w-full rounded-xl border border-line bg-ink-2 py-3 pl-11 pr-4 text-base font-semibold text-fg outline-none placeholder:font-medium placeholder:text-faint focus:border-accent"
          />
        </label>
      </div>

      <p className="mt-6 text-sm font-bold text-muted" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? 'resource' : 'resources'}
      </p>

      {filtered.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-line-strong p-10 text-center text-base font-semibold text-muted">
          Nothing matches "{search}". Know a great resource?{' '}
          <Link href="/contact" className="text-accent underline-offset-4 hover:underline">
            Suggest it
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((e) => {
            const style = SOURCE_STYLE[e.source] ?? FALLBACK_STYLE;
            const SourceIcon = style.icon;
            return (
              <li key={`${e.name}|${e.url}`}>
                <a
                  href={e.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex h-full items-center gap-4 rounded-xl border border-line bg-ink-2 p-4 transition-colors hover:border-accent/60 hover:bg-ink-3"
                >
                  <span
                    className="grid size-12 shrink-0 place-items-center rounded-xl"
                    style={{ color: style.color, background: `color-mix(in oklab, ${style.color} 14%, transparent)` }}
                  >
                    <SourceIcon aria-hidden weight="duotone" className="size-7" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-bold leading-snug text-fg">{e.name}</span>
                    <span className="mt-0.5 block truncate text-sm font-semibold text-faint">
                      {style.label} · {hostname(e.url)}
                    </span>
                  </span>
                  <ArrowUpRight aria-hidden weight="bold" className="size-4 shrink-0 text-faint transition-colors group-hover:text-accent" />
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
