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
    <kbd className="rounded border border-[#adb5bd] border-b-[3px] bg-[#f8f9fa] px-3 py-1.5 font-mono text-lg text-[#212529]">
      {children}
    </kbd>
  );
}

export default function BookmarkPage() {
  return (
    <PageShell title={`Steps to Bookmark - ${SITE.domain}`}>
      <div className="overflow-hidden rounded text-left">
        <p className="border border-success-border bg-success-bg px-5 py-3 font-bold text-success-text">
          Use this simple keyboard shortcut to bookmark {SITE.name} on any browser :
        </p>
        <p className="border-x border-b border-[#ffeeba] bg-white px-5 py-3">
          1. &nbsp;Firstly navigate to main webpage "<Link href="/" className="text-[#007bff] hover:underline">{SITE.domain}</Link>"
        </p>
        <div className="border-x border-b border-[#ffeeba] bg-white px-5 py-3">
          2. &nbsp;Press "Ctrl+D" (or "⌘+D" on a Mac) and click on "done" or "add" to save the bookmark. Simple !!
          <p className="mt-5 mb-2 flex items-center justify-center gap-2" aria-hidden>
            <Key>Ctrl</Key> + <Key>D</Key>
          </p>
        </div>
      </div>
    </PageShell>
  );
}
