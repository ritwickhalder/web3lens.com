import { applyPaddleEvent, isPaddleEvent, verifyPaddleSignature } from '@/lib/server/paddle';
import { billingConfigured, serverEnv } from '@/lib/server/env';
import { subscriptionStore } from '@/lib/server/stores';

/**
 * Paddle Billing webhook. Signature-verified with a replay window, idempotent by event id, order-safe, and other
 * products on the shared Paddle account are ignored. A failed apply answers 500 so Paddle retries it.
 * Subscribe the destination to: subscription.*, transaction.completed, adjustment.created, adjustment.updated.
 */
export async function POST(request: Request) {
  if (!billingConfigured()) return Response.json({ error: 'Billing is not configured' }, { status: 503 });
  const raw = await request.text();
  if (raw.length > 1_000_000) return Response.json({ error: 'Too large' }, { status: 413 });
  if (!verifyPaddleSignature(raw, request.headers.get('paddle-signature'), serverEnv.paddleWebhookSecrets)) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }
  let event: unknown;
  try {
    event = JSON.parse(raw);
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!isPaddleEvent(event)) return Response.json({ error: 'Not a Paddle event' }, { status: 400 });
  try {
    const result = await applyPaddleEvent(subscriptionStore, event, serverEnv.prices);
    return Response.json({ ok: true, result });
  } catch (e) {
    console.error('[paddle] applying', event.event_id, event.event_type, 'failed:', e instanceof Error ? e.message : e);
    return Response.json({ error: 'Could not apply the event; retry' }, { status: 500 });
  }
}
