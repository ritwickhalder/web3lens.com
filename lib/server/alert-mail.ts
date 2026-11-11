/**
 * Alert emails: one digest per user per cron run, only for watches with email on, each with a signed one-click
 * unsubscribe link. Uses the same SMTP settings as the contact form; without them nothing is sent and the alerts stay
 * on /watchlist. The transport is injectable for tests.
 */
import nodemailer from 'nodemailer';
import { SITE } from '@/config/site';
import { escapeHtml, headerSafe } from '@/lib/contact';
import { getChain } from '@/lib/chains';
import { serverEnv } from '@/lib/server/env';
import { unsubscribeToken } from '@/lib/server/watch';
import { markEmailed, pendingDigests, type AlertOut } from '@/lib/server/watch-store';

export type Mail = { from: string; to: string; subject: string; text: string; html: string; headers?: Record<string, string> };
type Transport = { sendMail(mail: Mail): Promise<unknown> };

let transport: Transport | null | undefined;

/** Tests only. */
export function setMailTransport(t: Transport | null) {
  transport = t;
}

function defaultTransport(): Transport | null {
  const { SMTP_USER, SMTP_PASSWORD } = process.env;
  if (!SMTP_USER || !SMTP_PASSWORD) return null;
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
}

const sender = () => process.env.SMTP_FROM || process.env.SMTP_USER || 'alerts@web3lens.com';

export function renderDigest(user: { email: string }, alerts: (AlertOut & { watchId: string })[], base = serverEnv.authUrl): Mail {
  const n = alerts.length;
  const unsub = (watchId: string) => `${base}/api/watches/unsubscribe?t=${encodeURIComponent(unsubscribeToken(watchId))}`;
  const lines = alerts.map((a) => {
    const name = a.label || `${a.address.slice(0, 10)}…${a.address.slice(-6)}`;
    const chain = getChain(a.chainId)?.name ?? a.chainId;
    return { text: `• ${name} (${chain}): ${a.summary}. Source: ${a.source}, ${new Date(a.createdAt).toUTCString()}`, name, chain, a };
  });
  const firstWatch = alerts[0]!.watchId;
  return {
    from: `${SITE.name} <${sender()}>`,
    to: user.email,
    subject: headerSafe(n === 1 ? `Activity on ${lines[0]!.name}` : `Activity on ${n} watched addresses`).slice(0, 200),
    text: [
      `Web3Lens found new activity on your watchlist:`,
      '',
      ...lines.map((l) => l.text),
      '',
      `See details: ${base}/watchlist`,
      'Balances come from public sources at the time shown; open the address to confirm before acting.',
      '',
      ...[...new Set(alerts.map((a) => a.watchId))].map((id) => `Stop emails for ${lines.find((l) => l.a.watchId === id)!.name}: ${unsub(id)}`),
    ].join('\n'),
    html: `<p>Web3Lens found new activity on your watchlist:</p><ul>${lines
      .map((l) => `<li><b>${escapeHtml(l.name)}</b> (${escapeHtml(l.chain)}): ${escapeHtml(l.a.summary)}.<br><small>Source: ${escapeHtml(l.a.source)}, ${escapeHtml(new Date(l.a.createdAt).toUTCString())} · <a href="${escapeHtml(unsub(l.a.watchId))}">Stop emails for this address</a></small></li>`)
      .join('')}</ul><p><a href="${escapeHtml(`${base}/watchlist`)}">Open your watchlist</a></p><p><small>Balances come from public sources at the time shown; open the address to confirm before acting.</small></p>`,
    headers: { 'List-Unsubscribe': `<${unsub(firstWatch)}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  };
}

/** Sends pending digests; marks alerts emailed only after a successful send. */
export async function sendDigests(now = new Date()): Promise<{ sent: number; failed: number; skipped: boolean }> {
  const t = transport === undefined ? defaultTransport() : transport;
  if (!t) return { sent: 0, failed: 0, skipped: true };
  let sent = 0;
  let failed = 0;
  for (const d of await pendingDigests(now)) {
    try {
      await t.sendMail(renderDigest(d.user, d.alerts));
      await markEmailed(d.alerts.map((a) => a.id), now);
      sent++;
    } catch (e) {
      failed++;
      console.error('[alerts] email failed', e instanceof Error ? e.message : e);
    }
  }
  return { sent, failed, skipped: false };
}
