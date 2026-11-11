import { RelatedGuides } from '@/components/blog/RelatedGuides';
import Link from 'next/link';
import { PageShell } from '@/components/content/PageShell';
import { ToolIcon } from '@/components/tools/ToolIcon';
import { TOOLS } from '@/config/tools';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Developer tools',
  description: 'Free blockchain developer tools: unit converter, address validator, hex and hash tools, timestamp converter, gas calculator, calldata and raw transaction decoders.',
  path: '/tools',
});

const ALL = [
  ...TOOLS,
  { slug: 'gas-tracker', title: 'Gas tracker', short: 'Live fees on 11 chains + Bitcoin', href: '/gas' },
  { slug: 'batch', title: 'Batch search', short: 'Check a list of addresses at once', href: '/batch' },
];

export default function ToolsPage() {
  return (
    <PageShell
      layout="stacked"
      eyebrow="Developer tools"
      title={
        <>
          Small tools, <span className="text-accent">exact answers.</span>
        </>
      }
      lead="Everything runs in your browser unless it says it fetches live data. No sign-up, no tracking of what you paste."
    >
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {ALL.map((t) => (
          <li key={t.slug}>
            <Link
              href={'href' in t ? t.href : `/tools/${t.slug}`}
              className="group flex h-full flex-col rounded-2xl border border-line bg-ink-2 p-6 transition-colors hover:border-accent/60 hover:bg-ink-3"
            >
              <span className="grid size-12 place-items-center rounded-xl bg-accent/10 text-accent">
                <ToolIcon slug={t.slug} className="size-7" />
              </span>
              <span className="mt-5 text-lg font-extrabold tracking-tight">{t.title}</span>
              <span className="mt-1 text-[15px] font-medium text-muted">{t.short}</span>
            </Link>
          </li>
        ))}
      </ul>
      <RelatedGuides page={'/tools'} />
    </PageShell>
  );
}
