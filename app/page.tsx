import {
  ArrowRight,
  BookOpenText,
  Compass,
  CursorClick,
  GasPump,
  Heart,
  PuzzlePiece,
  Scan,
  ShieldCheck,
  Stack,
  TreeStructure,
  Wallet,
  Wrench,
} from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { PopularChains } from '@/components/home/PopularChains';
import { TryExamples } from '@/components/home/TryExamples';
import { ChainGlyph } from '@/components/search/ChainGlyph';
import { SmartSearch } from '@/components/search/SmartSearch';
import { CHAINS } from '@/lib/chains';

const HERO_COINS = ['bitcoin', 'ethereum', 'solana', 'binancecoin', 'ripple'];

const STATS = [
  { value: String(CHAINS.length), label: 'Blockchains' },
  { value: '15+', label: 'Formats detected' },
  { value: '0', label: 'Ads or sign-ups' },
  { value: '2018', label: 'Online since' },
];

const STEPS = [
  {
    icon: Scan,
    title: 'Paste anything',
    body: 'An address, a transaction hash, a block number or an ENS name. Web3Lens recognises the format as you type.',
  },
  {
    icon: Stack,
    title: 'Pick the chain, or let us',
    body: `The matching chain is pre-selected and alternatives are one click away. Or choose any of ${CHAINS.length} chains yourself.`,
  },
  {
    icon: CursorClick,
    title: 'Land on the right explorer',
    body: 'Your search opens on that chain’s block explorer in a new tab. No sign-up, no ads, no tracking of what you search.',
  },
];

const ROADMAP = [
  { icon: Wallet, title: 'Address snapshot', body: 'Balance, token holdings and recent activity, right here before you click out.' },
  { icon: TreeStructure, title: 'Multichain lookup', body: 'One 0x address checked across Ethereum, Base, Arbitrum, Optimism and more.' },
  { icon: PuzzlePiece, title: 'Browser extension', body: 'Right-click any address on any page, or type w3 in the address bar.' },
  { icon: ShieldCheck, title: 'Risk flags', body: 'Warnings for sanctioned and reported scam addresses before you send funds.' },
  { icon: GasPump, title: 'Gas & fees', body: 'Live gas prices and Bitcoin fee estimates at a glance.' },
  { icon: Wrench, title: 'Developer toolkit', body: 'Unit converter, calldata decoder, checksum and timestamp tools.' },
];

function SectionHead({ label, title, aside }: { label: string; title: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="label">{label}</p>
        <h2 className="heading mt-2.5 text-3xl sm:text-4xl lg:text-[2.75rem]">{title}</h2>
      </div>
      {aside}
    </div>
  );
}

