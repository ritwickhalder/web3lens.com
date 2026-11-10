import Link from 'next/link';
import { PageShell } from '@/components/content/PageShell';
import { SavedList } from '@/components/usability/SavedList';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Saved addresses',
  description: 'Your labelled addresses and transactions, kept in this browser. Export, import and share them as an investigation link.',
  path: '/saved',
  noindex: true,
});

export default function SavedPage() {
  return (
    <PageShell
      layout="stacked"
      eyebrow="Saved"
      title="Your labels and notes"
      lead={
        <>
          Kept in this browser and never sent to Web3Lens; no account needed. With Pro they sync to your account across devices and the extension. Change search behaviour and explorers in <Link href="/settings" className="text-accent underline underline-offset-2">settings</Link>.
        </>
      }
    >
      <SavedList />
    </PageShell>
  );
}
