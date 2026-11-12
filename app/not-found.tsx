import Link from 'next/link';
import { PageArt } from '@/components/content/PageArt';
import { PageShell } from '@/components/content/PageShell';

export default function NotFound() {
  return (
    <PageShell eyebrow="404" title="Nothing on-chain here." lead="That page doesn't exist, or it moved.">
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)]">
        <div>
          <p className="max-w-lg text-base font-medium text-muted">
            Pasted an address or hash? Search finds it on whichever chain it belongs to.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/" className="inline-flex rounded-md bg-accent px-6 py-3 text-base font-extrabold text-ink hover:bg-accent-hover">
              Back to search
            </Link>
            <Link href="/site-map" className="inline-flex rounded-md border border-line-strong px-6 py-3 text-base font-extrabold text-fg hover:border-accent hover:text-accent">
              See every page
            </Link>
          </div>
        </div>
        <PageArt scene="notfound" />
      </div>
    </PageShell>
  );
}
