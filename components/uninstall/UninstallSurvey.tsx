'use client';

import { ArrowRight, CheckCircle, MagnifyingGlass } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { extensionInstallHref } from '@/config/site';
import { UNINSTALL_FOLLOW_UPS, UNINSTALL_LIMITS, UNINSTALL_REASONS, type UninstallBrowser, type UninstallReasonId } from '@/lib/uninstall';

const fieldClass =
  'w-full rounded-md border border-line bg-ink px-3.5 py-2.5 text-base font-medium text-fg outline-none transition-colors placeholder:text-faint hover:border-line-strong focus:border-accent';

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent' } | { kind: 'error'; message: string };

/** A random id for this visit, so a double submit is stored once. Not linked to anyone. */
function newVisitKey(): string | null {
  try {
    return crypto.randomUUID();
  } catch {
    return null;
  }
}

function storeFor(browser: UninstallBrowser): 'chrome' | 'firefox' | 'edge' {
  return browser === 'firefox' ? 'firefox' : browser === 'edge' ? 'edge' : 'chrome';
}

export function UninstallSurvey({ version, browser }: { version: string | null; browser: UninstallBrowser }) {
  const [reason, setReason] = useState<UninstallReasonId | null>(null);
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const visitKey = useRef<string | null | undefined>(undefined);

  const followUp = reason ? UNINSTALL_FOLLOW_UPS[reason] : null;
  const limit = followUp?.field === 'competitor' ? UNINSTALL_LIMITS.competitor : UNINSTALL_LIMITS.details;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason || status.kind === 'sending') return;
    if (visitKey.current === undefined) visitKey.current = newVisitKey();
    setStatus({ kind: 'sending' });
    try {
      const res = await fetch('/api/uninstall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, answer, version, browser, visitKey: visitKey.current }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setStatus({ kind: 'error', message: json.error || 'Something went wrong. Please try again.' });
        return;
      }
      setStatus({ kind: 'sent' });
    } catch {
      setStatus({ kind: 'error', message: 'Network error. Please try again.' });
    }
  }

  if (status.kind === 'sent') {
    return (
      <div role="status" className="marks mx-auto max-w-3xl rounded-xl border border-line-strong bg-ink-2 p-8 text-center sm:p-10">
        <CheckCircle aria-hidden weight="duotone" className="mx-auto size-12 text-accent" />
        <p className="heading mt-5 text-3xl">Thank you, that really helps.</p>
        <p className="mx-auto mt-2 max-w-xl text-base font-medium text-muted">
          Your answer goes straight to the person who builds Web3Lens. The website keeps working without the extension, and you can come back any time.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link href="/search" className="flex items-center gap-2 rounded-md bg-accent px-5 py-3 text-base font-extrabold text-ink transition-colors hover:bg-accent-hover">
            <MagnifyingGlass aria-hidden weight="bold" className="size-5" />
            Search on web3lens.com
          </Link>
          <a
            href={extensionInstallHref(storeFor(browser))}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-line-strong px-5 py-3 text-base font-bold text-fg transition-colors hover:border-accent hover:text-accent"
          >
            Reinstall the extension
          </a>
        </div>
        <p className="mt-6 text-sm font-semibold text-faint">
          Something else on your mind?{' '}
          <Link href="/contact" className="text-accent hover:underline">
            Send us a message
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="marks relative mx-auto max-w-3xl rounded-xl border border-line-strong bg-ink-2 p-5 sm:p-7">
      <fieldset>
        <legend className="mb-3 text-lg font-extrabold text-fg">Why did you remove the Web3Lens extension?</legend>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {UNINSTALL_REASONS.map((r) => {
            const selected = reason === r.id;
            return (
              <label
                key={r.id}
                className={`flex cursor-pointer items-center gap-3 rounded-md border px-3.5 py-3 text-[15px] font-semibold transition-colors has-[:focus-visible]:border-accent ${
                  selected ? 'border-accent bg-accent/10 text-fg' : 'border-line bg-ink text-fg/90 hover:border-line-strong'
                }`}
              >
                <input
                  type="radio"
                  name="reason"
                  value={r.id}
                  checked={selected}
                  onChange={() => {
                    setReason(r.id);
                    setAnswer('');
                  }}
                  className="size-4 shrink-0 accent-[var(--color-accent)]"
                />
                {r.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      {followUp && (
        <label className="mt-5 block">
          <span className="mb-1.5 block text-sm font-bold text-fg/90">
            {followUp.question} <span className="font-semibold text-faint">(optional)</span>
          </span>
          {followUp.field === 'competitor' ? (
            <input value={answer} onChange={(e) => setAnswer(e.target.value)} maxLength={limit} autoComplete="off" placeholder={followUp.placeholder} className={fieldClass} />
          ) : (
            <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} maxLength={limit} rows={3} placeholder={followUp.placeholder} className={`${fieldClass} resize-y`} />
          )}
          <span className="mt-1 block text-right text-xs font-semibold text-faint">
            {answer.length}/{limit}
          </span>
        </label>
      )}

      {status.kind === 'error' && (
        <p role="alert" className="mt-5 border-l-2 border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
          {status.message}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
        <p className="text-sm font-semibold text-faint">
          Anonymous: no email, account or address is sent.{' '}
          <Link href="/" className="text-accent hover:underline">
            Skip
          </Link>
        </p>
        <button
          type="submit"
          disabled={!reason || status.kind === 'sending'}
          className="flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-base font-extrabold text-ink transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {status.kind === 'sending' ? 'Sending…' : 'Send answer'}
          <ArrowRight aria-hidden weight="bold" className="size-5" />
        </button>
      </div>
    </form>
  );
}
