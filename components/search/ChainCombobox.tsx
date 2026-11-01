'use client';

import { ChevronDown } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Chain } from '@/lib/chains';

/** Chains whose name starts with the filter come first, then the ones that only contain it. */
function filterChains(chains: Chain[], filter: string): Chain[] {
  const f = filter.trim().toLowerCase();
  if (!f) return chains;
  const starts: Chain[] = [];
  const contains: Chain[] = [];
  for (const c of chains) {
    const name = c.name.toLowerCase();
    if (name.startsWith(f)) starts.push(c);
    else if (name.includes(f)) contains.push(c);
  }
  return [...starts, ...contains];
}

/**
 * Searchable single-select for the chain list (replaces the legacy jQuery Chosen dropdown).
 * Keyboard: type to filter, ↑/↓ to move, Enter to pick, Esc to close.
 */
export function ChainCombobox({
  chains,
  value,
  onChange,
}: {
  chains: Chain[];
  value: Chain;
  onChange: (chain: Chain) => void;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const results = useMemo(() => filterChains(chains, filter), [chains, filter]);

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
    setActive(Math.max(0, chains.indexOf(value)));
    setOpen(true);
  }

  function pick(chain: Chain) {
    onChange(chain);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[active]) pick(results[active]);
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative w-full text-left">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-label={`Blockchain: ${value.name}`}
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openList())}
        className="flex h-12 w-full items-center justify-between rounded-[5px] border border-[#aaa] bg-gradient-to-b from-white via-[#f6f6f6] to-[#f4f4f4] px-4 text-lg text-[#444] shadow-[0_0_3px_#fff_inset,0_1px_1px_rgba(0,0,0,0.1)]"
      >
        <span className="truncate">{value.name}</span>
        <ChevronDown aria-hidden className="size-5 shrink-0 text-[#888]" />
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-50 rounded-b-[5px] border border-t-0 border-[#aaa] bg-white shadow-[0_4px_5px_rgba(0,0,0,0.15)]">
          <div className="p-1.5">
            <input
              ref={inputRef}
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-activedescendant={results[active] ? `${listId}-${results[active].id}` : undefined}
              aria-label="Filter blockchains"
              autoComplete="off"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              className="w-full rounded-sm border border-[#aaa] px-2 py-1 text-base text-[#444] outline-none placeholder:text-left"
            />
          </div>
          <ul ref={listRef} id={listId} role="listbox" className="max-h-60 overflow-y-auto px-1.5 pb-1.5 text-base">
            {results.length === 0 && <li className="px-2 py-1.5 text-[#777]">No results match "{filter}"</li>}
            {results.map((chain, i) => (
              <li
                key={chain.id}
                id={`${listId}-${chain.id}`}
                data-index={i}
                role="option"
                aria-selected={chain.id === value.id}
                onPointerEnter={() => setActive(i)}
                onClick={() => pick(chain)}
                className={`cursor-pointer px-2 py-1.5 text-[#444] ${i === active ? 'bg-[#3875d7] text-white' : ''}`}
              >
                {chain.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
