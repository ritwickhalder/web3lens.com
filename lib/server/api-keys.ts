/**
 * API keys on /api/v1 (Pro): `x-api-key: w3l_…`. A keyed request skips the shared per-IP budget and counts against
 * the owner's daily API quota (1,000 per user per UTC day, across all their keys). Revocation is checked on every
 * request; the owner's plan is cached for 60 s, so a downgrade stops the key within a minute.
 */
import { canUse, limitsFor, type Plan } from '@/lib/entitlements';
import { accountsConfigured } from '@/lib/server/env';
import { findApiKey, touchApiKey } from '@/lib/server/pro-stores';
import { planOf, userSubject } from '@/lib/server/session';
import { consumeQuota, nextDay } from '@/lib/server/stores';

const PLAN_TTL_MS = 60_000;
const plans = new Map<string, { plan: Plan; at: number }>();
const touched = new Map<string, number>();

export type KeyCheck =
  | { ok: true; headers: Record<string, string> }
  | { ok: false; status: number; error: string; headers: Record<string, string> };

export function clearApiKeyCache() {
  plans.clear();
  touched.clear();
}

export async function checkApiKey(key: string, now = new Date()): Promise<KeyCheck> {
  if (!accountsConfigured()) return { ok: false, status: 401, error: 'API keys are not available yet.', headers: {} };
  const found = await findApiKey(key.trim());
  if (!found) return { ok: false, status: 401, error: 'Invalid or revoked API key.', headers: {} };
  let cached = plans.get(found.id);
  if (!cached || now.getTime() - cached.at > PLAN_TTL_MS) {
    cached = { plan: (await planOf(found.user, now)).plan, at: now.getTime() };
    plans.set(found.id, cached);
  }
  if (!canUse('apiKeys', cached.plan)) return { ok: false, status: 402, error: 'API keys need Web3Lens Pro. This key works again once Pro is active.', headers: {} };
  const limit = limitsFor(cached.plan).apiPerDay;
  const reset = String(Math.floor(nextDay(now).getTime() / 1000));
  const used = await consumeQuota(userSubject(found.user.id), 'api', 1, limit, now);
  if (used === null) {
    return {
      ok: false,
      status: 429,
      error: `Daily API limit reached (${limit} requests). It resets at 00:00 UTC.`,
      headers: { 'x-ratelimit-limit': String(limit), 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': reset, 'retry-after': String(Number(reset) - Math.floor(now.getTime() / 1000)) },
    };
  }
  if (now.getTime() - (touched.get(found.id) ?? 0) > 60_000) {
    touched.set(found.id, now.getTime());
    void touchApiKey(found.id).catch(() => {});
  }
  return { ok: true, headers: { 'x-ratelimit-limit': String(limit), 'x-ratelimit-remaining': String(Math.max(0, limit - used)), 'x-ratelimit-reset': reset } };
}
