'use client';

import { CaretDown, Check, MagnifyingGlass, Star } from '@phosphor-icons/react/dist/ssr';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChainGlyph } from '@/components/search/ChainGlyph';
import { chainsByName, filterChains, POPULAR_CHAIN_IDS } from '@/lib/chain-meta';
import { countLabel, type Chain } from '@/lib/chains';
import { explorerDown } from '@/lib/explorer';

type Section = { title: string; chains: Chain[] };

/**
 * Searchable chain picker that sits inside the search bar.
 * Keyboard: type to filter, ↑/↓ to move, Enter to pick, Esc to close.
 */
export function ChainCombobox({
  chains,
  value,
  onChange,
  auto,
  favourites = [],
  onToggleFavourite,
}: {
  chains: Chain[];
  value: Chain;
  onChange: (chain: Chain) => void;
  /** True when the chain was picked by auto-detect rather than by the user. */
  auto?: boolean;
  /** Chain ids pinned to the top (lib/prefs). */
  favourites?: string[];
  onToggleFavourite?: (id: string) => void;
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

  const pinned = useMemo(
    () => favourites.map((id) => chains.find((c) => c.id === id)).filter((c): c is Chain => Boolean(c)),
    [chains, favourites],
  );

  const sections: Section[] = useMemo(
    () =>
      filter.trim()
        ? [{ title: 'Results', chains: filterChains(chains, filter) }]
        : [
            ...(pinned.length ? [{ title: 'Favourites', chains: pinned }] : []),
            { title: 'Popular', chains: popular },
            { title: `All chains · ${countLabel(chains.length)}`, chains: chainsByName(chains) },
          ],
    [chains, filter, popular, pinned],
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
        aria-label={`${auto ? 'Auto-detected' : 'Blockchain'} ${value.name}: change blockchain`}
        onClick={() => (open ? setOpen(false) : openList())}
        className="flex h-16 w-full items-center gap-3 rounded-xl px-3 text-left transition-colors hover:bg-ink-3 md:w-64"
      >
        <ChainGlyph id={value.id} name={value.name} size="md" />
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-faint">
            {auto ? <span className="text-accent">Auto-detected</span> : 'Blockchain'}
          </span>
          <span className="block truncate text-base font-bold text-fg">{value.name}</span>
        </span>
        <CaretDown aria-hidden weight="bold" className={`size-4 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute inset-x-0 top-[calc(100%+12px)] z-50 overflow-hidden rounded-xl border border-line-strong bg-ink-2 text-left shadow-2xl shadow-black/60 md:right-auto md:w-[420px]">
          <div className="flex items-center gap-2.5 border-b border-line px-4">
            <MagnifyingGlass aria-hidden weight="bold" className="size-4 text-muted" />
            <input
              ref={inputRef}
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-activedescendant={options[active] ? `${listId}-${options[active].id}` : undefined}
              aria-label="Filter blockchains"
              placeholder={`Search ${countLabel(chains.length)} chains…`}
              autoComplete="off"
              spellCheck={false}
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              className="h-14 w-full bg-transparent text-[15px] font-semibold text-fg outline-none placeholder:font-medium placeholder:text-faint"
            />
          </div>
          <div ref={listRef} id={listId} role="listbox" aria-label="Blockchains" className="max-h-[24rem] overflow-y-auto p-2">
            {options.length === 0 && <p className="px-3 py-6 text-center text-sm font-semibold text-muted">No chain matches "{filter}"</p>}
            {sections.map((section) =>
              section.chains.length === 0 ? null : (
                <div key={section.title} role="group" aria-label={section.title}>
                  <p className="label px-3 pb-2 pt-3 !text-faint">{section.title}</p>
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
                        className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-[15px] font-semibold ${
                          i === active ? 'bg-ink-3 text-fg' : 'text-fg/85'
                        }`}
                      >
                        <ChainGlyph id={chain.id} name={chain.name} size="sm" />
                        <span className="flex-1 truncate">{chain.name}</span>
                        {explorerDown(chain) ? (
                          <span className="text-[11px] font-bold uppercase tracking-wider text-redline/80">explorer down</span>
                        ) : (
                          chain.fallback && <span className="text-[11px] font-bold uppercase tracking-wider text-redline/80">limited</span>
                        )}
                        {chain.id === value.id && <Check aria-hidden weight="bold" className="size-4 text-accent" />}
                        {onToggleFavourite && (
                          <button
                            type="button"
                            tabIndex={-1}
                            aria-label={favourites.includes(chain.id) ? `Unpin ${chain.name}` : `Pin ${chain.name} to favourites`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleFavourite(chain.id);
                            }}
                            className="grid size-7 place-items-center rounded-md text-faint hover:bg-ink hover:text-accent"
                          >
                            <Star aria-hidden weight={favourites.includes(chain.id) ? 'fill' : 'bold'} className={`size-3.5 ${favourites.includes(chain.id) ? 'text-accent' : ''}`} />
                          </button>
                        )}
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
