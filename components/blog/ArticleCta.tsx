import { ArrowRight, ListChecks, MagnifyingGlass, PuzzlePiece, ShieldCheck, Wrench } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { AddToBrowserButton, OtherStoreLinks } from '@/components/extension/AddToBrowser';
import type { CtaPreset } from '@/config/blog';
import { CHAIN_COUNT_LABEL } from '@/lib/chains';

const PRESETS: Record<CtaPreset, { icon: typeof MagnifyingGlass; title: string; body: string; links: readonly { label: string; href: string }[] }> = {
  search: {
    icon: MagnifyingGlass,
    title: 'Try it on Web3Lens',
    body: `Paste any address, transaction hash, block number or ENS name. Web3Lens detects the format and chain, checks the checksum and opens the right explorer across ${CHAIN_COUNT_LABEL} blockchains.`,
    links: [{ label: 'Open the search', href: '/' }],
  },
  tools: {
    icon: Wrench,
    title: 'Free developer tools, in your browser',
    body: 'Unit converter, address validator, hex and hashes, timestamps, gas calculator, calldata and raw transaction decoders. No sign-up, and everything except live gas runs locally.',
    links: [{ label: 'Browse the tools', href: '/tools' }],
  },
  batch: {
    icon: ListChecks,
    title: 'Check a whole list at once',
    body: 'Paste a list of addresses, hashes or names to get type, checksum and OFAC status for each, optional EVM balances, and a CSV export.',
    links: [{ label: 'Open batch search', href: '/batch' }],
  },
  risk: {
    icon: ShieldCheck,
    title: 'Run a risk check',
    body: 'Address pages on 11 EVM chains show sanctions, reported-address flags, contract checks and token approvals, each with its source. No reports never means safe.',
    links: [{ label: 'Try an address', href: '/search' }],
  },
  extension: {
    icon: PuzzlePiece,
    title: 'Get the Web3Lens extension',
    body: 'Right-click any address to look it up, type w3 in the address bar, or scan the page you are on. Free for Chrome, Firefox and Edge, with no host permissions and no tracking.',
    links: [], // matched to the reader's browser below
  },
};

/** Call-to-action box inside and after articles. */
export function ArticleCta({ preset }: { preset: CtaPreset }) {
  const p = PRESETS[preset];
  return (
    <aside className="marks my-10 flex flex-col gap-5 rounded-2xl border border-line-strong bg-ink-2 p-6 sm:flex-row sm:items-center sm:p-7">
      <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
        <p.icon aria-hidden weight="duotone" className="size-8" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-extrabold tracking-tight text-fg">{p.title}</p>
        <p className="mt-1 text-[15px] font-medium leading-relaxed text-muted">{p.body}</p>
        {preset === 'extension' && (
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <AddToBrowserButton />
            <OtherStoreLinks />
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2 empty:hidden">
          {p.links.map((l, i) => (
            <Link
              key={l.href}
              href={l.href}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-extrabold no-underline transition-colors ${i === 0 ? 'bg-accent text-ink hover:bg-accent-hover' : 'border border-line-strong text-fg hover:border-accent hover:text-accent'}`}
            >
              {l.label} {i === 0 && <ArrowRight aria-hidden weight="bold" className="size-4" />}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
