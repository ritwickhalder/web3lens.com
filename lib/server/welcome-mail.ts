/**
 * Welcome email, sent once when a Web3Lens account is created (Better Auth's user.create.after hook in
 * lib/server/auth.ts). Ported from Super Session Manager's lib/email-templates/welcome.ts.
 *
 * Best effort: without SMTP nothing is sent, and a failed send is logged, never thrown, so it can't break sign-in.
 * It mentions the Pro trial only when Pro can actually be bought on this deployment.
 */
import { SITE } from '@/config/site';
import { escapeHtml, headerSafe } from '@/lib/contact';
import { billingConfigured, serverEnv } from '@/lib/server/env';
import { mailer, mailSender, type OutgoingMail } from '@/lib/server/mailer';

export function firstName(name: string | null | undefined): string {
  const first = String(name ?? '').trim().split(/\s+/)[0] ?? '';
  // Google names are free text: keep it short and printable.
  return first.replace(/\p{C}/gu, '').slice(0, 40);
}

export function renderWelcomeEmail(user: { email: string; name?: string | null }, opts: { base?: string; proOnSale?: boolean } = {}): OutgoingMail {
  const base = opts.base ?? serverEnv.authUrl;
  const proOnSale = opts.proOnSale ?? billingConfigured();
  const hi = firstName(user.name) ? `Hi ${firstName(user.name)},` : 'Hi,';
  const steps = [
    { title: 'Search anything', body: `Paste an address, transaction hash, block or ENS name on ${base}/search. Web3Lens finds the chain and checks it.`, href: `${base}/search` },
    { title: 'Add the browser extension', body: 'Right-click any address on any page, or type w3 in the address bar. Then sign the extension in from its Settings.', href: `${base}/extension` },
    { title: 'Manage your account', body: 'See your plan, your signed-in devices and extension sessions, or delete the account.', href: `${base}/account` },
    ...(proOnSale ? [{ title: 'Try Pro free for 7 days', body: 'Bigger batches, saved addresses synced everywhere, a watchlist with alerts and API keys.', href: `${base}/pricing` }] : []),
  ];
  const text = [
    hi,
    '',
    'Welcome to Web3Lens! Your account is ready.',
    '',
    ...steps.flatMap((s) => [`• ${s.title}: ${s.body}`, `  ${s.href}`, '']),
    'Web3Lens never asks for private keys or seed phrases. If anyone does, it is a scam.',
    '',
    `Questions or ideas? Just reply, or write to us at ${base}/contact.`,
    '',
    `— ${SITE.author.name}, ${SITE.name}`,
  ].join('\n');
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#0f1d2b;max-width:560px">
<p>${escapeHtml(hi)}</p>
<p><b>Welcome to Web3Lens!</b> Your account is ready.</p>
${steps
  .map((s) => `<p style="margin:14px 0"><a href="${escapeHtml(s.href)}" style="color:#0a7f99;font-weight:bold">${escapeHtml(s.title)}</a><br>${escapeHtml(s.body)}</p>`)
  .join('\n')}
<p style="margin-top:20px"><small>Web3Lens never asks for private keys or seed phrases. If anyone does, it is a scam.</small></p>
<p>Questions or ideas? Just reply, or use the <a href="${escapeHtml(`${base}/contact`)}" style="color:#0a7f99">contact form</a>.</p>
<p>— ${escapeHtml(SITE.author.name)}, ${escapeHtml(SITE.name)}</p>
</div>`;
  return {
    from: `${SITE.name} <${mailSender()}>`,
    to: user.email,
    subject: headerSafe('Welcome to Web3Lens'),
    text,
    html,
  };
}

/** Never throws. Returns whether a message went out. */
export async function sendWelcomeEmail(user: { email: string; name?: string | null }): Promise<boolean> {
  const t = mailer();
  if (!t || !user.email) return false;
  try {
    await t.sendMail(renderWelcomeEmail(user));
    return true;
  } catch (e) {
    console.error('[welcome-mail] send failed', e);
    return false;
  }
}
