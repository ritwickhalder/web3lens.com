import { Heart } from 'lucide-react';
import Link from 'next/link';
import { LogoMark } from '@/components/brand/Logo';
import { CopyButton } from '@/components/ui/CopyButton';
import { DONATION_ADDRESSES, INFO_LINKS, MAIN_NAV, NEWS_LINKS, SITE } from '@/config/site';

/** Site footer: navigation columns plus the donation addresses (replaces the old fixed donation bar). */
export function SiteFooter() {
  return (
    <footer className="relative mt-24 border-t border-line bg-ink-2/60">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-14 md:grid-cols-[1.3fr_1fr_1fr_1.6fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <LogoMark className="size-7" />
            <span className="font-display text-sm font-semibold">
              Web3<span className="text-lime">Lens</span>
            </span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
            One search box for every blockchain. Simple, free and ad-free since 2018.
          </p>
        </div>

        <nav aria-label="Explore">
          <p className="eyebrow mb-4">Explore</p>
          <ul className="space-y-2.5 text-sm">
            {[...MAIN_NAV, { label: 'Contact', href: '/contact' }].map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-muted hover:text-fg">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Information">
          <p className="eyebrow mb-4">Information</p>
          <ul className="space-y-2.5 text-sm">
            {INFO_LINKS.filter((l) => l.href !== '/about').map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-muted hover:text-fg">
                  {l.label}
                </Link>
              </li>
            ))}
            {NEWS_LINKS.slice(3, 5).map((l) => (
              <li key={l.href}>
                <a href={l.href} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-fg">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div id="support">
          <p className="eyebrow mb-4 flex items-center gap-2">
            <Heart aria-hidden className="size-3.5" /> Keep it ad-free
          </p>
          <p className="mb-4 text-sm text-muted">Donations keep this website simple and ad-free. Spread the crypto-love.</p>
          <ul className="space-y-2.5">
            {DONATION_ADDRESSES.map((d) => (
              <li key={d.label} className="flex items-center gap-3 rounded-xl border border-line bg-white/[0.02] p-2.5 pl-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] uppercase tracking-wider text-faint">{d.label}</p>
                  <p className="truncate font-mono text-xs text-fg/85" title={d.address}>
                    {d.address}
                  </p>
                </div>
                <CopyButton value={d.address} label={`Copy ${d.label} address`} />
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-5 text-xs text-faint">
          <p>
            © {new Date().getFullYear()} {SITE.domain} · Built by{' '}
            <a href={SITE.author.url} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-fg">
              {SITE.author.name}
            </a>
          </p>
          <p>Web3Lens links out to third-party explorers and isn't responsible for their content.</p>
        </div>
      </div>
    </footer>
  );
}
