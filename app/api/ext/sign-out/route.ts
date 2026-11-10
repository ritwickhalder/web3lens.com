import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import { accountError, accountJson, accountOptions } from '@/lib/server/account-http';
import { accountsConfigured } from '@/lib/server/env';
import { currentUser } from '@/lib/server/session';

/** POST /api/ext/sign-out with the extension's bearer token: ends that session on the server. */
export async function POST(request: Request) {
  if (!accountsConfigured()) return accountError(request, 'Accounts are not available yet.', 503);
  // Bearer only: a cross-site form post riding the website's cookie can't sign anyone out.
  if (!request.headers.get('authorization')) return accountError(request, 'Forbidden', 403);
  const who = await currentUser(request.headers);
  if (!who) return accountJson(request, { ok: true }); // already gone
  const s = schema.session;
  await getDb()
    .delete(s)
    .where(and(eq(s.id, who.session.id), eq(s.userId, who.user.id)));
  return accountJson(request, { ok: true });
}

export const OPTIONS = accountOptions;
