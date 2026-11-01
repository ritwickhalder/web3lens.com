/**
 * Contact form validation and email rendering, kept free of Next/nodemailer so it can be
 * unit-tested. Ported from Super Session Manager's app/api/contact/route.ts, minus Supabase.
 */

export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_SUBJECT_LENGTH = 150;
const MAX_LINKS = 2;
const MIN_FILL_MS = 3000;
const MAX_FORM_AGE_MS = 2 * 60 * 60 * 1000;
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const RATE_LIMIT_MAX = 3;

export type ContactBody = {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  /** Honeypot: hidden from people, filled in by bots. */
  website?: string;
  /** When the form was rendered (ms since epoch); too-fast submissions are bots. */
  submittedAt?: number;
};

export type ContactMessage = { name: string; email: string; subject: string; message: string };

export type ContactCheck =
  | { ok: true; message: ContactMessage }
  | { ok: false; honeypot: true }
  | { ok: false; honeypot?: false; status: number; error: string };

function countLinks(message: string): number {
  return (message.match(/https?:\/\/|www\.|[a-z0-9.-]+\.[a-z]{2,}/gi) || []).length;
}

export function validateContact(body: ContactBody, now = Date.now()): ContactCheck {
  const name = String(body.name ?? '').trim();
  const email = String(body.email ?? '').trim();
  const subject = String(body.subject ?? '').trim();
  const message = String(body.message ?? '').trim();
  const submittedAt = Number(body.submittedAt || 0);

  if (String(body.website ?? '').trim()) return { ok: false, honeypot: true };

  const fail = (error: string, status = 400): ContactCheck => ({ ok: false, status, error });
  if (!name || !email || !subject || !message) return fail('Please fill all the fields.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Please enter your valid email.');
  if (name.length > 100 || subject.length > MAX_SUBJECT_LENGTH) return fail('Name or subject is too long.');
  if (message.length > MAX_MESSAGE_LENGTH) return fail('Message is too long.');
  if (!submittedAt || now - submittedAt < MIN_FILL_MS) {
    return fail('Please take a moment to write your message before sending.');
  }
  if (now - submittedAt > MAX_FORM_AGE_MS) return fail('This form expired. Please refresh and try again.');
  if (/(.)\1{8,}/.test(message) || countLinks(message) > MAX_LINKS) {
    return fail('Your message looks like spam. Please remove repeated text or extra links.');
  }
  return { ok: true, message: { name, email, subject, message } };
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br />');
}

/** Strips CR/LF so user input can never add mail headers. */
export function headerSafe(s: string): string {
  return s.replace(/[\r\n]+/g, ' ').trim();
}

export function renderContactEmail({ name, email, subject, message }: ContactMessage) {
  return {
    subject: headerSafe(`[Web3Lens Contact] ${subject}`).slice(0, 200),
    text: [`Name:    ${name}`, `Email:   ${email}`, `Subject: ${subject}`, '', message, '', '--', 'Sent from web3lens.com/contact'].join('\n'),
    html: `<h2>Contact Request Submitted</h2>
<h4>Name</h4><p>${escapeHtml(name)}</p>
<h4>Email</h4><p><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
<h4>Subject</h4><p>${escapeHtml(subject)}</p>
<h4>Message</h4><p>${escapeHtml(message)}</p>`,
  };
}

/** Per-instance sliding-window limiter. Good enough for a low-traffic form on serverless. */
export function createRateLimiter(max = RATE_LIMIT_MAX, windowMs = RATE_LIMIT_WINDOW_MS) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return function isLimited(key: string, now = Date.now()): boolean {
    const current = hits.get(key);
    if (!current || current.resetAt <= now) {
      if (hits.size > 10_000) hits.clear();
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return false;
    }
    if (current.count >= max) return true;
    current.count += 1;
    return false;
  };
}
