import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createRateLimiter, headerSafe, renderContactEmail, validateContact, type ContactBody } from '@/lib/contact';

export const dynamic = 'force-dynamic';

const isRateLimited = createRateLimiter();

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip') || 'unknown';
}

export async function POST(request: NextRequest) {
  let body: ContactBody;
  try {
    body = (await request.json()) as ContactBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const check = validateContact(body);
  // Bots that fill the honeypot get a success response so they don't learn anything.
  if (!check.ok) {
    return check.honeypot
      ? NextResponse.json({ success: true })
      : NextResponse.json({ error: check.error }, { status: check.status });
  }

  const { email } = check.message;
  if (isRateLimited(`ip:${getClientIp(request)}`) || isRateLimited(`email:${email.toLowerCase()}`)) {
    return NextResponse.json({ error: 'Too many messages sent recently. Please try again later.' }, { status: 429 });
  }

  const { SMTP_USER, SMTP_PASSWORD } = process.env;
  if (!SMTP_USER || !SMTP_PASSWORD) {
    console.warn('[contact] SMTP not configured; email not sent');
    return NextResponse.json({ success: true, warn: 'smtp_not_configured' });
  }

  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465;
  const from = process.env.SMTP_FROM || SMTP_USER;
  const to = process.env.CONTACT_NOTIFY_TO || from;

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    });
    const mail = renderContactEmail(check.message);
    // The sender is always our own address; the visitor goes in Reply-To (the PHP version put
    // their input in From, which allowed header injection and failed SPF).
    await transporter.sendMail({
      from: `Web3Lens <${from}>`,
      to,
      replyTo: `${headerSafe(check.message.name).replace(/[<>"]/g, '')} <${email}>`,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[contact] send error', err);
    return NextResponse.json({ error: 'Your contact request submission failed, please try again.' }, { status: 500 });
  }
}
