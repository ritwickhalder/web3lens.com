import { PageShell } from '@/components/content/PageShell';
import { InvestigationView } from '@/components/usability/InvestigationView';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Shared investigation',
  description: 'A list of addresses and transactions shared from Web3Lens. The contents live in the link, not on a server.',
  path: '/investigate',
  noindex: true,
});

export default function InvestigatePage() {
  return (
    <PageShell layout="stacked" eyebrow="Investigation" title="Shared investigation" lead="The list below is stored in the link itself (after the #), so Web3Lens's servers never see it.">
      <InvestigationView />
    </PageShell>
  );
}
