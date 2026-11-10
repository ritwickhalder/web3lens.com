import { accountError, accountJson, accountOptions, isExtensionOrigin, readJson } from '@/lib/server/account-http';
import { EXTENSION_SESSION_AGENT, getAuth } from '@/lib/server/auth';
import { accountsConfigured } from '@/lib/server/env';
import { limited } from '@/lib/server/limiters';
import { meFor } from '@/lib/server/session';
import { claimPairing, isPairingCode, isVerifier, normalizeCode } from '@/lib/server/stores';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';

/**
 * POST /api/ext/pair/claim { code, verifier } from an extension. 202 while the user hasn't approved yet; once
 * approved, a session of the extension's own (revocable on /account) and the account summary. A code is claimed
 * once; a wrong verifier, an expired or a used code are all 410.
 */
export async function POST(request: Request) {
  const auth = getAuth();
  if (!accountsConfigured() || !auth) return accountError(request, 'Accounts are not available yet.', 503);
  if (!isExtensionOrigin(request.headers.get('origin'))) return accountError(request, 'Forbidden', 403);
  const wait = limited('pairClaim', request.headers);
  if (wait) return accountError(request, 'Too many requests.', 429, { 'retry-after': String(wait) });
  const body = await readJson<{ code?: unknown; verifier?: unknown }>(request);
  const code = typeof body?.code === 'string' ? normalizeCode(body.code) : '';
  if (!isPairingCode(code) || !isVerifier(body?.verifier)) return accountError(request, 'Bad request', 400);
  const result = await claimPairing(code, body.verifier);
  if (result === 'pending') return accountJson(request, { pending: true }, 202);
  if (!result) return accountError(request, 'This sign-in expired. Start again.', 410);
  const [user] = await getDb().select().from(schema.user).where(eq(schema.user.id, result)).limit(1);
  if (!user) return accountError(request, 'This sign-in expired. Start again.', 410);
  const ctx = await auth.$context;
  let session: { token: string; expiresAt: Date };
  try {
    session = await ctx.internalAdapter.createSession(user.id, false, { userAgent: `${EXTENSION_SESSION_AGENT} (${(request.headers.get('user-agent') ?? '').slice(0, 160)})` });
  } catch {
    // The session hook refuses suspended accounts (lib/server/auth.ts).
    return accountError(request, "This account can't sign in right now.", 403);
  }
  return accountJson(request, { token: session.token, expiresAt: session.expiresAt.toISOString(), me: await meFor(user) });
}

export const OPTIONS = accountOptions;
