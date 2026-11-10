import { accountError, accountJson, accountOptions, isExtensionOrigin, isSameOrigin, readJson } from '@/lib/server/account-http';
import { balancesFor } from '@/lib/server/batch-balances';
import { isCrawler } from '@/lib/server/bots';
import { accountsConfigured, billingConfigured } from '@/lib/server/env';
import { anonSubject, caller } from '@/lib/server/gate';
import { clientIp, lookupBudget } from '@/lib/server/rate-limit';
import { effectiveLimits, userSubject } from '@/lib/server/session';
import { consumeQuota, nextDay, usageOf } from '@/lib/server/stores';
import { checkEvmAddress } from '@/lib/validate-query';

export const maxDuration = 60;

/**
 * POST /api/batch/balances { addresses: ["0x…", …] }: multi-chain native balances for a batch. Enforced here, not
 * in the UI: rows per request (Free 5, Pro 500) and cross-chain lookups per UTC day (Free 10, Pro 500), taken all or
 * nothing before any provider call. Anonymous callers count against the Free limits per hashed IP (when the database
 * is configured), so signing in never gives less than staying signed out. The website (same origin) and the
 * extensions may call it.
 */
export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (!isSameOrigin(request) && !isExtensionOrigin(origin)) return accountError(request, 'Forbidden', 403);
  if (isCrawler(request.headers.get('user-agent'))) return accountError(request, 'Automated crawlers cannot use this.', 403);
  const body = await readJson<{ addresses?: unknown }>(request, 64_000);
  if (!Array.isArray(body?.addresses) || !body.addresses.length) return accountError(request, 'Send a list of addresses.', 400);
  const addresses: string[] = [];
  for (const a of body.addresses) {
    const check = checkEvmAddress(typeof a === 'string' ? a : '');
    if (!check.ok) return accountError(request, `Not an EVM address: ${String(a).slice(0, 80)}`, 400);
    if (!addresses.includes(check.query)) addresses.push(check.query);
  }

  const who = await caller(request).catch(() => null);
  const limits = who?.limits ?? effectiveLimits(null);
  if (addresses.length > limits.batchBalances) {
    return accountError(request, `Your plan checks balances for up to ${limits.batchBalances} addresses per batch.`, 413, { 'x-upgrade': who?.plan === 'free' || !who ? '1' : '0' });
  }

  const now = new Date();
  let usage: { used: number; limit: number; resetsAt: string } | null = null;
  // Daily metering starts with Pro (billing configured); before that, the per-IP budget below is the limit.
  if (accountsConfigured() && billingConfigured()) {
    const subject = who ? userSubject(who.user.id) : anonSubject(request.headers);
    const used = await consumeQuota(subject, 'crossChain', addresses.length, limits.crossChainPerDay, now);
    if (used === null) {
      const current = await usageOf(subject, 'crossChain', now);
      return accountJson(
        request,
        { error: `Daily cross-chain lookups used: ${current} of ${limits.crossChainPerDay}. They reset at 00:00 UTC.`, upgrade: !who || who.plan === 'free', usage: { used: current, limit: limits.crossChainPerDay, resetsAt: nextDay(now).toISOString() } },
        429,
        { 'retry-after': String(Math.ceil((nextDay(now).getTime() - now.getTime()) / 1000)) },
      );
    }
    usage = { used, limit: limits.crossChainPerDay, resetsAt: nextDay(now).toISOString() };
  }
  if (!who || !billingConfigured()) {
    // Without an account (or before Pro launches), each address also counts against the shared per-IP lookup budget.
    for (let i = 0; i < addresses.length; i++) {
      const r = lookupBudget(clientIp(request.headers));
      if (!r.ok) return accountError(request, 'Too many requests. Please wait a moment.', 429, { 'retry-after': String(r.retryAfter) });
    }
  }
  return accountJson(request, { results: await balancesFor(addresses), usage, plan: who?.plan ?? null });
}

export const OPTIONS = accountOptions;
