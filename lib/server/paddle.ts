/**
 * Paddle Billing webhooks: signature check, then one idempotent, order-safe apply per event. Pure apart from the
 * store passed in (lib/server/stores.ts in production, PGlite in tests). Ported from Edit Page's lib/paddle.ts with
 * two fixes: a full refund of a subscription charge ends that period's access, and refunds are written apart from
 * the ordering guard so a late subscription event can't undo them.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { SubscriptionRow, SubscriptionStatus } from '@/lib/server/membership';

/** Paddle-Signature: "ts=…;h1=…" (several h1 while a secret rotates); HMAC-SHA256 of `${ts}:${rawBody}`. */
export function verifyPaddleSignature(rawBody: string, header: string | null, secrets: readonly string[], now = Date.now(), toleranceSec = 300): boolean {
  if (!header || !secrets.length) return false;
  const parts = header.split(';').map((p) => p.trim().split('=') as [string, string | undefined]);
  const ts = parts.find(([k]) => k === 'ts')?.[1];
  const sigs = parts.filter(([k, v]) => k === 'h1' && v && /^[0-9a-f]+$/i.test(v)).map(([, v]) => v!);
  if (!ts || !sigs.length || !/^\d+$/.test(ts)) return false;
  if (Math.abs(now / 1000 - Number(ts)) > toleranceSec) return false; // replay protection
  return secrets.some((secret) => {
    const expected = createHmac('sha256', secret).update(`${ts}:${rawBody}`).digest();
    return sigs.some((s) => {
      const got = Buffer.from(s, 'hex');
      return got.length === expected.length && timingSafeEqual(got, expected);
    });
  });
}

export interface Catalog {
  monthly: string;
  yearly: string;
  lifetime: string;
}

/** Our plan for a price id; other products on the shared Paddle account are ignored. */
export function planOfPrice(catalog: Catalog, priceId: unknown): SubscriptionRow['plan'] | null {
  if (typeof priceId !== 'string' || !priceId) return null;
  if (priceId === catalog.monthly) return 'monthly';
  if (priceId === catalog.yearly) return 'yearly';
  if (priceId === catalog.lifetime) return 'lifetime';
  return null;
}

