'use client';

import { useState } from 'react';

const fieldClass =
  'mb-6 w-full border border-black/[.075] bg-[#f8f8f8] p-3 text-base text-[#727272] shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.24)] outline-none transition-colors hover:border-[#8BC3A3] focus:border-[#8BC3A3]';

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

  return (
    <div className="bg-white p-[30px] text-left shadow-[0_10px_20px_rgba(0,0,0,0.19),0_6px_6px_rgba(0,0,0,0.23)]">
      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-2 gap-x-4">
          <input name="name" required maxLength={100} placeholder="Name" aria-label="Name" className={fieldClass} />
          <input
            name="email"
            type="email"
            required
            placeholder="Email"
            aria-label="Email"
            className={fieldClass}
          />
        </div>
        <input name="subject" required maxLength={150} placeholder="Subject" aria-label="Subject" className={fieldClass} />
        <textarea
          name="message"
          required
          maxLength={2000}
          placeholder="Message"
          aria-label="Message"
          className={`${fieldClass} h-[170px] resize-y`}
        />
        <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>
            Website
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <button
          type="submit"
          disabled={status.kind === 'sending'}
          className="mx-auto block w-[180px] rounded-[3px] bg-[#8BC3A3] p-[15px] font-bold text-white shadow-[0_1px_4px_rgba(0,0,0,0.10)] transition-colors hover:bg-[#111] disabled:opacity-60"
        >
          {status.kind === 'sending' ? 'Sending…' : 'Send Message'}
        </button>
      </form>
      {status.kind === 'sent' && (
        <p role="status" className="mt-6 bg-[#f2f2f2] px-5 py-3">
          <strong>Thank You !</strong> Your email has been delivered.
        </p>
      )}
      {status.kind === 'error' && (
        <p role="alert" className="mt-6 rounded bg-[#f8d7da] px-5 py-3 text-[#721c24]">
          {status.message}
        </p>
      )}
    </div>
  );
}
