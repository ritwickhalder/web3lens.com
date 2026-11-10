import { Crown } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';

/**
 * The one way Web3Lens mentions Pro inside a feature: a quiet inline line where a limit is hit, never a popup.
 */
export function ProNote({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-muted ${className}`}>
      <Crown aria-hidden weight="bold" className="size-4 shrink-0 text-accent" />
      <span>{children}</span>
      <Link href="/pricing" className="font-bold text-accent underline underline-offset-2 hover:text-accent-hover">
        See Pro
      </Link>
    </p>
  );
}

/** A small "Pro" tag for buttons that need Pro. */
export function ProTag() {
  return <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-accent">Pro</span>;
}
