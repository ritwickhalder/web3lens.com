/**
 * SMTP transport for the welcome email and the uninstall-survey fallback, configured exactly like the contact form
 * and alert emails (SMTP_HOST/PORT/SECURE/USER/PASSWORD/FROM). Without SMTP_USER and SMTP_PASSWORD there is no
 * transport and callers skip sending. Injectable for tests.
 */
import nodemailer from 'nodemailer';

export type OutgoingMail = { from: string; to: string; subject: string; text: string; html: string; headers?: Record<string, string> };
export type MailTransport = { sendMail(mail: OutgoingMail): Promise<unknown> };

let override: MailTransport | null | undefined;

/** Tests only: `null` means "SMTP not configured"; `undefined` restores the real transport. */
export function setMailerForTests(t: MailTransport | null | undefined) {
  override = t;
}

export function mailer(): MailTransport | null {
  if (override !== undefined) return override;
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

export const mailSender = () => process.env.SMTP_FROM || process.env.SMTP_USER || 'hello@web3lens.com';

/** Where messages for the site owner go (same as the contact form). */
export const ownerInbox = () => process.env.CONTACT_NOTIFY_TO || mailSender();
