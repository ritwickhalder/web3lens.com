import { PageShell } from '@/components/content/PageShell';
import { BatchSearch } from '@/components/usability/BatchSearch';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Batch address search',
  description: 'Check up to 50 blockchain addresses or transaction hashes at once: format, checksum, OFAC sanctions and EVM balances, with CSV export.',
  path: '/batch',
});

export default function BatchPage() {
  return (
    <PageShell layout="stacked" eyebrow="Batch search" title="Check a list at once" lead="Paste addresses, hashes or names from a spreadsheet, a report or a chat. Each one is detected, checksum-verified and checked against the OFAC snapshot.">
      <BatchSearch />
    </PageShell>
  );
}