export interface PaddleEvent {
  event_id: string;
  event_type: string;
  occurred_at: string;
  // Paddle's payloads are wide; every field read below is checked before use.
  data: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

/** Shape check after the signature check: anything else is a 400. */
export function isPaddleEvent(e: unknown): e is PaddleEvent {
  const v = e as PaddleEvent | null;
  return !!v && typeof v.event_id === 'string' && !!v.event_id && typeof v.event_type === 'string' && !!v.data && typeof v.data === 'object' && Number.isFinite(Date.parse(v.occurred_at));
}

export interface SubscriptionStore {
  /** Record an event id; false if it was already applied (idempotency). */
  recordEvent(event: PaddleEvent): Promise<boolean>;
  /** Un-record an event whose apply failed, so Paddle's retry runs it again instead of being dropped. */
  forgetEvent(eventId: string): Promise<void>;
  setOutcome(eventId: string, outcome: string): Promise<void>;
  get(id: string): Promise<SubscriptionRow | null>;
  /**
   * Write the row unless a newer event already wrote it. The check is part of the write, so two webhooks for the
   * same subscription arriving at once can't let the older one win. Never touches the refund columns. False = stale.
   */
  upsert(row: SubscriptionRow): Promise<boolean>;
  /** Set or clear the refund columns, outside the ordering guard. False when the row doesn't exist. */
  setRefund(id: string, refund: { at: Date; periodEnd: Date | null } | null): Promise<boolean>;
  userExists(userId: string): Promise<boolean>;
}

const STATUS: Record<string, SubscriptionStatus> = {
  active: 'active',
  trialing: 'trialing',
  past_due: 'past_due',
  paused: 'paused',
  canceled: 'canceled',
};

const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
const date = (v: unknown): Date | null => {
  const s = str(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : null;
};

/** Our plan and price of the first line item that is one of our prices (a subscription may carry other items). */
function ourItem(catalog: Catalog, items: unknown): { plan: SubscriptionRow['plan']; priceId: string } | null {
  if (!Array.isArray(items)) return null;
  for (const i of items as { price?: { id?: unknown }; price_id?: unknown }[]) {
    const priceId = i?.price?.id ?? i?.price_id;
    const plan = planOfPrice(catalog, priceId);
    if (plan) return { plan, priceId: priceId as string };
  }
  return null;
}

/**
 * Apply one verified event. Idempotent (event ids recorded) and order-safe (an event older than the stored state
 * is ignored). Returns the outcome stored in webhook_events.outcome.
 */
export async function applyPaddleEvent(store: SubscriptionStore, event: PaddleEvent, catalog: Catalog): Promise<string> {
  if (!(await store.recordEvent(event))) return 'duplicate';
  let outcome: string;
  try {
    outcome = await applyRecorded(store, event, catalog);
  } catch (e) {
    // Recorded but not applied: forget it so the webhook's 500 makes Paddle retry it.
    await store.forgetEvent(event.event_id).catch(() => {});
    throw e;
  }
  await store.setOutcome(event.event_id, outcome).catch(() => {});
  return outcome;
}

async function ownerOf(store: SubscriptionStore, customData: unknown): Promise<string | null> {
  const id = str((customData as { userId?: unknown } | null)?.userId);
  // Unknown ids (a deleted account, or a hand-edited checkout) are stored ownerless instead of failing forever.
  return id && id.length <= 64 && (await store.userExists(id)) ? id : null;
}

async function applyRecorded(store: SubscriptionStore, event: PaddleEvent, catalog: Catalog): Promise<string> {
  const at = new Date(event.occurred_at);
  const d = event.data;

  const write = async (row: SubscriptionRow) => {
    const existing = await store.get(row.id);
    if (existing && existing.paddleUpdatedAt > at) return 'stale';
    const merged: SubscriptionRow = { ...existing, ...row, userId: row.userId ?? existing?.userId ?? null };
    return (await store.upsert(merged)) ? 'applied' : 'stale';
  };

  if (event.event_type.startsWith('subscription.')) {
    const item = ourItem(catalog, d.items);
    if (!item || item.plan === 'lifetime') return 'ignored';
    const id = str(d.id);
    if (!id) return 'ignored';
    const scheduledCancel = d.scheduled_change?.action === 'cancel' ? date(d.scheduled_change.effective_at) : null;
    const status = STATUS[d.status as string] ?? 'canceled';
    // A scheduled cancellation keeps the subscription until its effective date; an immediate one ends now.
    const endsAt = scheduledCancel ?? date(d.current_billing_period?.ends_at) ?? (status === 'canceled' ? (date(d.canceled_at) ?? at) : null);
    return write({
      id,
      userId: await ownerOf(store, d.custom_data),
      plan: item.plan,
      priceId: item.priceId,
      status: scheduledCancel && status === 'active' ? 'canceled' : status,
      endsAt,
      paddleUpdatedAt: at,
      customerId: str(d.customer_id),
      manageUrl: str(d.management_urls?.update_payment_method),
      cancelUrl: str(d.management_urls?.cancel),
    });
  }

  if (event.event_type === 'transaction.completed') {
    // Subscription access follows subscription.* events; only one-time (lifetime) purchases are written here.
    if (d.subscription_id) return 'ignored';
    const item = ourItem(catalog, d.items);
    const id = str(d.id);
    if (!item || item.plan !== 'lifetime' || !id) return 'ignored';
    return write({
      id: `txn:${id}`,
      userId: await ownerOf(store, d.custom_data),
      plan: 'lifetime',
      priceId: item.priceId,
      status: 'active',
      endsAt: null,
      paddleUpdatedAt: at,
      customerId: str(d.customer_id),
    });
  }

  if (event.event_type === 'adjustment.created' || event.event_type === 'adjustment.updated') {
    if (d.status !== 'approved') return 'ignored';
    // A partial refund (a goodwill discount, say) keeps access: only a full refund or a chargeback revokes it.
    if (d.action === 'refund' && d.type === 'partial') return 'partial_refund';
    const revoke = d.action === 'chargeback' || d.action === 'refund';
    const restore = d.action === 'chargeback_reverse';
    if (!revoke && !restore) return 'ignored';
    const subId = str(d.subscription_id);
    const txnId = str(d.transaction_id);
    const row = (subId && (await store.get(subId))) || (txnId && (await store.get(`txn:${txnId}`))) || null;
    if (!row) return 'ignored'; // not one of ours
    if (restore) return (await store.setRefund(row.id, null)) ? 'restored' : 'ignored';
    return (await store.setRefund(row.id, { at, periodEnd: row.plan === 'lifetime' ? null : row.endsAt })) ? 'refunded' : 'ignored';
  }
  return 'ignored';
}
