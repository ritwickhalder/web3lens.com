'use client';

import { MagnifyingGlass } from '@phosphor-icons/react/dist/ssr';
import { useState } from 'react';

/**
 * Filters the server-rendered article list (`[data-filter=listId] > li[data-search]`) as you type. The list itself stays plain
 * HTML so it is crawlable and works without JavaScript; this only hides non-matching items.
 */
export function BlogSearch({ listId, total }: { listId: string; total: number }) {
  const [q, setQ] = useState('');
  const [shown, setShown] = useState(total);

  function filter(value: string) {
    setQ(value);
    const words = value.toLowerCase().split(/\s+/).filter(Boolean);
    let n = 0;
    document.querySelectorAll<HTMLElement>(`[data-filter="${listId}"] > li[data-search]`).forEach((li) => {
      const hay = li.dataset.search ?? '';
      const match = words.every((w) => hay.includes(w));
      li.hidden = !match;
      if (match) n++;
    });
    setShown(n);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <label className="flex h-12 w-full items-center gap-2.5 rounded-xl border border-line-strong bg-ink-2 px-4 focus-within:border-accent sm:max-w-md">
        <MagnifyingGlass aria-hidden weight="bold" className="size-4 shrink-0 text-muted" />
        <span className="sr-only">Search articles</span>
        <input
          type="search"
          value={q}
          onChange={(e) => filter(e.target.value)}
          placeholder="Search articles: ENS, checksum, CSV…"
          className="h-full w-full bg-transparent text-[15px] font-semibold text-fg placeholder:text-faint focus:outline-none"
        />
      </label>
      <p aria-live="polite" className="text-sm font-semibold text-muted">
        {q ? `${shown} of ${total} articles` : `${total} articles`}
      </p>
    </div>
  );
}