export default function HomePage() {
  return (
    <main>
      {/* Hero: centred headline and a wide search bar */}
      <section className="relative">
        <div aria-hidden className="dot-grid pointer-events-none absolute inset-x-0 top-0 h-[560px]" />
        <div className="wrap relative pb-16 pt-16 text-center sm:pt-24">
          <p className="mx-auto inline-flex items-center gap-3 rounded-full border border-line bg-ink-2 py-1.5 pl-1.5 pr-4 text-sm font-bold text-fg/90">
            <span className="flex -space-x-2">
              {HERO_COINS.map((id) => (
                <span key={id} className="rounded-full ring-2 ring-ink-2">
                  <ChainGlyph id={id} name={id} size="sm" />
                </span>
              ))}
            </span>
            {CHAINS.length} blockchains<span className="hidden sm:inline"> · one search box</span>
          </p>
          <h1 className="heading mx-auto mt-7 text-[2.6rem] sm:text-6xl lg:whitespace-nowrap lg:text-[clamp(3.5rem,5.2vw,5.5rem)]">
            Look up anything, on <span className="text-accent">any chain.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-5xl text-base font-medium leading-relaxed text-muted sm:text-lg xl:whitespace-nowrap xl:text-xl">
            Paste an address, transaction, block or name. Web3Lens recognises it, picks the chain and opens the right block
            explorer.
          </p>
          <div className="mx-auto mt-9 max-w-6xl">
            <SmartSearch hidePopular />
          </div>

          {/* Pick a chain first: sets it in the search bar above */}
          <div className="mx-auto mt-7 max-w-6xl text-left">
            <div className="mb-3 flex items-center gap-4">
              <p className="label shrink-0">Or start with a chain</p>
              <span aria-hidden className="h-px flex-1 bg-line" />
              <p className="hidden shrink-0 text-sm font-semibold text-faint sm:block">Pick one, then paste your address</p>
            </div>
            <PopularChains />
          </div>

          <dl className="mx-auto mt-10 grid max-w-6xl grid-cols-2 divide-line rounded-2xl border border-line bg-ink-2/60 sm:grid-cols-4 sm:divide-x">
            {STATS.map((s, i) => (
              <div
                key={s.label}
                className={`flex items-baseline justify-center gap-3 px-4 py-4 ${i > 1 ? 'border-t border-line sm:border-t-0' : ''} ${i % 2 === 1 ? 'border-l border-line sm:border-l-0' : ''}`}
              >
                <dd className="text-2xl font-extrabold tracking-tight text-accent">{s.value}</dd>
                <dt className="text-sm font-bold text-muted">{s.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Try it */}
      <section className="wrap mt-20">
        <SectionHead label="Try it" title="Click an example, watch it detect" />
        <TryExamples />
      </section>

      {/* How it works */}
      <section className="wrap mt-24">
        <SectionHead
          label="How it works"
          title={
            <>
              One search box instead of <span className="text-accent">{CHAINS.length} bookmarks</span>
            </>
          }
        />
        <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="rounded-2xl border border-line bg-ink-2 p-7">
              <div className="flex items-center justify-between">
                <span className="grid size-14 place-items-center rounded-xl bg-accent/10 text-accent">
                  <step.icon aria-hidden weight="duotone" className="size-8" />
                </span>
                <span className="text-5xl font-extrabold tracking-tight text-line-strong">0{i + 1}</span>
              </div>
              <h3 className="mt-7 text-xl font-extrabold tracking-tight">{step.title}</h3>
              <p className="mt-2 text-[15px] font-medium leading-relaxed text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Explore */}
      <section className="wrap mt-24">
        <SectionHead label="Explore" title="More than a search box" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[
            {
              href: '/directory',
              icon: Compass,
              title: 'Crypto directory',
              body: 'Hand-picked YouTube channels, forums, news sites and communities, filterable by type.',
              cta: 'Browse the directory',
            },
            {
              href: '/blockchain-guide',
              icon: BookOpenText,
              title: 'Learn the basics',
              body: 'Blockchains, Bitcoin, wallets, mining, NFTs and DeFi, explained in short answers with videos.',
              cta: 'Start learning',
            },
          ].map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group flex items-start gap-6 rounded-2xl border border-line bg-ink-2 p-7 transition-colors hover:border-accent/60 hover:bg-ink-3 sm:p-9"
            >
              <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-accent/10 text-accent">
                <card.icon aria-hidden weight="duotone" className="size-9" />
              </span>
              <span>
                <span className="block text-2xl font-extrabold tracking-tight">{card.title}</span>
                <span className="mt-2 block max-w-md text-[15px] font-medium leading-relaxed text-muted">{card.body}</span>
                <span className="mt-5 flex items-center gap-2 text-[15px] font-bold text-fg group-hover:text-accent">
                  {card.cta}
                  <ArrowRight aria-hidden weight="bold" className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Roadmap */}
      <section className="wrap mt-24">
        <SectionHead
          label="Roadmap"
          title="Where Web3Lens is heading"
          aside={
            <Link href="/contact" className="text-[15px] font-bold text-muted hover:text-accent">
              Suggest a feature →
            </Link>
          }
        />
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ROADMAP.map((item) => (
            <li key={item.title} className="rounded-2xl border border-line bg-ink-2 p-6">
              <div className="flex items-start justify-between">
                <item.icon aria-hidden weight="duotone" className="size-10 text-accent" />
                <span className="rounded-full border border-redline/50 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-redline">
                  Planned
                </span>
              </div>
              <h3 className="mt-5 text-lg font-extrabold tracking-tight">{item.title}</h3>
              <p className="mt-1.5 text-[15px] font-medium leading-relaxed text-muted">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Support */}
      <section className="wrap mt-24">
        <div className="marks flex flex-col items-start justify-between gap-6 rounded-2xl border border-line-strong bg-ink-2 p-8 sm:p-12 md:flex-row md:items-center">
          <div className="flex items-start gap-5">
            <span className="hidden size-16 shrink-0 place-items-center rounded-2xl bg-redline/10 text-redline sm:grid">
              <Heart aria-hidden weight="duotone" className="size-9" />
            </span>
            <div>
              <h2 className="heading text-3xl sm:text-4xl">Free and ad-free since 2018.</h2>
              <p className="mt-2 max-w-xl text-[15px] font-medium text-muted">
                Web3Lens is a one-person project kept alive by donations. If it saves you time, consider chipping in.
              </p>
            </div>
          </div>
          <a
            href="#support"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-accent px-7 py-4 text-base font-extrabold text-ink transition-colors hover:bg-accent-hover"
          >
            Support Web3Lens <ArrowRight aria-hidden weight="bold" className="size-5" />
          </a>
        </div>
      </section>
    </main>
  );
}
