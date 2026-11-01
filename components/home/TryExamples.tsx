'use client';

import { ArrowUpRight } from 'lucide-react';
import { TRY_EVENT } from '@/components/search/SmartSearch';
import { EXAMPLES } from '@/lib/detect';

/** Example queries; clicking one fills the search bar so people see auto-detect at work. */
export function TryExamples() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {EXAMPLES.map((ex) => (
        <button
          key={ex.query}
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent(TRY_EVENT, { detail: ex.query }))}
          className="glass group rounded-2xl p-4 text-left transition-colors hover:border-lime/40"
        >
          <span className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime">{ex.expect}</span>
            <ArrowUpRight aria-hidden className="size-4 text-faint transition-colors group-hover:text-lime" />
          </span>
          <span className="mt-3 block truncate font-mono text-sm text-fg">{ex.query}</span>
          <span className="mt-1 block text-xs text-muted">{ex.note}</span>
        </button>
      ))}
    </div>
  );
}
