import Link from 'next/link';
import { PageShell } from '@/components/content/PageShell';

export default function NotFound() {
  return (
    <PageShell eyebrow="404" title="Nothing on-chain here." lead="That page doesn't exist, or it moved.">
      <Link href="/" className="inline-flex rounded-2xl bg-lime px-6 py-3 font-display text-sm font-semibold text-ink hover:bg-[#d4ff5c]">
        Back to search
      </Link>
    </PageShell>
  );
}
