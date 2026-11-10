import { accountJson, accountOptions } from '@/lib/server/account-http';
import { accountsConfigured, billingConfigured } from '@/lib/server/env';
import { currentUser, meFor } from '@/lib/server/session';

/**
 * GET /api/me: the signed-in user's plan, limits and usage, resolved on the server from the database. The website
 * calls it with its cookie, the extensions with their bearer token. A bearer token that no longer works is a 401
 * (the extension signs out locally); a website visitor without a session gets `{ signedIn: false }`.
 */
export async function GET(request: Request) {
  if (!accountsConfigured()) return accountJson(request, { signedIn: false, accounts: false });
  const who = await currentUser(request.headers);
  if (!who) {
    if (request.headers.get('authorization')) return accountJson(request, { error: 'Session expired. Sign in again.' }, 401);
    return accountJson(request, { signedIn: false, accounts: true, billing: billingConfigured() });
  }
  return accountJson(request, { ...(await meFor(who.user)), accounts: true });
}

export const OPTIONS = accountOptions;
