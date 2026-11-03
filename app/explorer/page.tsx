import Link from 'next/link';
import { PageShell } from '@/components/content/PageShell';
import { ChainGlyph } from '@/components/search/ChainGlyph';
import { allExplorerRoutes, CHAIN_COUNT_LABEL, countLabel, getChain } from '@/lib/chains';
import { pageMetadata } from '@/lib/metadata';
import { getNetwork } from '@/lib/networks';

export const metadata = pageMetadata({
  title: 'Block explorers by chain',
  description: 'Search pages for Bitcoin, Ethereum, Solana, Base, Arbitrum and 40 more chains, with every explorer that supports address, transaction and block lookups.',
  path: '/explorer',
});

export default function ExplorerIndex() {
  const chains = Object.keys(allExplorerRoutes())
    .map((id) => getChain(id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .sort((a, b) => Number(Boolean(getNetwork(b.id))) - Number(Boolean(getNetwork(a.id))) || a.name.localeCompare(b.name));
  return (
    <PageShell
      layout="stacked"
      eyebrow="Block explorers"
      title="Pick a chain"
      lead={`${countLabel(chains.length)} chains with explorer routes for addresses, transactions and blocks. The search bar on the home page covers all ${CHAIN_COUNT_LABEL}.`}
    >
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {chains.map((c) => (
          <li key={c.id}>
            <Link href={`/explorer/${c.id}`} className="flex items-center gap-3 rounded-xl border border-line bg-ink-2 p-3 transition-colors hover:border-accent/60 hover:bg-ink-3">
              <ChainGlyph id={c.id} name={c.name} size="lg" />
              <span className="min-w-0">
                <span className="block truncate font-extrabold">{c.name}</span>
                <span className="block text-xs font-bold text-faint">
                  {allExplorerRoutes()[c.id].length} explorer{allExplorerRoutes()[c.id].length > 1 ? 's' : ''}
                  {getNetwork(c.id) ? ' · native data' : ''}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
