'use client';

import { ArrowUpRight, CaretDown, List, Newspaper, X } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { AccountButton, MobileAccountPanel } from '@/components/account/AccountButton';
import { Logo } from '@/components/brand/Logo';
import { AddToBrowserButton } from '@/components/extension/AddToBrowser';
import { FloatingLanguageMenu, LanguageMenuRoom } from '@/components/i18n/LanguageMenu';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { MAIN_NAV, MARKET_LINK, NEWS_LINKS, PRO_ON_SALE } from '@/config/site';
import { useLocale, useTx } from '@/lib/i18n/client';
import { localizePath } from '@/lib/i18n/config';

/** 'Pricing' joins the nav only once Pro is on sale (no marketing before launch). */
const NAV = PRO_ON_SALE ? [...MAIN_NAV, { label: 'Pricing', href: '/pricing' }] : MAIN_NAV;

const navItem =
  'flex h-10 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-[15px] font-semibold text-fg/80 transition-colors hover:bg-ink-3 hover:text-fg min-[1800px]:px-3.5';

/** `home` is the homepage in the page's language (`/` or `/de`); the homepage is active only on itself. */
function isActive(pathname: string, href: string, home = '/') {
  return href === home ? pathname === home : pathname.startsWith(href);
}

function NewsMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const tx = useTx();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={navItem}>
        {tx('News')}
        <CaretDown aria-hidden weight="bold" className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-line-strong bg-ink-2 shadow-2xl shadow-black/50">
          <p className="flex items-center gap-2 border-b border-line px-4 py-3 text-sm font-bold text-fg">
            <Newspaper aria-hidden weight="duotone" className="size-5 text-accent" /> {tx('Crypto news sources')}
          </p>
          <div className="max-h-96 overflow-y-auto py-1">
            {NEWS_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between px-4 py-2 text-sm font-semibold text-fg/80 hover:bg-ink-3 hover:text-fg"
              >
                {link.label}
                <ArrowUpRight aria-hidden weight="bold" className="size-3.5 text-faint group-hover:text-accent" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * True while the inline nav bar does not fit its row (long translated labels, the sign-in button, odd widths), so
 * the header falls back to the menu sheet instead of clipping. Remembers the width the bar needed, to bring it back
 * once the row is wide enough again.
 */
/** The row's items run past its content box (scrollWidth misses a shrink-0 item pushed past the padding, like the language-pill room). */
function overflows(nav: HTMLElement): boolean {
  if (nav.scrollWidth > nav.clientWidth + 1) return true;
  const right = nav.getBoundingClientRect().right - (parseFloat(getComputedStyle(nav).paddingRight) || 0);
  return [...nav.children].some((c) => c.getBoundingClientRect().right > right + 1);
}

function useBarOverflow(navRef: RefObject<HTMLElement | null>, barRef: RefObject<HTMLElement | null>) {
  const [cramped, setCramped] = useState(false);
  const needed = useRef(0);
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    // ResizeObserver reports once on observe, so this also runs on first paint.
    const observer = new ResizeObserver(() => {
      if (cramped) {
        if (nav.clientWidth >= needed.current) setCramped(false);
      } else if (barRef.current?.offsetParent && overflows(nav)) {
        needed.current = nav.scrollWidth;
        setCramped(true);
      }
    });
    observer.observe(nav);
    if (barRef.current) observer.observe(barRef.current);
    return () => observer.disconnect();
  }, [cramped, navRef, barRef]);
  return cramped;
}

