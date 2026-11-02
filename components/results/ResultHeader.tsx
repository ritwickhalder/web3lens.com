import { ChainGlyph } from '@/components/search/ChainGlyph';
import { CopyButton } from '@/components/ui/CopyButton';

/** Top of a result page: chain, what the value is, the value itself (wrapping), and actions. */
export function ResultHeader({
  chainId,
  chainName,
  kindLabel,
  value,
  badges,
  actions,
  sub,
}: {
  chainId: string;
  chainName: string;
  kindLabel: string;
  value: string;
  badges?: React.ReactNode;
  actions?: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <header className="mb-8 border-b border-line pb-8">
      <p className="flex items-center gap-2.5">
        <ChainGlyph id={chainId} name={chainName} size="md" />
        <span className="label">
          {chainName} · {kindLabel}
        </span>
      </p>
      <div className="mt-4 flex items-start gap-3">
        <h1 className="min-w-0 flex-1 break-all font-mono text-xl font-medium leading-snug text-fg sm:text-2xl lg:text-[1.75rem]">{value}</h1>
        <CopyButton value={value} label={`Copy ${kindLabel.toLowerCase()}`} />
      </div>
      {sub && <div className="mt-3 text-[15px] font-semibold text-muted">{sub}</div>}
      {(badges || actions) && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {badges}
          {actions && <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
    </header>
  );
}

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'good' | 'warn' | 'danger' | 'accent'; children: React.ReactNode }) {
  const cls = {
    neutral: 'border-line text-muted',
    good: 'border-accent/40 text-accent',
    accent: 'border-accent/60 bg-accent/10 text-accent',
    warn: 'border-redline/50 text-redline',
    danger: 'border-danger/60 bg-danger/10 text-danger',
  }[tone];
  return <span className={`rounded-full border px-2.5 py-1 text-xs font-extrabold uppercase tracking-[0.08em] ${cls}`}>{children}</span>;
}
