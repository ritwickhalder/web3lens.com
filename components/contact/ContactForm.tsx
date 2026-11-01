'use client';

import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

const fieldClass =
  'w-full rounded-xl border border-line bg-white/[0.03] px-4 py-3 text-[15px] text-fg outline-none transition-colors placeholder:text-faint hover:border-line-strong focus:border-lime/60 focus:bg-white/[0.05]';
const labelClass = 'mb-1.5 block text-xs font-medium text-muted';

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent' } | { kind: 'error'; message: string };

/** Posts to /api/contact. Includes a hidden honeypot field and the render time for bot checks. */
export function ContactForm() {
  const [renderedAt] = useState(() => Date.now());
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    setStatus({ kind: 'sending' });
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, submittedAt: renderedAt }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setStatus({ kind: 'error', message: json.error || 'Something went wrong. Please try again.' });
        return;
      }
      form.reset();
      setStatus({ kind: 'sent' });
    } catch {
      setStatus({ kind: 'error', message: 'Network error. Please try again.' });
    }
  }

  if (status.kind === 'sent') {
    return (
      <div role="status" className="glass rounded-3xl p-10 text-center">
        <CheckCircle2 aria-hidden className="mx-auto size-10 text-lime" strokeWidth={1.5} />
        <p className="mt-5 font-display text-xl font-semibold">Thank you!</p>
        <p className="mt-2 text-sm text-muted">Your message has been delivered. We'll get back to you soon.</p>
        <button
          type="button"
          onClick={() => setStatus({ kind: 'idle' })}
          className="mt-6 text-sm text-lime underline-offset-4 hover:underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="glass relative rounded-3xl p-6 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <label>
          <span className={labelClass}>Name</span>
          <input name="name" required maxLength={100} autoComplete="name" className={fieldClass} />
        </label>
        <label>
          <span className={labelClass}>Email</span>
          <input name="email" type="email" required autoComplete="email" className={fieldClass} />
        </label>
        <label className="sm:col-span-2">
          <span className={labelClass}>Subject</span>
          <input name="subject" required maxLength={150} className={fieldClass} />
        </label>
        <label className="sm:col-span-2">
          <span className={labelClass}>Message</span>
          <textarea name="message" required maxLength={2000} rows={6} className={`${fieldClass} resize-y`} />
        </label>
      </div>
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {status.kind === 'error' && (
        <p role="alert" className="mt-5 rounded-xl border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm text-danger">
          {status.message}
        </p>
      )}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs text-faint">We only use your email to reply to you.</p>
        <button
          type="submit"
          disabled={status.kind === 'sending'}
          className="group flex items-center gap-2 rounded-2xl bg-lime px-6 py-3 font-display text-sm font-semibold text-ink transition-colors hover:bg-[#d4ff5c] disabled:opacity-60"
        >
          {status.kind === 'sending' ? 'Sending…' : 'Send message'}
          <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </form>
  );
}