/** Full-width sticky navbar. Below 1360px (2xl on translated pages) it collapses into a sheet. */
export function SiteHeader() {
  const pathname = usePathname();
  const tx = useTx();
  const locale = useLocale();
  // Search (the homepage) and Pricing point at the page in the reader's language; every other page is English.
  const nav = NAV.map((l) => ({ ...l, href: localizePath(l.href, locale) }));
  const home = localizePath('/', locale);
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);
  const navRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  // Translated nav labels run longer (German, Russian…), so translated pages keep the menu sheet up to 2xl and
  // show the extension button only on very wide screens. Literal class names, so Tailwind sees them.
  const english = locale === 'en';
  const cramped = useBarOverflow(navRef, barRef);
  // English fits from 1360px: the right edge keeps room for the floating language pill (LanguageMenuRoom).
  const bar = cramped ? '' : english ? 'min-[1360px]:flex' : '2xl:flex';
  const sheetOnly = cramped ? '' : english ? 'min-[1360px]:hidden' : '2xl:hidden';
  const extension = english ? '2xl:block' : 'min-[1800px]:block';

  // Keep the page behind the open menu from scrolling, so the menu itself scrolls on short screens.
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  return (
    <>
      {/* Language: a pill floating in the top-right corner, out of the nav (outside <header>: its backdrop blur would trap `fixed`). */}
      <FloatingLanguageMenu locale={locale} label={tx('Language')} className="top-[18px]" />
      <header className="sticky top-0 z-40 border-b border-line bg-ink/90 backdrop-blur-md">
      <nav ref={navRef} className="wrap flex h-[72px] items-center gap-4">
        <Link href={home} aria-label={tx('Web3Lens home')} onClick={close} className="shrink-0">
          <Logo />
        </Link>

        <div ref={barRef} className={`ml-auto hidden items-center gap-1 ${bar}`}>
          {nav.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(pathname, link.href, home) ? 'page' : undefined}
              className={`${navItem} aria-[current=page]:bg-ink-3 aria-[current=page]:text-accent`}
            >
              {tx(link.label)}
            </Link>
          ))}
          <NewsMenu />
          <a href={MARKET_LINK.href} target="_blank" rel="noopener noreferrer" className={navItem}>
            {tx('Markets')}
            <ArrowUpRight aria-hidden weight="bold" className="size-3.5" />
          </a>
          <ThemeToggle />
          <AccountButton className="ml-2" />
          <Link
            href="/contact"
            className="ml-2 flex h-10 items-center rounded-md border border-line-strong px-5 text-[15px] font-bold text-fg transition-colors hover:border-accent hover:text-accent"
          >
            {tx('Contact')}
          </Link>
          <span className={`ml-2 hidden ${extension}`}>
            <AddToBrowserButton size="sm" />
          </span>
        </div>

        <ThemeToggle className={`ml-auto ${sheetOnly}`} />
        <button
          type="button"
          aria-label={menuOpen ? tx('Close menu') : tx('Open menu')}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
          className={`grid size-11 place-items-center rounded-md border border-line-strong text-fg ${sheetOnly}`}
        >
          {menuOpen ? <X weight="bold" className="size-5" /> : <List weight="bold" className="size-5" />}
        </button>
        {/* Keeps the bar clear of the corner language pill when the page margin is too narrow for it. */}
        <LanguageMenuRoom maxWidth="1880px" />
      </nav>

      {menuOpen && (
        <div className={`max-h-[calc(100dvh-72px)] overflow-y-auto overscroll-contain border-t border-line bg-ink-2 ${sheetOnly}`}>
          <div className="wrap grid grid-cols-1 gap-8 py-5 sm:grid-cols-2">
            <div>
              <div className="mb-5">
                <MobileAccountPanel onNavigate={close} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[...nav, { label: 'Contact', href: '/contact' }].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={close}
                    aria-current={isActive(pathname, link.href, home) ? 'page' : undefined}
                    className="flex h-12 items-center rounded-md border border-line px-4 text-base font-bold text-fg transition-colors hover:border-line-strong aria-[current=page]:border-accent aria-[current=page]:text-accent"
                  >
                    {tx(link.label)}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <p className="label mb-3">{tx('Browser extension')}</p>
              <AddToBrowserButton className="mb-8" />
              <p className="label mb-3">{tx('News & markets')}</p>
              <div className="flex flex-wrap gap-2">
                {[MARKET_LINK, ...NEWS_LINKS.slice(0, 9)].map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-line px-3 py-2 text-sm font-semibold text-fg/80 hover:border-line-strong hover:text-fg"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      </header>
    </>
  );
}
