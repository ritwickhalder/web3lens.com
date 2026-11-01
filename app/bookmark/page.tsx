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
    <kbd className="grid min-w-14 place-items-center rounded-xl border border-line-strong border-b-4 bg-ink-3 px-4 py-3 font-mono text-lg text-fg">
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
      <ol className="space-y-4">
        <li className="glass flex gap-5 rounded-2xl p-6">
          <span className="font-mono text-sm text-lime">01</span>
          <p className="text-fg/85">
            Go to the main page,{' '}
            <Link href="/" className="text-lime underline-offset-4 hover:underline">
              {SITE.domain}
            </Link>
            .
          </p>
        </li>
        <li className="glass flex gap-5 rounded-2xl p-6">
          <span className="font-mono text-sm text-lime">02</span>
          <div className="flex-1">
            <p className="text-fg/85">
              Press <b>Ctrl + D</b> (<b>⌘ + D</b> on a Mac) and click "Done" or "Add" to save the bookmark. Simple!
            </p>
            <div className="mt-6 flex items-center justify-center gap-3 text-muted" aria-hidden>
              <Key>Ctrl</Key> + <Key>D</Key>
            </div>
          </div>
        </li>
      </ol>
    </PageShell>
  );
}
