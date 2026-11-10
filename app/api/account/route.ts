import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import { accountError, accountJson, isSameOrigin, readJson } from '@/lib/server/account-http';
import { accountsConfigured } from '@/lib/server/env';
import { hasChargeableSubscription } from '@/lib/server/membership';
import { currentUser } from '@/lib/server/session';
import { subscriptionsOf } from '@/lib/server/stores';

/**
 * DELETE /api/account { confirmEmail }: deletes the signed-in user (sessions, Google identity, profile and usage go
 * with it). Website only (same origin), and refused while a subscription can still charge, so nobody is billed for a
 * deleted account: cancel in Paddle first. Billing records stay, without an owner.
 */
export async function DELETE(request: Request) {
  if (!accountsConfigured()) return accountError(request, 'Accounts are not available yet.', 503);
  if (!isSameOrigin(request)) return accountError(request, 'Forbidden', 403);
  const who = await currentUser(request.headers);
  if (!who) return accountError(request, 'Not signed in', 401);
  const body = await readJson<{ confirmEmail?: unknown }>(request);
  if (typeof body?.confirmEmail !== 'string' || body.confirmEmail.trim().toLowerCase() !== who.user.email.toLowerCase()) {
    return accountError(request, 'Type your account email to confirm.', 400);
  }
  if (hasChargeableSubscription(await subscriptionsOf(who.user.id))) {
    return accountError(request, 'Cancel your subscription first (Manage billing), then delete the account.', 409);
  }
  const db = getDb();
  await db.delete(schema.usageCounters).where(eq(schema.usageCounters.subject, `u:${who.user.id}`));
  await db.delete(schema.user).where(eq(schema.user.id, who.user.id));
  return accountJson(request, { ok: true });
}
