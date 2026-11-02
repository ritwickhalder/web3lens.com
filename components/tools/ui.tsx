'use client';

import { CopyButton } from '@/components/ui/CopyButton';

export const inputCls =
  'h-11 w-full min-w-0 rounded-lg border border-line-strong bg-ink px-3 font-mono text-[15px] text-fg outline-none transition-colors placeholder:font-sans placeholder:font-semibold placeholder:text-faint focus:border-accent';
export const textareaCls =
  'min-h-28 w-full min-w-0 rounded-lg border border-line-strong bg-ink p-3 font-mono text-sm text-fg outline-none transition-colors placeholder:font-sans placeholder:font-semibold placeholder:text-faint focus:border-accent';
export const btnCls = 'inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-extrabold text-ink transition-colors hover:bg-accent-hover disabled:opacity-50';
export const ghostBtnCls = 'inline-flex h-10 items-center gap-2 rounded-lg border border-line px-3 text-sm font-bold text-fg/85 transition-colors hover:border-accent hover:text-accent';

export function Panel({ title, children, aside }: { title?: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-2xl border border-line bg-ink-2 p-5 sm:p-6">
      {(title || aside) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: React.ReactNode; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-bold text-muted">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs font-semibold text-faint">{hint}</p>}
    </div>
  );
}

/** A labelled read-only value with a copy button. */
export function Output({ label, value, mono = true }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div className="grid grid-cols-1 items-center gap-1.5 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto] sm:gap-3">
      <span className="text-sm font-bold text-faint">{label}</span>
      <span className={`min-w-0 break-all rounded-lg bg-ink px-3 py-2 text-sm text-fg ${mono ? 'font-mono' : 'font-semibold'}`}>{value || '—'}</span>
      {value ? <CopyButton value={value} label={`Copy ${label}`} /> : <span className="hidden size-9 sm:block" />}
    </div>
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  return children ? (
    <p role="alert" className="text-sm font-semibold text-danger">
      {children}
    </p>
  ) : null;
}

/** Runs `fn`, returning its value or the error message. */
export function attempt<T>(fn: () => T): { value: T; error: null } | { value: null; error: string } {
  try {
    return { value: fn(), error: null };
  } catch (e) {
    return { value: null, error: (e as Error).message };
  }
}
