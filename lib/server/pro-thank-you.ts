/**
 * "Thank you for going Pro": one transactional email per new purchase (template: pro-thank-you-template.ts).
 *
 * Paddle sends several events per purchase (subscription.created, .activated, .updated, transaction.completed) and
 * this app has no per-purchase claim table, so "new" is decided from the stored row: thank only when the event
 * moved an owned row from "not active" (missing, trialing, canceled…) to "active". Duplicates never get here
 * (applyPaddleEvent answers "duplicate"), and renewals find the row already active.
 *
 * Best effort and never throws: access is already granted, and a failed send is only logged. Transactional, so it
 * ignores the product-email opt-out and has no unsubscribe link.
 */
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import type { SubscriptionRow } from '@/lib/server/membership';
import { mailer, mailSender, type MailTransport } from '@/lib/server/mailer';
import type { PaddleEvent, SubscriptionStore } from '@/lib/server/paddle';
import { PRO_THANK_YOU_SUBJECT, proThankYouHtml, proThankYouText } from '@/lib/server/pro-thank-you-template';

/** The subscriptions row this event writes, or null for events that can't start a purchase. */
export function purchaseRowId(event: PaddleEvent): string | null {
  const id = typeof event.data?.id === 'string' ? event.data.id : null;
  if (!id) return null;
  if (event.event_type === 'subscription.created' || event.event_type === 'subscription.activated' || event.event_type === 'subscription.updated') return id;
  if (event.event_type === 'transaction.completed' && !event.data.subscription_id) return `txn:${id}`;
  return null;
}

export async function sendProThankYouIfNew(
  store: Pick<SubscriptionStore, 'get'>,
  rowId: string,
  before: SubscriptionRow | null,
  transport: MailTransport | null = mailer(),
): Promise<'sent' | 'skipped' | 'failed'> {
  try {
    if (!transport || before?.status === 'active') return 'skipped';
    const row = await store.get(rowId);
    if (!row || row.status !== 'active' || !row.userId || row.refundedAt) return 'skipped';
    const [u] = await getDb().select().from(schema.user).where(eq(schema.user.id, row.userId)).limit(1);
    if (!u?.email) return 'skipped';
    await transport.sendMail({
      from: `Web3Lens <${mailSender()}>`,
      to: u.email,
      subject: PRO_THANK_YOU_SUBJECT,
      text: proThankYouText(u.name, row.plan),
      html: proThankYouHtml(u.name, row.plan),
    });
    return 'sent';
  } catch (e) {
    console.error('[pro-thank-you] send failed', e instanceof Error ? e.message : e);
    return 'failed';
  }
}
