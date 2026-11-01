import {
  ArrowRight,
  BookOpen,
  Compass,
  Fingerprint,
  Gauge,
  Layers,
  MousePointerClick,
  Network,
  Puzzle,
  ScanSearch,
  ShieldCheck,
  Wallet,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';
import { ParticlesBackground } from '@/components/ParticlesBackground';
import { TryExamples } from '@/components/home/TryExamples';
import { SmartSearch } from '@/components/search/SmartSearch';
import { CHAINS } from '@/lib/chains';

const STEPS = [
  {
    icon: ScanSearch,
    title: 'Paste anything',
    body: 'An address, a transaction hash, a block number or an ENS name. Web3Lens recognises the format as you type.',
  },
  {
    icon: Layers,
    title: 'Pick the chain, or let us',
    body: `We pre-select the matching chain and show the alternatives. Or choose any of ${CHAINS.length} chains yourself.`,
  },
  {
    icon: MousePointerClick,
    title: 'Land on the right explorer',
    body: 'Your search opens on that chain’s block explorer in a new tab. No sign-up, no ads, no tracking of what you search.',
  },
];

const ROADMAP = [
  { icon: Wallet, title: 'Address snapshot', body: 'Balance, token holdings and activity, right here before you click out.' },
  { icon: Network, title: 'Multichain lookup', body: 'One 0x address checked across Ethereum, Base, Arbitrum, Optimism and more.' },
  { icon: Puzzle, title: 'Browser extension', body: 'Right-click any address on any page, or type w3 in the address bar.' },
  { icon: ShieldCheck, title: 'Risk flags', body: 'Warnings for sanctioned and reported scam addresses before you send.' },
  { icon: Gauge, title: 'Gas & fees', body: 'Live gas prices and Bitcoin fee estimates at a glance.' },
  { icon: Wrench, title: 'Dev toolkit', body: 'Unit converter, calldata decoder, checksum and timestamp tools.' },
];

export default function HomePage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <ParticlesBackground />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 size-[760px] -translate-x-1/2 -translate-y-[46%] rounded-full border border-white/[0.04] [mask-image:linear-gradient(to_bottom,#000,transparent_80%)]"
        >
          <div className="absolute inset-[70px] rounded-full border border-dashed border-violet/15 animate-spin-slow" />
          <div className="absolute inset-[150px] rounded-full border border-lime/10" />
        </div>
        <div className="relative mx-auto max-w-4xl px-5 pb-24 pt-20 text-center sm:pt-28">
          <p className="animate-fade-up mx-auto inline-flex items-center gap-2 rounded-full border border-line bg-white/[0.03] px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
            <span className="size-1.5 rounded-full bg-lime shadow-[0_0_10px_2px_rgb(198_242_78/0.6)]" />
            {CHAINS.length} chains · no sign-up · ad-free
          </p>
          <h1 className="animate-fade-up mt-7 font-display text-[2.4rem] font-semibold leading-[1.05] tracking-tight [animation-delay:60ms] sm:text-6xl md:text-7xl">
            Look up anything,
            <br />
            on <span className="text-lens">any chain.</span>
          </h1>
          <p className="animate-fade-up mx-auto mt-6 max-w-xl text-base text-muted [animation-delay:120ms] sm:text-lg">
            The search engine for blockchains. Paste an address, transaction, block or name and jump straight to the
            right explorer.
          </p>
          <div className="animate-fade-up mt-10 [animation-delay:180ms]">
            <SmartSearch />
          </div>
          <p className="mt-6 hidden text-xs text-faint sm:block">
            Press <kbd className="rounded border border-line px-1.5 py-0.5 font-mono">/</kbd> or{' '}
            <kbd className="rounded border border-line px-1.5 py-0.5 font-mono">Ctrl K</kbd> to search from anywhere on
            the page
          </p>
        </div>
      </section>

      {/* Try it */}
      <section className="mx-auto max-w-6xl px-5">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Try it</p>
            <h2 className="mt-2 font-display text-xl font-semibold sm:text-2xl">Click an example to see auto-detect</h2>
          </div>
        </div>
        <TryExamples />
      </section>

      {/* How it works */}
      <section className="mx-auto mt-28 max-w-6xl px-5">
        <p className="eyebrow">How it works</p>
        <h2 className="mt-2 max-w-2xl font-display text-2xl font-semibold leading-tight sm:text-4xl">
          One search box instead of <span className="text-lens">{CHAINS.length} bookmarks.</span>
        </h2>
        <ol className="mt-10 grid gap-px overflow-hidden rounded-3xl border border-line bg-line md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative bg-ink-2 p-7">
              <span className="absolute right-6 top-6 font-mono text-xs text-faint">0{i + 1}</span>
              <step.icon aria-hidden className="size-6 text-lime" strokeWidth={1.6} />
              <h3 className="mt-6 font-display text-base font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Explore */}
      <section className="mx-auto mt-28 max-w-6xl px-5">
        <p className="eyebrow">Explore</p>
        <h2 className="mt-2 font-display text-2xl font-semibold sm:text-4xl">More than a search box</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <Link href="/directory" className="glass group relative overflow-hidden rounded-3xl p-8 transition-colors hover:border-lime/40">
            <div aria-hidden className="absolute -right-16 -top-16 size-56 rounded-full bg-lime/10 blur-3xl" />
            <Compass aria-hidden className="size-7 text-lime" strokeWidth={1.5} />
            <h3 className="mt-8 font-display text-xl font-semibold">Crypto Directory</h3>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
              Hand-picked YouTube channels, forums, news sites and communities, searchable and filterable.
            </p>
            <span className="mt-6 inline-flex items-center gap-1.5 text-sm text-fg">
              Browse the directory <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
          <Link
            href="/blockchain-guide"
            className="glass group relative overflow-hidden rounded-3xl p-8 transition-colors hover:border-violet/50"
          >
            <div aria-hidden className="absolute -right-16 -top-16 size-56 rounded-full bg-violet/15 blur-3xl" />
            <BookOpen aria-hidden className="size-7 text-violet" strokeWidth={1.5} />
            <h3 className="mt-8 font-display text-xl font-semibold">Learn the basics</h3>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
              New to crypto? Blockchains, Bitcoin, wallets, mining, NFTs and DeFi, explained with short videos.
            </p>
            <span className="mt-6 inline-flex items-center gap-1.5 text-sm text-fg">
              Start learning <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        </div>
      </section>

      {/* Roadmap */}
      <section className="mx-auto mt-28 max-w-6xl px-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">On the roadmap</p>
            <h2 className="mt-2 font-display text-2xl font-semibold sm:text-4xl">Where Web3Lens is heading</h2>
          </div>
          <Link href="/contact" className="text-sm text-muted underline-offset-4 hover:text-fg hover:underline">
            Suggest a feature →
          </Link>
        </div>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ROADMAP.map((item) => (
            <li key={item.title} className="rounded-2xl border border-dashed border-line-strong p-6">
              <div className="flex items-center justify-between">
                <item.icon aria-hidden className="size-5 text-aqua" strokeWidth={1.6} />
                <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-faint">
                  Soon
                </span>
              </div>
              <h3 className="mt-5 font-display text-sm font-semibold">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Support */}
      <section className="mx-auto mt-28 max-w-6xl px-5">
        <div className="ring-lens relative overflow-hidden rounded-3xl bg-ink-2 px-8 py-12 sm:px-14">
          <div aria-hidden className="absolute -bottom-24 left-1/3 h-56 w-[480px] rounded-full bg-violet/20 blur-3xl" />
          <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <Fingerprint aria-hidden className="size-7 text-lime" strokeWidth={1.5} />
              <h2 className="mt-5 font-display text-2xl font-semibold sm:text-3xl">Free, ad-free, since 2018.</h2>
              <p className="mt-2 max-w-lg text-sm text-muted">
                Web3Lens is a one-person project kept alive by donations. If it saves you time, consider chipping in.
              </p>
            </div>
            <a
              href="#support"
              className="rounded-2xl bg-fg px-6 py-3 font-display text-sm font-semibold text-ink transition-colors hover:bg-lime"
            >
              Support Web3Lens
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
