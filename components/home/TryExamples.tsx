'use client';

import { ArrowRight } from '@phosphor-icons/react/dist/ssr';
import { ChainGlyph } from '@/components/search/ChainGlyph';
import { TRY_EVENT } from '@/components/search/SmartSearch';
import { EXAMPLES } from '@/lib/detect';

/** Example queries; clicking one fills the search bar so people see auto-detect at work. */
export function TryExamples() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {EXAMPLES.map((ex) => (
        <button
          key={ex.query}
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent(TRY_EVENT, { detail: ex.query }))}
          className="group flex flex-col rounded-2xl border border-line bg-ink-2 p-5 text-left transition-colors hover:border-accent/60 hover:bg-ink-3"
        >
          <span className="flex items-center gap-3">
            <ChainGlyph id={ex.icon} name={ex.note} size="lg" />
            <span className="min-w-0">
              <span className="block text-base font-extrabold text-fg">{ex.note}</span>
              <span className="block text-xs font-bold uppercase tracking-[0.12em] text-accent">{ex.expect}</span>
            </span>
          </span>
          <span className="mt-5 block truncate rounded-lg bg-ink px-3 py-2 font-mono text-[13px] text-fg/90">{ex.query}</span>
          <span className="mt-4 flex items-center gap-1.5 text-sm font-bold text-muted group-hover:text-accent">
            Try this example <ArrowRight aria-hidden weight="bold" className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </button>
      ))}
    </div>
  );
}
