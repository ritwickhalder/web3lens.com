import Link from 'next/link';
import { PageShell } from '@/components/content/PageShell';
import { SITE } from '@/config/site';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Bookmark this page',
  description: `How to bookmark ${SITE.domain} in any browser.`,
  path: '/bookmark',
});

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="grid min-w-16 place-items-center rounded-lg border border-line-strong border-b-4 bg-ink-3 px-5 py-3 text-xl font-extrabold text-fg">
      {children}
    </kbd>
  );
}

export default function BookmarkPage() {
  return (
    <PageShell
      eyebrow="Bookmark"
      title="Keep Web3Lens one keystroke away."
      lead="Use this keyboard shortcut to bookmark Web3Lens in any browser."
    >
      <ol className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <li className="rounded-2xl border border-line bg-ink-2 p-6 sm:p-8">
          <p className="label">Step 01</p>
          <p className="mt-4 text-lg font-semibold text-fg/90">
            Go to the main page,{' '}
            <Link href="/" className="text-accent underline-offset-4 hover:underline">
              {SITE.domain}
            </Link>
            .
          </p>
        </li>
        <li className="rounded-2xl border border-line bg-ink-2 p-6 sm:p-8">
          <p className="label">Step 02</p>
          <p className="mt-4 text-lg font-semibold text-fg/90">
            Press <b>Ctrl + D</b> (<b>⌘ + D</b> on a Mac) and click "Done" or "Add" to save the bookmark. Simple!
          </p>
          <div className="mt-8 flex items-center gap-3 text-muted" aria-hidden>
            <Key>Ctrl</Key> + <Key>D</Key>
          </div>
        </li>
      </ol>
    </PageShell>
  );
}
