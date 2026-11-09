import { Heart } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { LogoMark } from '@/components/brand/Logo';
import { AddToBrowserButton, OtherStoreLinks } from '@/components/extension/AddToBrowser';
import { ChainGlyph } from '@/components/search/ChainGlyph';
import { CopyButton } from '@/components/ui/CopyButton';
import { DONATION_ADDRESSES, INFO_LINKS, MAIN_NAV, MARKET_LINK, OTHER_PRODUCTS, SITE } from '@/config/site';

const DONATION_CHAIN: Record<string, string> = { 'Ethereum / Polygon': 'ethereum', Cosmos: 'cosmos' };

export function SiteFooter() {
  return (
    <footer className="mt-28 border-t border-line bg-ink-2">
      <div className="wrap grid grid-cols-2 gap-10 py-14 md:grid-cols-12">
        <div className="col-span-2 md:col-span-4">
          <div className="flex items-center gap-2.5 text-accent">
            <LogoMark className="size-8" />
            <span className="text-xl font-extrabold tracking-tight text-fg">
              Web3<span className="text-accent">Lens</span>
            </span>
          </div>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted">
            One search box for every blockchain. Simple, free and ad-free since 2018.
          </p>
          <div className="mt-6">
            <AddToBrowserButton />
            <OtherStoreLinks className="mt-3" />
          </div>
          <p className="label mb-3 mt-8">More free tools by the developer</p>
          <ul className="space-y-2 text-sm font-semibold">
            {OTHER_PRODUCTS.map((p) => (
              <li key={p.href}>
                <a href={p.href} target="_blank" rel="noopener" className="text-fg/80 underline decoration-line-strong underline-offset-2 hover:text-accent">
                  {p.name}
                </a>{' '}
                <span className="text-faint">· {p.description}</span>
              </li>
            ))}
            <li>
              <a href={SITE.author.github} target="_blank" rel="noopener" className="text-fg/80 underline decoration-line-strong underline-offset-2 hover:text-accent">
                GitHub: ritwickhalder
              </a>
            </li>
          </ul>
        </div>

        <nav aria-label="Explore" className="md:col-span-2">
          <p className="label mb-4">Explore</p>
          <ul className="space-y-3 text-[15px] font-semibold">
            {[...MAIN_NAV, { label: 'Contact', href: '/contact' }].map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-fg/80 hover:text-accent">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Information" className="md:col-span-2">
          <p className="label mb-4">Information</p>
          <ul className="space-y-3 text-[15px] font-semibold">
            {INFO_LINKS.filter((l) => l.href !== '/about').map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-fg/80 hover:text-accent">
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <a href={MARKET_LINK.href} target="_blank" rel="noopener noreferrer" className="text-fg/80 hover:text-accent">
                Markets ↗
              </a>
            </li>
          </ul>
        </nav>

        <div id="support" className="col-span-2 md:col-span-4">
          <p className="label mb-3 flex items-center gap-2 !text-redline">
            <Heart aria-hidden weight="duotone" className="size-4" /> Keep it ad-free
          </p>
          <p className="mb-4 text-[15px] text-muted">Donations keep this website simple and ad-free.</p>
          <ul className="space-y-2.5">
            {DONATION_ADDRESSES.map((d) => (
              <li key={d.label} className="flex items-center gap-3 rounded-lg border border-line bg-ink p-2.5">
                <ChainGlyph id={DONATION_CHAIN[d.label] ?? 'ethereum'} name={d.label} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-fg">{d.label}</p>
                  <p className="truncate font-mono text-xs text-muted" title={d.address}>
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
        <div className="wrap flex flex-wrap items-center justify-between gap-3 py-5 text-sm font-semibold text-faint">
          <p>
            © {new Date().getFullYear()} {SITE.domain} · Built by{' '}
            <a href={SITE.author.url} target="_blank" rel="noopener noreferrer" className="text-muted underline underline-offset-2 hover:text-fg">
              {SITE.author.name}
            </a>
            {' · '}
            <a href={SITE.author.youtube} target="_blank" rel="noopener noreferrer" className="text-muted underline underline-offset-2 hover:text-fg">
              YouTube
            </a>
          </p>
          <p>Links out to third-party explorers; not responsible for their content.</p>
        </div>
      </div>
    </footer>
  );
}
