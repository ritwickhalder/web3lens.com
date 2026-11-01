'use client';

import { ChevronDown, Menu } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { INFO_LINKS, NEWS_LINKS, SITE, type NavLink } from '@/config/site';

const linkClass = 'block whitespace-nowrap px-3 py-2 text-white/90 hover:text-white lg:px-2 xl:px-3';

function NavAnchor({ link, className, onNavigate }: { link: NavLink; className: string; onNavigate?: () => void }) {
  if (link.external) {
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer" className={className}>
        {link.label}
      </a>
    );
  }
  return (
    <Link href={link.href} className={className} onClick={onNavigate}>
      {link.label}
    </Link>
  );
}

function Dropdown({ label, links, onNavigate }: { label: string; links: NavLink[]; onNavigate: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLLIElement>(null);

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
    <li ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`${linkClass} flex w-full items-center gap-1`}
      >
        {label}
        <ChevronDown aria-hidden className="size-4" />
      </button>
      {open && (
        <div className="z-50 min-w-[10rem] rounded border border-black/15 bg-white py-2 text-left shadow-lg lg:absolute lg:left-0 lg:top-full lg:mt-0.5">
          {links.map((link) => (
            <NavAnchor
              key={link.href}
              link={link}
              className="block whitespace-nowrap px-6 py-1 text-[#212529] hover:bg-[#f8f9fa]"
              onNavigate={() => {
                setOpen(false);
                onNavigate();
              }}
            />
          ))}
        </div>
      )}
    </li>
  );
}

/** Fixed top navbar (replaces legacy/menu.js). Collapses below the lg breakpoint, as Bootstrap did. */
export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);

  return (
    <header className="fixed inset-x-0 top-0 z-40 bg-nav/90 text-left">
      <nav className="flex flex-wrap items-center px-4 py-2 lg:flex-nowrap">
        <Link href="/" className="mr-4 flex items-center gap-2 py-1 text-xl text-white">
          <Image src="/logo.png" alt="" width={34} height={33} priority />
          {SITE.domain}
        </Link>
        <button
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
          className="ml-auto rounded border border-white/10 p-1.5 text-white/70 lg:hidden"
        >
          <Menu className="size-7" />
        </button>
        <ul className={`${menuOpen ? 'flex' : 'hidden'} w-full flex-col lg:flex lg:w-auto lg:flex-row lg:items-center`}>
          <li>
            <NavAnchor link={{ label: 'CoinMarketCap.com', href: 'https://coinmarketcap.com/', external: true }} className={linkClass} />
          </li>
          <li>
            <NavAnchor link={{ label: 'Crypto Directory', href: '/directory' }} className={linkClass} onNavigate={close} />
          </li>
          <Dropdown label="Crypto News" links={NEWS_LINKS} onNavigate={close} />
          <li>
            <NavAnchor link={{ label: 'Blockchain Guide', href: '/blockchain-guide' }} className={linkClass} onNavigate={close} />
          </li>
          <Dropdown label="Information" links={INFO_LINKS} onNavigate={close} />
          <li>
            <NavAnchor link={{ label: 'Contact Us', href: '/contact' }} className={linkClass} onNavigate={close} />
          </li>
        </ul>
      </nav>
    </header>
  );
}
