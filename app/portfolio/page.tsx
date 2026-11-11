import { Portfolio } from '@/components/account/Portfolio';
import { PageShell } from '@/components/content/PageShell';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Portfolio',
  description: 'The combined native balance of your saved EVM addresses across 11 chains (Pro).',
  path: '/portfolio',
  noindex: true,
});

export default function PortfolioPage() {
  return (
    <PageShell layout="stacked" eyebrow="Pro" title="Portfolio" lead="Your saved EVM addresses, added up across chains. Read-only: no wallet connection, nothing to sign.">
      <Portfolio />
    </PageShell>
  );
}
