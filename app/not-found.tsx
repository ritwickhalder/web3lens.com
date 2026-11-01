import Link from 'next/link';
import { PageShell } from '@/components/content/PageShell';

export default function NotFound() {
  return (
    <PageShell eyebrow="404" title="Nothing on-chain here." lead="That page doesn't exist, or it moved.">
      <Link href="/" className="inline-flex rounded-xl bg-accent px-7 py-3.5 text-base font-extrabold text-ink hover:bg-accent-hover">
        Back to search
      </Link>
    </PageShell>
  );
}
