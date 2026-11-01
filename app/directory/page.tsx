import { DirectoryTable, type DirectoryEntry } from '@/components/directory/DirectoryTable';
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
    <main className="min-h-screen bg-directory px-4 pb-32 pt-[16vh] sm:px-[8%] lg:px-[12%]">
      <h1 className="sr-only">Crypto Directory</h1>
      <DirectoryTable entries={entries as DirectoryEntry[]} />
    </main>
  );
}
