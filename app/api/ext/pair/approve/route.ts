import { accountError, accountJson, isSameOrigin, readJson } from '@/lib/server/account-http';
import { accountsConfigured } from '@/lib/server/env';
import { limited } from '@/lib/server/limiters';
import { currentUser } from '@/lib/server/session';
import { approvePairing, isPairingCode, normalizeCode } from '@/lib/server/stores';

/** POST /api/ext/pair/approve { code }: the signed-in user approves the code their extension shows. Website only. */
export async function POST(request: Request) {
  if (!accountsConfigured()) return accountError(request, 'Accounts are not available yet.', 503);
  if (!isSameOrigin(request)) return accountError(request, 'Forbidden', 403);
  const wait = limited('accountWrite', request.headers);
  if (wait) return accountError(request, 'Too many requests.', 429, { 'retry-after': String(wait) });
  const who = await currentUser(request.headers);
  if (!who) return accountError(request, 'Sign in first.', 401);
  const body = await readJson<{ code?: unknown }>(request);
  const code = typeof body?.code === 'string' ? normalizeCode(body.code) : '';
  if (!isPairingCode(code)) return accountError(request, 'That code is not valid.', 400);
  if (!(await approvePairing(code, who.user.id))) {
    return accountError(request, 'That code has expired or was already used. Start again from the extension.', 410);
  }
  return accountJson(request, { ok: true });
}
