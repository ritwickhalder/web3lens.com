'use client';

import { ArrowUpRight, ChevronDown, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Logo } from '@/components/brand/Logo';
import { MAIN_NAV, MARKET_LINK, NEWS_LINKS } from '@/config/site';

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
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded-full px-3.5 py-2 text-sm text-muted transition-colors hover:text-fg"
      >
        News
        <ChevronDown aria-hidden className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="glass absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl bg-ink-2/95 p-2 shadow-2xl shadow-black/60">
          <p className="eyebrow px-3 pb-1 pt-2">Crypto news sources</p>
          <div className="max-h-80 overflow-y-auto">
            {NEWS_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between rounded-lg px-3 py-2 text-sm text-fg/80 hover:bg-white/5 hover:text-fg"
              >
                {link.label}
                <ArrowUpRight aria-hidden className="size-3.5 text-faint group-hover:text-lime" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Sticky glass navbar. Below md it collapses into a full-width sheet. */
export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/70 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5">
        <Link href="/" aria-label="Web3Lens home" onClick={close}>
          <Logo />
        </Link>

        <div className="ml-auto hidden items-center gap-1 md:flex">
          {MAIN_NAV.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(pathname, link.href) ? 'page' : undefined}
              className="rounded-full px-3.5 py-2 text-sm text-muted transition-colors hover:text-fg aria-[current=page]:bg-white/[0.06] aria-[current=page]:text-fg"
            >
              {link.label}
            </Link>
          ))}
          <NewsMenu />
          <a
            href={MARKET_LINK.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-full px-3.5 py-2 text-sm text-muted transition-colors hover:text-fg"
          >
            Markets
            <ArrowUpRight aria-hidden className="size-3.5" />
          </a>
        </div>

        <Link
          href="/contact"
          className="hidden rounded-full border border-line-strong px-4 py-2 text-sm text-fg transition-colors hover:border-lime/60 hover:text-lime md:block"
        >
          Contact
        </Link>

        <button
          type="button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
          className="ml-auto grid size-10 place-items-center rounded-full border border-line text-fg md:hidden"
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {menuOpen && (
        <div className="border-t border-line bg-ink-2/95 px-5 pb-6 pt-3 md:hidden">
          {[...MAIN_NAV, { label: 'Contact', href: '/contact' }].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={close}
              aria-current={isActive(pathname, link.href) ? 'page' : undefined}
              className="block border-b border-line py-3.5 font-display text-lg text-fg/85 aria-[current=page]:text-lime"
            >
              {link.label}
            </Link>
          ))}
          <p className="eyebrow mb-2 mt-5">News & markets</p>
          <div className="flex flex-wrap gap-2">
            {[MARKET_LINK, ...NEWS_LINKS.slice(0, 7)].map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-line px-3 py-1.5 text-xs text-muted"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
