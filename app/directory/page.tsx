import { PageArt } from '@/components/content/PageArt';
import { PageShell } from '@/components/content/PageShell';
import { DirectoryGrid, type DirectoryEntry } from '@/components/directory/DirectoryGrid';
import entries from '@/data/directory.json';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Crypto Directory',
  description:
    'A directory of cryptocurrency and blockchain YouTube channels, forums, news websites, Facebook groups and Reddit communities.',
  path: '/directory',
});

export default function DirectoryPage() {
  return (
    <PageShell
      layout="stacked"
      eyebrow="Directory"
      title={
        <>
          The crypto internet, <span className="text-accent">curated.</span>
        </>
      }
      art={<PageArt scene="directory" />}
      lead="YouTube channels, forums, news sites and communities worth following. Filter by type or search by name."
    >
      <DirectoryGrid entries={entries as DirectoryEntry[]} />
    </PageShell>
  );
}
