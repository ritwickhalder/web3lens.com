import { PageShell } from '@/components/content/PageShell';
import { GasTracker } from '@/components/tools/GasTracker';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Gas Tracker: Live Ethereum, L2 and Bitcoin Fees',
  description: 'Live gas prices on Ethereum, Base, Arbitrum, OP, Polygon, BNB Chain, Avalanche and 4 more chains, with dollar costs, plus Bitcoin fee rates.',
  path: '/gas',
});

export default function GasPage() {
  return (
    <PageShell layout="stacked" eyebrow="Gas tracker" title="What a transaction costs right now" lead="Live fees on 11 EVM chains and Bitcoin, from public sources, with the time they were fetched.">
      <GasTracker />
    </PageShell>
  );
}
