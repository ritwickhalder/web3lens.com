'use client';

import { ArrowUpRight, CaretDown, List, Newspaper, X } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AccountButton } from '@/components/account/AccountButton';
import { Logo } from '@/components/brand/Logo';
import { AddToBrowserButton } from '@/components/extension/AddToBrowser';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { MAIN_NAV, MARKET_LINK, NEWS_LINKS } from '@/config/site';

const navItem =
  'flex h-10 items-center gap-1.5 rounded-md px-3.5 text-[15px] font-semibold text-fg/80 transition-colors hover:bg-ink-3 hover:text-fg';

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

function NewsMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
        News
        <CaretDown aria-hidden weight="bold" className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-line-strong bg-ink-2 shadow-2xl shadow-black/50">
          <p className="flex items-center gap-2 border-b border-line px-4 py-3 text-sm font-bold text-fg">
            <Newspaper aria-hidden weight="duotone" className="size-5 text-accent" /> Crypto news sources
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

/** Full-width sticky navbar. Below xl it collapses into a sheet. */
export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/90 backdrop-blur-md">
      <nav className="wrap flex h-[72px] items-center gap-4">
        <Link href="/" aria-label="Web3Lens home" onClick={close} className="shrink-0">
          <Logo />
        </Link>

        <div className="ml-auto hidden items-center gap-1 xl:flex">
          {MAIN_NAV.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(pathname, link.href) ? 'page' : undefined}
              className={`${navItem} aria-[current=page]:bg-ink-3 aria-[current=page]:text-accent`}
            >
              {link.label}
            </Link>
          ))}
          <NewsMenu />
          <a href={MARKET_LINK.href} target="_blank" rel="noopener noreferrer" className={navItem}>
            Markets
            <ArrowUpRight aria-hidden weight="bold" className="size-3.5" />
          </a>
          <ThemeToggle />
          <AccountButton className="ml-2" />
          <Link
            href="/contact"
            className="ml-2 flex h-10 items-center rounded-md border border-line-strong px-5 text-[15px] font-bold text-fg transition-colors hover:border-accent hover:text-accent"
          >
            Contact
          </Link>
          <span className="ml-2 hidden 2xl:block">
            <AddToBrowserButton size="sm" />
          </span>
        </div>

        <ThemeToggle className="ml-auto xl:hidden" />
        <button
          type="button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
          className="grid size-11 place-items-center rounded-md border border-line-strong text-fg xl:hidden"
        >
          {menuOpen ? <X weight="bold" className="size-5" /> : <List weight="bold" className="size-5" />}
        </button>
      </nav>

      {menuOpen && (
        <div className="border-t border-line bg-ink-2 xl:hidden">
          <div className="wrap grid grid-cols-1 gap-8 py-6 sm:grid-cols-2">
            <div>
              {[...MAIN_NAV, { label: 'Contact', href: '/contact' }].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={close}
                  aria-current={isActive(pathname, link.href) ? 'page' : undefined}
                  className="block border-b border-line py-3.5 text-2xl font-extrabold tracking-tight text-fg aria-[current=page]:text-accent"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div>
              <AccountButton className="mb-8 w-fit" onNavigate={close} />
              <p className="label mb-3">Browser extension</p>
              <AddToBrowserButton className="mb-8" />
              <p className="label mb-3">News & markets</p>
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
  );
}
