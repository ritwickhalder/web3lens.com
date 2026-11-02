'use client';

import { ArrowRight, ArrowSquareOut, ClockCounterClockwise, Scan, Warning, X } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ChainCombobox } from '@/components/search/ChainCombobox';
import { ChainGlyph } from '@/components/search/ChainGlyph';
import { POPULAR_CHAIN_IDS } from '@/lib/chain-meta';
import { CHAINS, getChain, type Chain } from '@/lib/chains';
import { detectQuery, extractQuery } from '@/lib/detect';
import { detectionFor, fallbackNotice, openExplorer, resolveExplorer, toQueryKind, webSearchLink, type ExplorerAction } from '@/lib/explorer';
import { hasNativeSupport } from '@/lib/networks';
import { prefsStore, toggleFavouriteChain } from '@/lib/prefs';
import { recentStore } from '@/lib/recent';
import { nativeResultUrl, searchUrl } from '@/lib/search-url';

type Notice =
  | { tone: 'error' | 'info'; text: string }
  | { tone: 'down'; text: string; open: ExplorerAction; web: string };

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
export function SmartSearch({
  hidePopular = false,
  initialQuery = '',
  initialChainId,
}: {
  hidePopular?: boolean;
  /** Pre-fills the bar (result pages). */
  initialQuery?: string;
  initialChainId?: string;
}) {
  const initialChain = initialChainId ? getChain(initialChainId) : undefined;
  const [picked, setPicked] = useState<Chain>(initialChain ?? CHAINS[0]);
  const [userPicked, setUserPicked] = useState(Boolean(initialChain));
  const [query, setQuery] = useState(initialQuery);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [extractedFrom, setExtractedFrom] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const recent = useSyncExternalStore(recentStore.subscribe, recentStore.getSnapshot, recentStore.getServerSnapshot);
  const prefs = useSyncExternalStore(prefsStore.subscribe, prefsStore.getSnapshot, prefsStore.getServerSnapshot);

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

  /** Pasted payment URIs and explorer links are reduced to the address or hash inside them. */
  function setFromInput(value: string) {
    const extracted = extractQuery(value);
    if (extracted.from && extracted.query !== value.trim()) {
      setQuery(extracted.query);
      setExtractedFrom(extracted.from === 'url' ? `Taken from the ${extracted.host} link you pasted` : 'Taken from the payment link you pasted');
    } else {
      setQuery(value);
      setExtractedFrom(null);
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = extractQuery(query).query.trim();
    if (!q) {
      setNotice({ tone: 'error', text: 'Paste an address, transaction hash, block number or name first.' });
      inputRef.current?.focus();
      return;
    }
    const d = detectQuery(q);
    if (d?.kind === 'secret') {
      setNotice({ tone: 'error', text: d.note ?? 'This looks like a secret. Web3Lens will not search it.' });
      return;
    }
    const resolved = resolveExplorer(chain, q, { explorer: prefs.explorers[chain.id] });
    recentStore.add({ chainId: chain.id, query: q });
    const dc = detectionFor(chain, q);
    const kind = toQueryKind(dc);
    if (prefs.searchAction === 'results' && dc && dc.checksum !== 'invalid' && dc.network !== 'testnet' && hasNativeSupport(chain.id, kind)) {
      // A 0x value with an auto-picked chain gets the cross-chain overview; otherwise the chain's own page.
      const evmFormat = dc.format === 'evm-address' || dc.format === 'evm-tx';
      router.push(evmFormat && !userPicked ? searchUrl(dc.normalized) : (nativeResultUrl(chain.id, kind, dc.normalized) ?? searchUrl(q, chain.id)));
      return;
    }
    if (resolved.unreachable) {
      const host = new URL(resolved.action.kind === 'url' ? resolved.action.href : resolved.action.action).hostname;
      const when = resolved.unreachable.checkedAt ? new Date(resolved.unreachable.checkedAt).toLocaleDateString() : 'the last check';
      setNotice({
        tone: 'down',
        text: `${chain.name}'s explorer (${host}) did not respond on ${when}. It may be offline for good.`,
        open: resolved.action,
        web: webSearchLink(chain, q),
      });
      return;
    }
    setNotice(resolved.fallback ? { tone: 'info', text: fallbackNotice(chain) } : null);
    openExplorer(resolved.action);
  }

  return (
    <div className="w-full text-left">
      <form
        ref={formRef}
        onSubmit={onSubmit}
        noValidate
        className="marks relative flex flex-col gap-1 rounded-2xl border border-line-strong bg-ink-2 p-2 shadow-[0_24px_60px_-24px_rgb(0_0_0/0.8)] transition-colors focus-within:border-accent md:flex-row md:items-center"
      >
        <ChainCombobox
          chains={CHAINS}
          value={chain}
          onChange={pickChain}
          auto={!userPicked && candidates.includes(chain)}
          favourites={prefs.favouriteChains}
          onToggleFavourite={toggleFavouriteChain}
        />
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
              setFromInput(e.target.value);
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
                setExtractedFrom(null);
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

      <div className="mt-4 flex min-h-[36px] items-center justify-center" aria-live="polite">
        {notice?.tone === 'down' ? (
          <div role="status" className="flex w-full flex-wrap items-center gap-3 rounded-lg border border-redline/40 bg-redline/10 px-4 py-2.5 text-[15px] font-semibold text-redline">
            <Warning aria-hidden weight="bold" className="size-5 shrink-0" />
            <span className="min-w-0 flex-1">{notice.text}</span>
            <a href={notice.web} target="_blank" rel="noopener noreferrer" className="rounded-md bg-redline px-3 py-1 text-sm font-extrabold text-ink">
              Search the web
            </a>
            <button type="button" onClick={() => openExplorer(notice.open)} className="text-sm font-bold underline underline-offset-2">
              Open anyway
            </button>
          </div>
        ) : notice ? (
          <p
            role={notice.tone === 'error' ? 'alert' : 'status'}
            className={`w-full rounded-lg border px-4 py-2.5 text-[15px] font-semibold ${
              notice.tone === 'error' ? 'border-danger/40 bg-danger/10 text-danger' : 'border-redline/40 bg-redline/10 text-redline'
            }`}
          >
            {notice.text}
          </p>
        ) : detection?.kind === 'secret' ? (
          <p role="alert" className="w-full rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-[15px] font-semibold text-danger">
            {detection.note}
          </p>
        ) : detection && candidates.length > 0 ? (
          <div className="flex w-full flex-col items-center gap-2">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="mr-1 flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5 text-sm font-bold text-accent">
                <Scan aria-hidden weight="bold" className="size-4" />
                {detection.label}
                {detection.checksum === 'valid' && <span className="font-semibold text-accent/80">· checksum ok</span>}
              </span>
              {/* Offer the matching chains when there are several, or when the user's pick doesn't match the input. */}
              {(candidates.length > 1 || !candidates.includes(chain)) && (
                <>
                  <RowLabel>{candidates.includes(chain) ? 'Search on' : 'Switch to'}</RowLabel>
                  {candidates.slice(0, 6).map((c) => (
                    <Chip key={c.id} chain={c} active={c.id === chain.id} onClick={() => pickChain(c)} />
                  ))}
                </>
              )}
              <Link
                href={searchUrl(detection.normalized, candidates.includes(chain) ? chain.id : undefined)}
                className="flex items-center gap-1 px-2 text-sm font-bold text-muted hover:text-accent"
              >
                {candidates.length > 6 ? `All ${candidates.length} chains` : 'Results page'}
                <ArrowSquareOut aria-hidden weight="bold" className="size-3.5" />
              </Link>
            </div>
            {(detection.note || extractedFrom) && (
              <p className={`text-sm font-semibold ${detection.note ? 'text-redline' : 'text-faint'}`}>{detection.note ?? extractedFrom}</p>
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
        ) : hidePopular ? (
          <p className="hidden items-center text-sm font-semibold text-faint md:flex">
            Press <kbd className="mx-1.5 rounded border border-line px-1.5 py-0.5 font-mono text-xs text-muted">/</kbd> or
            <kbd className="mx-1.5 rounded border border-line px-1.5 py-0.5 font-mono text-xs text-muted">Ctrl K</kbd> to search from
            anywhere on the page
          </p>
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
