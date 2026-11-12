'use client';

import { ArrowRight, CheckCircle } from '@phosphor-icons/react/dist/ssr';
import { useState } from 'react';

const fieldClass =
  'w-full rounded-lg border border-line bg-ink px-4 py-2.5 text-base font-medium text-fg outline-none transition-colors placeholder:text-faint hover:border-line-strong focus:border-accent';
const labelClass = 'mb-1.5 block text-sm font-bold text-fg/90';

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
      <div role="status" className="marks flex h-full flex-col items-center justify-center rounded-2xl border border-line-strong bg-ink-2 p-10 text-center">
        <CheckCircle aria-hidden weight="duotone" className="mx-auto size-12 text-accent" />
        <p className="heading mt-5 text-3xl">Thank you!</p>
        <p className="mt-2 text-sm text-muted">Your message has been delivered. We'll get back to you soon.</p>
        <button
          type="button"
          onClick={() => setStatus({ kind: 'idle' })}
          className="mt-6 text-sm font-bold text-accent hover:underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="marks relative flex h-full flex-col rounded-2xl border border-line-strong bg-ink-2 p-5 sm:p-7">
      <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 sm:grid-rows-[auto_auto_1fr]">
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
        <label className="flex flex-col sm:col-span-2">
          <span className={labelClass}>Message</span>
          <textarea
            name="message"
            required
            maxLength={2000}
            rows={5}
            className={`${fieldClass} min-h-28 flex-1 resize-none`}
          />
        </label>
      </div>
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {status.kind === 'error' && (
        <p role="alert" className="mt-5 border-l-2 border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
          {status.message}
        </p>
      )}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
        <p className="text-sm font-semibold text-faint">We only use your email to reply to you.</p>
        <button
          type="submit"
          disabled={status.kind === 'sending'}
          className="flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-base font-extrabold text-ink transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {status.kind === 'sending' ? 'Sending…' : 'Send message'}
          <ArrowRight aria-hidden weight="bold" className="size-5" />
        </button>
      </div>
    </form>
  );
}
