import { accountError, accountJson, accountOptions, isExtensionOrigin, readJson } from '@/lib/server/account-http';
import { accountsConfigured } from '@/lib/server/env';
import { limited } from '@/lib/server/limiters';
import { PAIRING_TTL_MS, startPairing } from '@/lib/server/stores';

/**
 * POST /api/ext/pair/start { verifierHash, browser } from an extension: returns a short code the user approves on
 * /extension/connect. Only the hash of the extension's secret verifier is sent, so the code alone (visible in the
 * URL and on screen) can't claim the session.
 */
export async function POST(request: Request) {
  if (!accountsConfigured()) return accountError(request, 'Accounts are not available yet.', 503);
  if (!isExtensionOrigin(request.headers.get('origin'))) return accountError(request, 'Forbidden', 403);
  const wait = limited('pairStart', request.headers);
  if (wait) return accountError(request, 'Too many sign-in attempts. Wait a few minutes.', 429, { 'retry-after': String(wait) });
  const body = await readJson<{ verifierHash?: unknown; browser?: unknown }>(request);
  const verifierHash = body?.verifierHash;
  if (typeof verifierHash !== 'string' || !/^[0-9a-f]{64}$/.test(verifierHash)) return accountError(request, 'Bad request', 400);
  const browser = typeof body?.browser === 'string' && ['chrome', 'edge', 'firefox'].includes(body.browser) ? body.browser : null;
  const code = await startPairing(verifierHash, browser);
  return accountJson(request, { code, expiresIn: PAIRING_TTL_MS / 1000 });
}

export const OPTIONS = accountOptions;
