import type { Icon } from '@phosphor-icons/react';
import { Breadcrumbs, type Crumb } from '@/components/content/Breadcrumbs';

/**
 * Frame for inner pages. `split` (default) puts a sticky title block on the left (a quarter of the width on wide
 * screens) and the content on the right; `stacked` puts the header above full-width content, with the optional
 * illustration beside it. `art` is a decorative illustration (see PageArt).
 */
export function PageShell({
  eyebrow,
  title,
  lead,
  aside,
  art,
  layout = 'split',
  breadcrumbs,
  children,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  /** Extra content under the header in the left column (split layout only). */
  aside?: React.ReactNode;
  /** Decorative illustration: under the title (split) or beside the header (stacked, lg and up). */
  art?: React.ReactNode;
  layout?: 'split' | 'stacked';
  /** Trail after "Home"; the last item is this page. */
  breadcrumbs?: Crumb[];
  children: React.ReactNode;
}) {
  const header = (
    <header>
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      {eyebrow && <p className="label">{eyebrow}</p>}
      <h1 className="heading mt-2.5 text-[2.25rem] sm:text-[2.75rem] xl:text-5xl">{title}</h1>
      {lead && <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-muted sm:text-lg">{lead}</p>}
    </header>
  );

  if (layout === 'stacked') {
    return (
      <main className="wrap pt-8 sm:pt-10">
        <div className="mb-8 grid grid-cols-1 items-center gap-8 border-b border-line pb-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] xl:grid-cols-[minmax(0,1fr)_minmax(0,32rem)]">
          {header}
          {art && <div className="hidden lg:block">{art}</div>}
        </div>
        {children}
      </main>
    );
  }

  return (
    <main className="wrap grid grid-cols-1 gap-8 pt-8 sm:pt-10 lg:grid-cols-12 xl:gap-12">
      <div className="space-y-6 lg:col-span-4 xl:col-span-3">
        {header}
        {art && <div className="hidden lg:block">{art}</div>}
        {aside && <div className="lg:sticky lg:top-24">{aside}</div>}
      </div>
      <div className="min-w-0 lg:col-span-8 xl:col-span-9">{children}</div>
    </main>
  );
}

export type InfoItem = { id: string; heading: string; body: React.ReactNode };

/**
 * Long-form copy (About / Terms / Privacy) as numbered cards that flow into two columns on wide screens, so a legal
 * page reads like a two-column document instead of one long strip.
 */
export function InfoSections({ items, columns = 2 }: { items: InfoItem[]; columns?: 1 | 2 }) {
  return (
    <div className={columns === 2 ? 'gap-4 xl:columns-2' : ''}>
      {items.map((item, i) => (
        <InfoSection key={item.id} id={item.id} index={i + 1} heading={item.heading} className="mb-4 break-inside-avoid">
          {item.body}
        </InfoSection>
      ))}
    </div>
  );
}

/** A titled, numbered block of long-form copy. */
export function InfoSection({
  heading,
  index,
  id,
  className = '',
  children,
}: {
  heading: string;
  index?: number;
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`scroll-mt-24 rounded-xl border border-line bg-ink-2 p-5 sm:p-6 ${className}`}>
      <h2 className="flex items-baseline gap-3 text-lg font-extrabold tracking-tight text-fg sm:text-xl">
        {index !== undefined && <span className="text-sm font-extrabold tabular-nums text-accent">{String(index).padStart(2, '0')}</span>}
        {heading}
      </h2>
      <div className="prose-bp mt-2.5 text-[15px] leading-relaxed">{children}</div>
    </section>
  );
}

/** "On this page" list for the sticky left column of long pages. */
export function OnThisPage({ items }: { items: { id: string; heading: string }[] }) {
  return (
    <nav aria-label="On this page" className="hidden rounded-xl border border-line bg-ink-2 p-2 lg:block">
      <p className="label px-2.5 py-1.5">On this page</p>
      <ol>
        {items.map((item, i) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="flex items-baseline gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-bold text-fg/80 transition-colors hover:bg-ink-3 hover:text-accent"
            >
              <span className="text-xs tabular-nums text-faint">{String(i + 1).padStart(2, '0')}</span>
              {item.heading}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Highlighted intro paragraph. */
export function Intro({ children }: { children: React.ReactNode }) {
  return <p className="prose-bp mb-4 border-l-2 border-accent bg-ink-2 px-5 py-4 text-base">{children}</p>;
}

/** Row of short facts with icons, for the top of a content page. */
export function FactStrip({ items }: { items: { icon: Icon; title: string; body: string }[] }) {
  return (
    <ul className="mb-4 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 2xl:grid-cols-4">
      {items.map((f) => (
        <li key={f.title} className="flex gap-3 bg-ink-2 p-4">
          <f.icon aria-hidden weight="duotone" className="size-7 shrink-0 text-accent" />
          <div>
            <p className="text-sm font-extrabold text-fg">{f.title}</p>
            <p className="mt-0.5 text-[13px] font-medium leading-snug text-muted">{f.body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
