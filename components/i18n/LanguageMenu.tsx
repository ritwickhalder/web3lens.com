'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { usePathname } from 'next/navigation';
import { DEFAULT_LOCALE, LOCALES, LOCALE_META, LOCALIZED_PATHS, localizePath, type Locale } from '@/lib/i18n/config';

const STYLE = {
  /** The corner pill (FloatingLanguageMenu): same trigger, with its own surface since it sits over the page. */
  floating: "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 border border-line-strong bg-ink-2 text-fg/70 shadow-md hover:border-accent hover:text-fg",
  trigger: "inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-[13px] font-bold text-fg/60 transition-colors hover:bg-ink-3 hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
  triggerOpen: "bg-ink-3 text-fg",
  panel: "rounded-xl border border-line-strong bg-ink-2 p-2 shadow-2xl shadow-black/50",
  heading: "text-faint",
  item: "text-fg/80 hover:bg-ink-3 hover:text-fg focus-visible:bg-ink-3 focus-visible:text-fg",
  itemCurrent: "bg-ink-3 font-bold text-accent",
  note: "border-line text-faint",
};

const PREFIXES = LOCALES.filter((l) => l !== DEFAULT_LOCALE).map((l) => l.toLowerCase());

/** The page a URL shows, without its language prefix: `/de/pricing` → `/pricing`, `/blog/x` stays. */
function pagePath(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  // Internal rewrite targets of the translated pages (`/intl-home/de`), in case they leak into the router.
  if (parts[0] === 'intl-home') return '/';
  if (parts[0] === 'intl-pricing') return '/pricing';
  if (parts.length && PREFIXES.includes(parts[0].toLowerCase())) parts.shift();
  return '/' + parts.join('/');
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

/**
 * The language picker in the header: a quiet globe and language code that opens
 * a two-column list of real links (so it also works as plain navigation, and crawlers find every language). On the
 * homepage and /pricing each link opens the same page in that language; every
 * other page is English-only, so there the links open the translated homepage.
 */
export function LanguageMenu({
  locale,
  label,
  className = '',
  codeClassName = '',
  floating = false,
}: {
  locale: Locale;
  label: string;
  className?: string;
  /** Lets a crowded header show only the globe at some widths (e.g. `hidden 2xl:inline`). */
  codeClassName?: string;
  /** Pill look for the floating corner picker. */
  floating?: boolean;
}) {
  const pathname = usePathname() ?? '/';
  const page = pagePath(pathname);
  const translated = (LOCALIZED_PATHS as readonly string[]).includes(page);
  // Open state is tied to the page it was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (next: boolean | ((o: boolean) => boolean)) =>
    setOpenOn((prev) => ((typeof next === 'function' ? next(prev === pathname) : next) ? pathname : null));
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const panelId = useId();

  const hrefFor = (l: Locale) => (translated ? localizePath(page, l) : l === locale ? pathname : localizePath('/', l));

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpenOn(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    // Start on the current language, and fade in unless the reader prefers less motion.
    linkRefs.current[LOCALES.indexOf(locale)]?.focus({ preventScroll: true });
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      panelRef.current?.animate(
        [
          { opacity: 0, transform: 'translateY(-4px) scale(0.98)' },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 140, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
      );
    }
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, locale]);

  function onKeyDown(e: KeyboardEvent) {
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
      return;
    }
    const links = linkRefs.current;
    const i = links.indexOf(document.activeElement as HTMLAnchorElement);
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 2, ArrowUp: -2 }[e.key];
    let next: number | undefined;
    if (step !== undefined) next = i < 0 ? 0 : Math.min(Math.max(i + step, 0), LOCALES.length - 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = LOCALES.length - 1;
    if (next === undefined) return;
    e.preventDefault();
    links[next]?.focus();
  }

  return (
    <div ref={rootRef} className={`relative ${className}`} onKeyDown={onKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${label}: ${LOCALE_META[locale].nativeName}`}
        title={label}
        className={floating ? STYLE.floating : `${STYLE.trigger} ${open ? STYLE.triggerOpen : ''}`}
      >
        <GlobeIcon className="h-4 w-4 shrink-0" />
        <span className={`uppercase tracking-wide ${codeClassName}`}>{locale}</span>
        <svg className={`h-3 w-3 shrink-0 opacity-60 ${codeClassName} transition-transform duration-200 ${open ? 'rotate-180' : ''}`} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 4.5 6 7.5 9 4.5" />
        </svg>
      </button>

      {/* Always in the HTML (hidden until opened), so crawlers and no-JS visitors get the links too. */}
      <div
        ref={panelRef}
        id={panelId}
        hidden={!open}
        className={`absolute right-0 top-full z-[70] mt-2 w-[19rem] max-w-[calc(100vw-1.5rem)] origin-top-right ${STYLE.panel}`}
      >
        <p className={`px-2.5 pb-1.5 pt-1 text-[11px] font-bold uppercase tracking-wider ${STYLE.heading}`}>{label}</p>
        <ul className="grid grid-cols-2 gap-0.5">
          {LOCALES.map((l, i) => {
            const current = l === locale;
            return (
              <li key={l}>
                <a
                  ref={(el) => {
                    linkRefs.current[i] = el;
                  }}
                  href={hrefFor(l)}
                  hrefLang={l}
                  lang={l}
                  aria-current={current ? 'true' : undefined}
                  onClick={() => setOpen(false)}
                  className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-[13.5px] leading-tight outline-none transition-colors ${current ? STYLE.itemCurrent : STYLE.item}`}
                >
                  <span className="truncate">{LOCALE_META[l].nativeName}</span>
                  {current && <CheckIcon className="h-3.5 w-3.5 shrink-0" />}
                </a>
              </li>
            );
          })}
        </ul>
        {!translated && (
          <p lang="en" className={`mt-1.5 border-t px-2.5 pb-1 pt-2 text-[11.5px] leading-snug ${STYLE.note}`}>
            This page is in English. Other languages open the translated homepage.
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * The language picker as a small pill fixed in the window's top-right corner, so it stays out of the header and the
 * page. Render it outside <header>: a backdrop-filter on the header would make `fixed` relative to the header.
 * `className` sets the vertical position (centred on the header row). The header keeps clear of it with
 * <LanguageMenuRoom/>.
 */
export function FloatingLanguageMenu({ className = '', ...props }: { locale: Locale; label: string; className?: string }) {
  return (
    <div className={`fixed right-2 z-[110] sm:right-3 ${className}`}>
      <LanguageMenu {...props} floating codeClassName="hidden xl:inline" />
    </div>
  );
}

/**
 * Last item of the header row: takes up only the width the corner pill needs beyond the page margin, so on narrow
 * windows the header's own buttons never sit under it, and on wide ones (margin wide enough) it is 0px.
 * `maxWidth` is the header container's max-width. The pill's footprint is --lang-fab (globals.css).
 */
export function LanguageMenuRoom({ maxWidth }: { maxWidth: string }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none block shrink-0"
      style={{ width: `max(0px, calc(var(--lang-fab, 6rem) - max(0px, (100vw - ${maxWidth}) / 2)))` }}
    />
  );
}
