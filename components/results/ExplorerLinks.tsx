import { ArrowSquareOut, Warning } from '@phosphor-icons/react/dist/ssr';
import type { ExplorerLink } from '@/lib/explorer';

/** "Open on" links for every explorer known for the chain and query type. */
export function ExplorerLinks({ links, compact = false }: { links: ExplorerLink[]; compact?: boolean }) {
  if (!links.length) return <p className="text-sm font-semibold text-muted">No explorer is known for this chain.</p>;
  return (
    <ul className={`flex flex-wrap gap-2 ${compact ? '' : 'mt-1'}`}>
      {links.map((l, i) => (
        <li key={l.href}>
          <a
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-bold transition-colors ${
              i === 0 && !l.unreachable ? 'border-accent/60 bg-accent/10 text-accent hover:bg-accent/20' : 'border-line text-fg/85 hover:border-line-strong hover:text-fg'
            }`}
          >
            {l.unreachable && <Warning aria-label="did not respond at the last check" weight="bold" className="size-3.5 text-redline" />}
            {l.name}
            <ArrowSquareOut aria-hidden weight="bold" className="size-3.5" />
          </a>
        </li>
      ))}
    </ul>
  );
}
