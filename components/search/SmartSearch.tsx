'use client';

import { ArrowRight, History, ScanSearch, X } from 'lucide-react';
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
      className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-xs transition-colors ${
        active ? 'border-lime/50 bg-lime/10 text-fg' : 'border-line bg-white/[0.02] text-muted hover:border-line-strong hover:text-fg'
      }`}
    >
      <ChainGlyph id={chain.id} name={chain.name} size="sm" />
      {children ?? chain.name}
    </button>
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
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.closest('input, textarea, select, [contenteditable="true"]');
      if ((e.key === '/' && !typing) || (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    const onTry = (e: Event) => {
      const q = (e as CustomEvent<string>).detail;
      setQuery(q);
      setUserPicked(false);
      setNotice(null);
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      inputRef.current?.focus({ preventScroll: true });
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener(TRY_EVENT, onTry);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(TRY_EVENT, onTry);
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

  const showCandidates = detection && candidates.length > 0;

  return (
    <div className="w-full">
      <form
        ref={formRef}
        onSubmit={onSubmit}
        noValidate
        className="glass ring-lens relative flex flex-col gap-1 rounded-[22px] bg-ink-2/70 p-2 shadow-[0_30px_80px_-30px_rgb(143_124_255/0.45)] sm:flex-row sm:items-center"
      >
        <ChainCombobox chains={CHAINS} value={chain} onChange={pickChain} auto={!userPicked && candidates.includes(chain)} />
        <span aria-hidden className="mx-1 hidden h-8 w-px bg-line sm:block" />
        <div className="relative flex min-w-0 flex-1 items-center border-t border-line pt-1 sm:border-0 sm:pt-0">
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
            className="h-12 w-full min-w-0 bg-transparent px-3 font-mono text-[15px] text-fg outline-none placeholder:font-sans placeholder:text-faint"
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
              className="mr-1 grid size-8 shrink-0 place-items-center rounded-full text-faint hover:bg-white/5 hover:text-fg"
            >
              <X className="size-4" />
            </button>
          ) : (
            <kbd className="mr-2 hidden rounded-md border border-line px-2 py-0.5 font-mono text-[11px] text-faint sm:block">/</kbd>
          )}
        </div>
        <button
          type="submit"
          className="group flex h-12 items-center justify-center gap-2 rounded-2xl bg-lime px-6 font-display text-sm font-semibold text-ink transition-[background-color,box-shadow] hover:bg-[#d4ff5c] hover:shadow-[0_0_30px_-4px_rgb(198_242_78/0.7)]"
        >
          Search
          <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </form>

      <div className="mt-4 min-h-[34px] text-left" aria-live="polite">
        {notice ? (
          <p
            role={notice.tone === 'error' ? 'alert' : 'status'}
            className={`rounded-xl border px-4 py-2.5 text-sm ${
              notice.tone === 'error' ? 'border-danger/30 bg-danger/10 text-danger' : 'border-warn/30 bg-warn/10 text-warn'
            }`}
          >
            {notice.text}
          </p>
        ) : showCandidates ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-lime">
              <ScanSearch aria-hidden className="size-3.5" />
              {detection.label}
            </span>
            {candidates.length > 1 && <span className="text-xs text-faint">Search on</span>}
            {candidates.length > 1 &&
              candidates.map((c) => <Chip key={c.id} chain={c} active={c.id === chain.id} onClick={() => pickChain(c)} />)}
          </div>
        ) : recent.length > 0 && !query ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
              <History aria-hidden className="size-3.5" /> Recent
            </span>
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
                  <span className="max-w-[9rem] truncate font-mono">{r.query}</span>
                </Chip>
              );
            })}
            <button type="button" onClick={() => recentStore.clear()} className="text-xs text-faint underline-offset-2 hover:text-fg hover:underline">
              Clear
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 font-mono text-[11px] uppercase tracking-[0.14em] text-faint">Popular</span>
            {POPULAR.map((c) => (
              <Chip key={c.id} chain={c} active={userPicked && c.id === chain.id} onClick={() => pickChain(c)}>
                {c.name}
              </Chip>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
