import Link from 'next/link';
import { PageShell } from '@/components/content/PageShell';
import { SITE } from '@/config/site';
import { CHANGELOG } from '@/content/changelog';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Changelog: What’s New in Web3Lens',
  description: `New chains, features and fixes on ${SITE.domain} and in the Web3Lens browser extension, newest first.`,
  path: '/changelog',
});

const fmt = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

export default function ChangelogPage() {
  return (
    <PageShell
      eyebrow="Changelog"
      title="What’s new."
      lead="New chains, features and fixes on the website and in the browser extension, newest first."
      aside={
        <p className="mt-6 text-sm font-semibold text-faint">
          Missing something? <Link href="/contact" className="text-accent hover:underline">Tell us</Link>.
        </p>
      }
    >
      <ol className="relative space-y-6 border-l border-line pl-6">
        {CHANGELOG.map((e) => (
          <li key={`${e.date}-${e.title}`} className="relative">
            <span aria-hidden className="absolute -left-[31px] top-2 size-3 rounded-full border-2 border-accent bg-ink" />
            <article className="rounded-xl border border-line bg-ink-2 p-5 sm:p-6">
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-bold text-faint">
                <time dateTime={e.date}>{fmt(e.date)}</time>
                <span className="rounded-full border border-line px-2.5 py-0.5 text-xs text-muted">{e.area}</span>
                {e.version && <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs text-accent">v{e.version}</span>}
              </p>
              <h2 className="heading mt-2 text-xl sm:text-2xl">{e.title}</h2>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-base font-medium text-muted marker:text-accent">
                {e.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </li>
        ))}
      </ol>
    </PageShell>
  );
}
