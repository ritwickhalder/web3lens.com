import { Breadcrumbs, type Crumb } from '@/components/content/Breadcrumbs';

/**
 * Frame for inner pages. `split` (default) puts a sticky title block on the left and the
 * content on the right from lg up; `stacked` puts the header above full-width content.
 */
export function PageShell({
  eyebrow,
  title,
  lead,
  aside,
  layout = 'split',
  breadcrumbs,
  children,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  /** Extra content under the header in the left column (split layout only). */
  aside?: React.ReactNode;
  layout?: 'split' | 'stacked';
  /** Trail after "Home"; the last item is this page. */
  breadcrumbs?: Crumb[];
  children: React.ReactNode;
}) {
  const header = (
    <header>
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      {eyebrow && <p className="label">{eyebrow}</p>}
      <h1 className="heading mt-3 text-4xl sm:text-5xl xl:text-[3.5rem]">{title}</h1>
      {lead && <p className="mt-5 max-w-xl text-lg font-medium leading-relaxed text-muted">{lead}</p>}
    </header>
  );

  if (layout === 'stacked') {
    return (
      <main className="wrap pt-12 sm:pt-16">
        <div className="mb-10 border-b border-line pb-10">{header}</div>
        {children}
      </main>
    );
  }

  return (
    <main className="wrap grid grid-cols-1 gap-10 pt-12 sm:pt-16 lg:grid-cols-12 lg:gap-16">
      <div className="lg:col-span-4">
        <div className="lg:sticky lg:top-28">
          {header}
          {aside && <div className="mt-8">{aside}</div>}
        </div>
      </div>
      <div className="min-w-0 lg:col-span-8">{children}</div>
    </main>
  );
}

/** A titled block of long-form copy (About / Terms / Privacy). */
export function InfoSection({ heading, index, id, children }: { heading: string; index?: number; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 grid grid-cols-1 gap-3 border-t border-line py-8 first:border-t-0 first:pt-0 sm:grid-cols-[4rem_1fr]">
      <span className="text-2xl font-extrabold tracking-tight text-faint">{index !== undefined ? String(index).padStart(2, '0') : '—'}</span>
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-fg sm:text-2xl">{heading}</h2>
        <div className="prose-bp mt-3 text-base">{children}</div>
      </div>
    </section>
  );
}

/** Highlighted intro paragraph. */
export function Intro({ children }: { children: React.ReactNode }) {
  return <p className="prose-bp mb-10 rounded-xl border border-line bg-ink-2 p-5 text-base sm:p-6">{children}</p>;
}
