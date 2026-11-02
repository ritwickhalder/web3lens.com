import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { PageShell } from '@/components/content/PageShell';
import { ToolBody } from '@/components/tools/ToolBody';
import { ToolIcon } from '@/components/tools/ToolIcon';
import { TOOLS } from '@/config/tools';
import { pageMetadata } from '@/lib/metadata';

type Props = { params: Promise<{ tool: string }> };

export function generateStaticParams() {
  return TOOLS.map((t) => ({ tool: t.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props) {
  const { tool: slug } = await params;
  const tool = TOOLS.find((t) => t.slug === slug);
  if (!tool) return {};
  return pageMetadata({ title: tool.title, description: tool.description, path: `/tools/${tool.slug}` });
}

export default async function ToolPage({ params }: Props) {
  const { tool: slug } = await params;
  const tool = TOOLS.find((t) => t.slug === slug);
  if (!tool) notFound();
  return (
    <PageShell
      eyebrow="Developer tools"
      title={tool.title}
      lead={tool.description}
      aside={
        <nav aria-label="Other tools" className="hidden lg:block">
          <p className="label mb-3 !text-faint">All tools</p>
          <ul className="space-y-1">
            {TOOLS.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/tools/${t.slug}`}
                  aria-current={t.slug === tool.slug ? 'page' : undefined}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[15px] font-bold text-fg/80 hover:bg-ink-3 hover:text-fg aria-[current=page]:bg-ink-3 aria-[current=page]:text-accent"
                >
                  <ToolIcon slug={t.slug} className="size-5" />
                  {t.title}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/batch" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[15px] font-bold text-fg/80 hover:bg-ink-3 hover:text-fg">
                <ToolIcon slug="batch" className="size-5" />
                Batch search
              </Link>
            </li>
          </ul>
        </nav>
      }
    >
      <Suspense>
        <ToolBody slug={tool.slug} />
      </Suspense>
    </PageShell>
  );
}
