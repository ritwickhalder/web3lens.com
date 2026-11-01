'use client';

import { ArrowRight, ClockCounterClockwise, Scan, X } from '@phosphor-icons/react/dist/ssr';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ChainCombobox } from '@/components/search/ChainCombobox';
import { ChainGlyph } from '@/components/search/ChainGlyph';
import { POPULAR_CHAIN_IDS } from '@/lib/chain-meta';
import { CHAINS, getChain, type Chain } from '@/lib/chains';
import { detectQuery } from '@/lib/detect';
import { fallbackNotice, openExplorer, resolveExplorer } from '@/lib/explorer';
import { recentStore } from '@/lib/recent';

/** Fired by the "try an example" cards: `window.dispatchEvent(new CustomEvent(TRY_EVENT, { detail: query }))`. */
export const TRY_EVENT = 'w3l:try';
/** Fired by the popular-chain tiles: `detail` is a chain id to select. */
export const CHAIN_EVENT = 'w3l:chain';

const POPULAR = POPULAR_CHAIN_IDS.slice(0, 8)
  .map((id) => getChain(id))
  .filter((c): c is Chain => Boolean(c));

function Chip({
  chain,
  onClick,
  active,
  children,
}: {
  chain: Chain;
  onClick: () => void;
  active?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3.5 text-sm font-semibold transition-colors ${
        active ? 'border-accent bg-accent/10 text-fg' : 'border-line bg-ink-2 text-fg/80 hover:border-line-strong hover:text-fg'
      }`}
    >
      <ChainGlyph id={chain.id} name={chain.name} size="sm" />
      {children ?? chain.name}
    </button>
  );
}

function RowLabel({ icon: Icon, children }: { icon?: typeof X; children: React.ReactNode }) {
  return (
    <span className="mr-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-faint">
      {Icon && <Icon aria-hidden weight="bold" className="size-4" />}
      {children}
    </span>
  );
}

/**
 * The main search: chain picker + query box. Recognises what was pasted (lib/detect) and,
 * until the user picks a chain themselves, switches to the matching chain automatically.
 */
export function SmartSearch() {
  const [picked, setPicked] = useState<Chain>(CHAINS[0]);
  const [userPicked, setUserPicked] = useState(false);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState<{ tone: 'error' | 'info'; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const recent = useSyncExternalStore(recentStore.subscribe, recentStore.getSnapshot, recentStore.getServerSnapshot);

  const detection = useMemo(() => detectQuery(query), [query]);
  const candidates = useMemo(
    () => (detection?.chains ?? []).map((id) => getChain(id)).filter((c): c is Chain => Boolean(c)),
    [detection],
  );
  // Auto-detect only steers the chain while the user hasn't chosen one, and never away from a valid pick.
  const autoChain = !userPicked && candidates.length > 0 && !candidates.includes(picked) ? candidates[0] : null;
  const chain = autoChain ?? picked;

  useEffect(() => {
    const focusSearch = () => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      inputRef.current?.focus({ preventScroll: true });
    };
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.closest('input, textarea, select, [contenteditable="true"]');
      if ((e.key === '/' && !typing) || (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    const onTry = (e: Event) => {
      setQuery((e as CustomEvent<string>).detail);
      setUserPicked(false);
      setNotice(null);
      focusSearch();
    };
    const onChain = (e: Event) => {
      const c = getChain((e as CustomEvent<string>).detail);
      if (!c) return;
      setPicked(c);
      setUserPicked(true);
      setNotice(null);
      focusSearch();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener(TRY_EVENT, onTry);
    window.addEventListener(CHAIN_EVENT, onChain);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(TRY_EVENT, onTry);
      window.removeEventListener(CHAIN_EVENT, onChain);
    };
  }, []);

  function pickChain(c: Chain) {
    setPicked(c);
    setUserPicked(true);
    setNotice(null);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      setNotice({ tone: 'error', text: 'Paste an address, transaction hash, block number or name first.' });
      inputRef.current?.focus();
      return;
    }
    setNotice(chain.fallback ? { tone: 'info', text: fallbackNotice(chain) } : null);
    openExplorer(resolveExplorer(chain, q));
    recentStore.add({ chainId: chain.id, query: q });
  }

  return (
    <div className="w-full text-left">
      <form
        ref={formRef}
        onSubmit={onSubmit}
        noValidate
        className="marks relative flex flex-col gap-1 rounded-2xl border border-line-strong bg-ink-2 p-2 shadow-[0_24px_60px_-24px_rgb(0_0_0/0.8)] transition-colors focus-within:border-accent md:flex-row md:items-center"
      >
        <ChainCombobox chains={CHAINS} value={chain} onChange={pickChain} auto={!userPicked && candidates.includes(chain)} />
        <span aria-hidden className="mx-1 hidden h-10 w-px bg-line md:block" />
        <div className="relative flex min-w-0 flex-1 items-center border-t border-line md:border-t-0">
          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            enterKeyHint="search"
            maxLength={250}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value) setUserPicked(false);
              setNotice(null);
            }}
            placeholder="Address, tx hash, block or ENS name"
            aria-label="Address, transaction hash, block or name"
            className="h-16 w-full min-w-0 bg-transparent px-4 font-mono text-base font-medium text-fg outline-none placeholder:font-sans placeholder:text-base placeholder:font-semibold placeholder:text-faint md:text-lg"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear"
              onClick={() => {
                setQuery('');
                setUserPicked(false);
                inputRef.current?.focus();
              }}
              className="mr-2 grid size-9 shrink-0 place-items-center rounded-full text-faint hover:bg-ink-3 hover:text-fg"
            >
              <X weight="bold" className="size-4" />
            </button>
          ) : (
            <kbd className="mr-3 hidden rounded-md border border-line px-2 py-0.5 font-mono text-xs font-medium text-faint md:block">/</kbd>
          )}
        </div>
        <button
          type="submit"
          className="group flex h-14 items-center justify-center gap-2 rounded-xl bg-accent px-8 text-base font-extrabold text-ink transition-colors hover:bg-accent-hover md:h-16"
        >
          Search
          <ArrowRight aria-hidden weight="bold" className="size-5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </form>

      <div className="mt-4 flex min-h-[36px] justify-center" aria-live="polite">
        {notice ? (
          <p
            role={notice.tone === 'error' ? 'alert' : 'status'}
            className={`w-full rounded-lg border px-4 py-2.5 text-[15px] font-semibold ${
              notice.tone === 'error' ? 'border-danger/40 bg-danger/10 text-danger' : 'border-redline/40 bg-redline/10 text-redline'
            }`}
          >
            {notice.text}
          </p>
        ) : detection && candidates.length > 0 ? (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="mr-1 flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5 text-sm font-bold text-accent">
              <Scan aria-hidden weight="bold" className="size-4" />
              {detection.label}
            </span>
            {/* Offer the matching chains when there are several, or when the user's pick doesn't match the input. */}
            {(candidates.length > 1 || !candidates.includes(chain)) && (
              <>
                <RowLabel>{candidates.includes(chain) ? 'Search on' : 'Switch to'}</RowLabel>
                {candidates.map((c) => (
                  <Chip key={c.id} chain={c} active={c.id === chain.id} onClick={() => pickChain(c)} />
                ))}
              </>
            )}
          </div>
        ) : recent.length > 0 && !query ? (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <RowLabel icon={ClockCounterClockwise}>Recent</RowLabel>
            {recent.map((r) => {
              const c = getChain(r.chainId);
              if (!c) return null;
              return (
                <Chip
                  key={`${r.chainId}-${r.query}`}
                  chain={c}
                  onClick={() => {
                    setPicked(c);
                    setUserPicked(true);
                    setQuery(r.query);
                    inputRef.current?.focus();
                  }}
                >
                  <span className="max-w-[10rem] truncate font-mono text-[13px]">{r.query}</span>
                </Chip>
              );
            })}
            <button type="button" onClick={() => recentStore.clear()} className="px-2 text-sm font-bold text-faint hover:text-fg">
              Clear
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <RowLabel>Popular</RowLabel>
            {POPULAR.map((c) => (
              <Chip key={c.id} chain={c} active={userPicked && c.id === chain.id} onClick={() => pickChain(c)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
