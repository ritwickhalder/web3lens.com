import { CloudSlash, Info } from '@phosphor-icons/react/dist/ssr';
import { formatUtc, timeAgo } from '@/lib/format';
import type { Section } from '@/lib/lookup-types';

/** Where a section's data came from, and whether it is stale. */
export function SourceLine({ section }: { section: Section<unknown> }) {
  if (section.status !== 'ok') return null;
  return (
    <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-line pt-3 text-xs font-semibold text-faint">
      <span>
        Source:{' '}
        {section.source.url ? (
          <a href={section.source.url} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-accent">
            {section.source.name}
          </a>
        ) : (
          <span className="text-muted">{section.source.name}</span>
        )}
      </span>
      <span aria-hidden>·</span>
      <time dateTime={section.fetchedAt} title={formatUtc(section.fetchedAt)}>
        fetched {timeAgo(section.fetchedAt)}
      </time>
      {section.stale && (
        <span className="rounded-full border border-redline/50 px-2 py-0.5 font-extrabold uppercase tracking-wider text-redline">
          Stale: the source is not responding, showing the last cached result
        </span>
      )}
    </p>
  );
}

export function Unavailable({ reason, source }: { reason: string; source?: { name: string } }) {
  return (
    <p className="flex items-start gap-2.5 rounded-lg border border-line bg-ink px-4 py-3 text-sm font-semibold text-muted">
      <CloudSlash aria-hidden weight="bold" className="mt-0.5 size-4 shrink-0 text-redline" />
      <span>
        Unavailable{source ? ` from ${source.name}` : ''}: {reason}. Nothing is shown rather than a guess.
      </span>
    </p>
  );
}

/** A titled card that renders `children(data)` when the section loaded, or an "unavailable" note. */
export function ResultSection<T>({
  title,
  section,
  aside,
  children,
  id,
}: {
  title: string;
  section: Section<T>;
  aside?: React.ReactNode;
  id?: string;
  children: (data: T) => React.ReactNode;
}) {
  return (
    <section id={id} className="min-w-0 rounded-2xl border border-line bg-ink-2 p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>
        {aside}
      </div>
      {section.status === 'ok' ? children(section.data) : <Unavailable reason={section.reason} source={section.source} />}
      <SourceLine section={section as Section<unknown>} />
    </section>
  );
}

export function Card({ title, children, aside, id }: { title: string; children: React.ReactNode; aside?: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="min-w-0 rounded-2xl border border-line bg-ink-2 p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function Note({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'warn' | 'danger' }) {
  const cls =
    tone === 'danger'
      ? 'border-danger/40 bg-danger/10 text-danger'
      : tone === 'warn'
        ? 'border-redline/40 bg-redline/10 text-redline'
        : 'border-line bg-ink text-muted';
  return (
    <p className={`flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm font-semibold ${cls}`}>
      <Info aria-hidden weight="bold" className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/** Key/value rows; values may be long hashes, so they wrap. */
export function Facts({ rows }: { rows: [label: string, value: React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-sm font-bold text-faint">{label}</dt>
          <dd className="min-w-0 break-words text-[15px] font-semibold text-fg">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
