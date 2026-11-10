/**
 * Who is calling and what they may do, for the account and Pro routes. The plan always comes from the database
 * (lib/server/session.ts), never from the request.
 */
import { createHash } from 'node:crypto';
import { canUse, type Feature, type Limits, type Plan } from '@/lib/entitlements';
import { accountError } from '@/lib/server/account-http';
import { accountsConfigured, serverEnv } from '@/lib/server/env';
import { clientIp } from '@/lib/server/rate-limit';
import { currentUser, effectiveLimits, planOf, type SessionUser } from '@/lib/server/session';

export type Caller = { user: SessionUser; plan: Plan; limits: Limits };

export async function caller(request: Request): Promise<Caller | null> {
  if (!accountsConfigured()) return null;
  const who = await currentUser(request.headers);
  if (!who) return null;
  const { plan } = await planOf(who.user);
  return { user: who.user, plan, limits: effectiveLimits(plan) };
}

/** A signed-in caller, or the error response to return. */
export async function requireUser(request: Request): Promise<Caller | Response> {
  if (!accountsConfigured()) return accountError(request, 'Accounts are not available yet.', 503);
  return (await caller(request)) ?? accountError(request, 'Sign in first.', 401);
}

/** A caller whose plan includes `feature`, or 401/402. 402 carries `upgrade: true` for the UI's upgrade note. */
export async function requireFeature(request: Request, feature: Feature): Promise<Caller | Response> {
  const c = await requireUser(request);
  if (c instanceof Response) return c;
  if (!canUse(feature, c.plan)) return accountError(request, 'This is a Pro feature.', 402, { 'x-upgrade': '1' });
  return c;
}

/** Anonymous quota subject: a salted hash of the IP, so raw addresses are never stored. */
export function anonSubject(headers: Headers): string {
  return `ip:${createHash('sha256').update(`${serverEnv.authSecret}|${clientIp(headers)}`).digest('hex').slice(0, 32)}`;
}
