'use client';

import { ArrowUpRight, PuzzlePiece } from '@phosphor-icons/react/dist/ssr';
import { useSyncExternalStore } from 'react';
import { EXTENSION_STORES, extensionInstallHref } from '@/config/site';
import { detectBrowser, type BrowserMatch } from '@/lib/browser';

/** Server render (and first paint) assumes Chrome, the most common desktop browser; the client corrects it. */
const SERVER_MATCH: BrowserMatch = { store: 'chrome', name: 'Chrome' };
let clientMatch: BrowserMatch | null = null;

function readBrowser(): BrowserMatch {
  if (!clientMatch) {
    const nav = navigator as Navigator & { userAgentData?: { brands?: { brand: string }[] }; brave?: unknown };
    clientMatch = detectBrowser(nav.userAgent, nav.userAgentData?.brands?.map((b) => b.brand) ?? [], Boolean(nav.brave));
  }
  return clientMatch;
}

const noopSubscribe = () => () => {};

/** The visitor's browser and its extension store, detected after hydration. */
export function useBrowser(): BrowserMatch {
  return useSyncExternalStore(noopSubscribe, readBrowser, () => SERVER_MATCH);
}

function linkProps(href: string) {
  return href.startsWith('http') ? { href, target: '_blank', rel: 'noopener noreferrer' } : { href };
}

const SIZES = {
  sm: 'h-10 gap-2 rounded-md px-4 text-[15px] font-bold',
  md: 'gap-2 rounded-lg px-4 py-2.5 text-sm font-extrabold',
  lg: 'gap-2.5 rounded-xl px-7 py-4 text-base font-extrabold',
};

/**
 * "Add to Chrome" / "Add to Firefox" / "Add to Edge", matched to the visitor's browser. Chromium forks (Brave,
 * Opera, Vivaldi…) get the Chrome Web Store; browsers with no store (Safari, mobile Chrome) get the extension page.
 */
export function AddToBrowserButton({ size = 'md', className = '' }: { size?: keyof typeof SIZES; className?: string }) {
  const { store, name } = useBrowser();
  const href = store ? extensionInstallHref(store) : '/extension#install';
  return (
    <a
      {...linkProps(href)}
      className={`inline-flex shrink-0 items-center whitespace-nowrap bg-accent text-ink no-underline transition-colors hover:bg-accent-hover ${SIZES[size]} ${className}`}
    >
      <PuzzlePiece aria-hidden weight="bold" className={size === 'lg' ? 'size-5' : 'size-4'} />
      {store ? `Add to ${name}` : 'Get the extension'}
      {store && <span className="sr-only"> (opens the {EXTENSION_STORES.find((s) => s.id === store)?.name} store)</span>}
    </a>
  );
}

/** Links to the stores other than the visitor's own, e.g. "Also for Firefox and Microsoft Edge". */
export function OtherStoreLinks({ className = '' }: { className?: string }) {
  const { store } = useBrowser();
  const others = EXTENSION_STORES.filter((s) => s.id !== store);
  return (
    <p className={`text-sm font-semibold text-muted ${className}`}>
      {store ? 'Also for ' : 'Available for '}
      {others.map((s, i) => (
        <span key={s.id}>
          {i > 0 && (i === others.length - 1 ? ' and ' : ', ')}
          <a {...linkProps(extensionInstallHref(s.id))} className="inline-flex items-center gap-0.5 font-bold text-fg underline decoration-line-strong underline-offset-2 hover:text-accent">
            {s.name}
            <ArrowUpRight aria-hidden weight="bold" className="size-3" />
          </a>
        </span>
      ))}
    </p>
  );
}
