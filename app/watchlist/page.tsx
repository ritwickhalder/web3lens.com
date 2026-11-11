import { Watchlist } from '@/components/account/Watchlist';
import { PageShell } from '@/components/content/PageShell';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Watchlist',
  description: 'Watch addresses on EVM chains, Bitcoin and Litecoin and get an alert when they send or receive (Pro).',
  path: '/watchlist',
  noindex: true,
});

export default function WatchlistPage() {
  return (
    <PageShell layout="stacked" eyebrow="Pro" title="Watchlist" lead="Know when an address you care about moves. Checked automatically from public sources; alerts by email if you want them.">
      <Watchlist />
    </PageShell>
  );
}
