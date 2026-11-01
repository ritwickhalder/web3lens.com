'use client';

import { ChevronDown, Search } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChainGlyph } from '@/components/search/ChainGlyph';
import { POPULAR_CHAIN_IDS } from '@/lib/chain-meta';
import type { Chain } from '@/lib/chains';

type Section = { title: string; chains: Chain[] };

/** Chains whose name starts with the filter come first, then the ones that only contain it. */
function filterChains(chains: Chain[], filter: string): Chain[] {
  const f = filter.trim().toLowerCase();
  const starts: Chain[] = [];
  const contains: Chain[] = [];
  for (const c of chains) {
    const name = c.name.toLowerCase();
    if (name.startsWith(f)) starts.push(c);
    else if (name.includes(f) || c.id.includes(f)) contains.push(c);
  }
  return [...starts, ...contains];
}

/**
 * Searchable chain picker that sits inside the search bar.
 * Keyboard: type to filter, ↑/↓ to move, Enter to pick, Esc to close.
 */
export function ChainCombobox({
  chains,
  value,
  onChange,
  auto,
}: {
  chains: Chain[];
  value: Chain;
  onChange: (chain: Chain) => void;
  /** True when the chain was picked by auto-detect rather than by the user. */
  auto?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const popular = useMemo(
    () => POPULAR_CHAIN_IDS.map((id) => chains.find((c) => c.id === id)).filter((c): c is Chain => Boolean(c)),
    [chains],
  );

  const sections: Section[] = useMemo(
    () =>
      filter.trim()
        ? [{ title: 'Results', chains: filterChains(chains, filter) }]
        : [
            { title: 'Popular', chains: popular },
            { title: `All chains · ${chains.length}`, chains },
          ],
    [chains, filter, popular],
  );
  const options = useMemo(() => sections.flatMap((s) => s.chains), [sections]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  function openList() {
    setFilter('');
    setActive(Math.max(0, popular.indexOf(value)));
    setOpen(true);
  }

  function pick(chain: Chain) {
    onChange(chain);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (options[active]) pick(options[active]);
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      setOpen(false);
    }
  }

  let index = -1;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Blockchain: ${value.name}${auto ? ' (auto-detected)' : ''}. Change blockchain`}
        onClick={() => (open ? setOpen(false) : openList())}
        className="flex h-12 w-full items-center gap-2.5 rounded-xl px-2.5 text-left transition-colors hover:bg-white/[0.05] sm:w-56"
      >
        <ChainGlyph id={value.id} name={value.name} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium text-fg">{value.name}</span>
          <span className="block text-[10px] uppercase tracking-[0.14em] text-faint">
            {auto ? <span className="text-lime">Auto-detected</span> : 'Blockchain'}
          </span>
        </span>
        <ChevronDown aria-hidden className={`size-4 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="glass absolute inset-x-0 top-[calc(100%+10px)] z-50 overflow-hidden rounded-2xl bg-ink-2/95 text-left shadow-2xl shadow-black/70 sm:right-auto sm:w-[380px]">
          <div className="flex items-center gap-2 border-b border-line px-3.5">
            <Search aria-hidden className="size-4 text-muted" />
            <input
              ref={inputRef}
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-activedescendant={options[active] ? `${listId}-${options[active].id}` : undefined}
              aria-label="Filter blockchains"
              placeholder={`Search ${chains.length} chains…`}
              autoComplete="off"
              spellCheck={false}
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              className="h-12 w-full bg-transparent text-sm text-fg outline-none placeholder:text-faint"
            />
          </div>
          <div ref={listRef} id={listId} role="listbox" aria-label="Blockchains" className="max-h-80 overflow-y-auto p-1.5">
            {options.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted">No chain matches "{filter}"</p>}
            {sections.map((section) =>
              section.chains.length === 0 ? null : (
                <div key={section.title} role="group" aria-label={section.title}>
                  <p className="eyebrow px-2.5 pb-1.5 pt-3 !text-faint">{section.title}</p>
                  {section.chains.map((chain) => {
                    index += 1;
                    const i = index;
                    return (
                      <div
                        key={`${section.title}-${chain.id}`}
                        id={`${listId}-${chain.id}`}
                        data-index={i}
                        role="option"
                        aria-selected={chain.id === value.id}
                        onPointerEnter={() => setActive(i)}
                        onClick={() => pick(chain)}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm ${
                          i === active ? 'bg-white/[0.07] text-fg' : 'text-fg/80'
                        }`}
                      >
                        <ChainGlyph id={chain.id} name={chain.name} size="sm" />
                        <span className="flex-1 truncate">{chain.name}</span>
                        {chain.fallback && <span className="text-[10px] uppercase tracking-wider text-faint">limited</span>}
                        {chain.id === value.id && <span className="size-1.5 rounded-full bg-lime" />}
                      </div>
                    );
                  })}
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
