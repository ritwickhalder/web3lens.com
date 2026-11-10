/**
 * Optional Web3Lens account in the extension, without new permissions, externally_connectable or content scripts:
 *
 * 1. The extension makes a random verifier and sends only its SHA-256 to /api/ext/pair/start, which returns a code.
 * 2. It opens web3lens.com/extension/connect?code=… in a tab; the user signs in with Google and approves the code.
 * 3. The extension claims the approved code with the verifier (/api/ext/pair/claim) and receives a session token of
 *    its own, revocable from web3lens.com/account.
 *
 * The token stays in storage.local under `account` (the extension has no content scripts, so no web page can read
 * it) and is sent only to the fixed Web3Lens origin, never to a self-hosted apiBase. The plan shown here is a cached
 * copy of /api/me for display; the server enforces every limit. Everything else in the extension works signed out
 * and offline, exactly as before.
 */
import { limitsFor, PRE_LAUNCH_LIMITS, type Limits, type MeResponse, type Plan } from '@/lib/entitlements';
import type { MultichainResult } from '@/lib/lookup-types';
import { ext, isFirefox, openTab } from './browser';

export const ACCOUNT_ORIGIN = 'https://web3lens.com';
/** Refresh the cached plan when it's older than this. */
export const REFRESH_MS = 12 * 3600_000;
/** Offline grace: a cached Pro plan older than this shows as Free until web3lens.com answers again. */
export const OFFLINE_GRACE_MS = 7 * 24 * 3600_000;

export type CachedMe = Pick<MeResponse, 'plan' | 'tier' | 'until' | 'renews' | 'billing'> & { email: string };

export type AccountRecord = {
  token: string | null;
  me: CachedMe | null;
  refreshedAt: number;
  pending: { code: string; verifier: string; expiresAt: number } | null;
};

export const EMPTY_ACCOUNT: AccountRecord = { token: null, me: null, refreshedAt: 0, pending: null };

const PLANS: readonly Plan[] = ['free', 'pro', 'lifetime'];
const CODE = /^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/;

/** storage.local is untrusted input like everything else: keep only well-formed fields. */
export function sanitizeAccount(raw: unknown): AccountRecord {
  const r = (raw ?? {}) as Partial<AccountRecord>;
  const token = typeof r.token === 'string' && /^[A-Za-z0-9._%-]{16,512}$/.test(r.token) ? r.token : null;
  const m = r.me as Partial<CachedMe> | null | undefined;
  const me: CachedMe | null =
    token && m && typeof m.email === 'string' && PLANS.includes(m.plan as Plan)
      ? { email: m.email.slice(0, 200), plan: m.plan as Plan, tier: m.plan === 'free' ? 'free' : 'pro', until: typeof m.until === 'string' ? m.until : null, renews: m.renews === true, billing: m.billing === true }
      : null;
  const p = r.pending;
  const pending =
    p && typeof p.code === 'string' && CODE.test(p.code) && typeof p.verifier === 'string' && /^[A-Za-z0-9_-]{43,128}$/.test(p.verifier) && typeof p.expiresAt === 'number' ? { code: p.code, verifier: p.verifier, expiresAt: p.expiresAt } : null;
  return { token, me, refreshedAt: typeof r.refreshedAt === 'number' && token ? r.refreshedAt : 0, pending };
}

export async function loadAccount(): Promise<AccountRecord> {
  const raw = await ext.storage.local.get(['account']);
  return sanitizeAccount(raw.account);
}

async function saveAccount(a: AccountRecord) {
  await ext.storage.local.set({ account: sanitizeAccount(a) });
}

const toCached = (me: MeResponse): CachedMe => ({ email: me.user.email, plan: me.plan, tier: me.tier, until: me.until, renews: me.renews, billing: me.billing });

/** The plan to show: the cached one, or Free when it is too old to trust (offline grace over) or has ended. */
export function displayPlan(a: AccountRecord, now = Date.now()): Plan | null {
  if (!a.token || !a.me) return null;
  if (now - a.refreshedAt > OFFLINE_GRACE_MS) return 'free';
  if (a.me.plan === 'pro' && a.me.until && Date.parse(a.me.until) <= now) return 'free';
  return a.me.plan;
}

/**
 * Limits to apply in the extension's UI. The server enforces the ones that matter (balances, cloud, API); these
 * shape the batch box and the local saved-items cap. Before Pro is on sale (or when unknown, signed out) everyone
 * keeps the pre-Pro limits.
 */
export function extLimits(a: AccountRecord, now = Date.now()): Limits {
  const plan = displayPlan(a, now);
  if (!plan || !a.me?.billing) return plan && plan !== 'free' ? limitsFor(plan) : PRE_LAUNCH_LIMITS;
  return limitsFor(plan);
}

export type BalancesAnswer =
  | { ok: true; results: { address: string; result: MultichainResult | null; error: string | null }[]; usage: { used: number; limit: number } | null }
  | { ok: false; status: number; usage: { used: number; limit: number } | null };

/** Batch balances through the server, which enforces rows per batch and the daily quota (bearer when signed in). */
export async function batchBalances(addresses: string[]): Promise<BalancesAnswer> {
  const a = await loadAccount();
  const res = await call('/api/batch/balances', { method: 'POST', token: a.token, body: JSON.stringify({ addresses }) }).catch(() => null);
  if (!res) return { ok: false, status: 0, usage: null };
  const body = (await res.json().catch(() => null)) as { results?: unknown; usage?: { used: number; limit: number } | null } | null;
  const usage = body?.usage && typeof body.usage.used === 'number' && typeof body.usage.limit === 'number' ? { used: body.usage.used, limit: body.usage.limit } : null;
  if (!res.ok || !Array.isArray(body?.results)) return { ok: false, status: res.status, usage };
  return { ok: true, results: body.results as BalancesAnswer extends { results: infer R } ? R : never, usage };
}

/** Authenticated call for sync (bearer only; signed out = null). */
export async function authedCall(path: string, init: RequestInit = {}): Promise<Response | null> {
  const a = await loadAccount();
  if (!a.token) return null;
  return call(path, { ...init, token: a.token }).catch(() => null);
}

function browserName(): 'chrome' | 'edge' | 'firefox' {
  if (isFirefox) return 'firefox';
  return /\bEdg\//.test(navigator.userAgent) ? 'edge' : 'chrome';
}

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const sha256Hex = async (s: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('');

async function call(path: string, init: RequestInit & { token?: string | null } = {}): Promise<Response> {
  const headers: Record<string, string> = { accept: 'application/json' };
  if (init.body) headers['content-type'] = 'application/json';
  if (init.token) headers.authorization = `Bearer ${init.token}`;
  return fetch(`${ACCOUNT_ORIGIN}${path}`, { ...init, headers, credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(20_000) });
}

export class AccountError extends Error {}

/** Step 1 and 2: get a code and open the approval page. */
export async function startSignIn(): Promise<string> {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const res = await call('/api/ext/pair/start', { method: 'POST', body: JSON.stringify({ verifierHash: await sha256Hex(verifier), browser: browserName() }) }).catch(() => null);
  const body = (await res?.json().catch(() => null)) as { code?: string; expiresIn?: number; error?: string } | null;
  if (!res?.ok || !body?.code || !CODE.test(body.code)) throw new AccountError(body?.error ?? '');
  const a = await loadAccount();
  await saveAccount({ ...a, pending: { code: body.code, verifier, expiresAt: Date.now() + (body.expiresIn ?? 600) * 1000 } });
  await openApproval(body.code);
  return body.code;
}

export const openApproval = (code: string) => openTab(`${ACCOUNT_ORIGIN}/extension/connect?code=${encodeURIComponent(code)}`);

export async function cancelSignIn() {
  await saveAccount({ ...(await loadAccount()), pending: null });
}

/** Step 3: claim once approved. "pending" until then; "done" when signed in; "failed" when the code is gone. */
export async function claimSignIn(now = Date.now()): Promise<'none' | 'pending' | 'done' | 'failed' | 'offline'> {
  const a = await loadAccount();
  if (!a.pending) return 'none';
  if (a.pending.expiresAt <= now) {
    await saveAccount({ ...a, pending: null });
    return 'failed';
  }
  const res = await call('/api/ext/pair/claim', { method: 'POST', body: JSON.stringify({ code: a.pending.code, verifier: a.pending.verifier }) }).catch(() => null);
  if (!res) return 'offline';
  if (res.status === 202) return 'pending';
  const body = (await res.json().catch(() => null)) as { token?: string; me?: MeResponse } | null;
  if (res.ok && body?.token && body.me) {
    await saveAccount({ token: body.token, me: toCached(body.me), refreshedAt: Date.now(), pending: null });
    return 'done';
  }
  if (res.status >= 500 || res.status === 429) return 'offline';
  await saveAccount({ ...a, pending: null });
  return 'failed';
}

/**
 * Refresh the cached plan from /api/me. A 401 means the session ended (expired, revoked on /account, account
 * deleted): sign out locally. Network errors keep the cached copy (offline grace).
 */
export async function refreshAccount(force = false, now = Date.now()): Promise<'signedOut' | 'fresh' | 'cached' | 'offline' | 'expired'> {
  const a = await loadAccount();
  if (!a.token) return 'signedOut';
  if (!force && now - a.refreshedAt < REFRESH_MS) return 'cached';
  const res = await call('/api/me', { token: a.token }).catch(() => null);
  if (!res || res.status >= 500 || res.status === 429) return 'offline';
  if (res.status === 401) {
    await saveAccount({ ...EMPTY_ACCOUNT, pending: a.pending });
    return 'expired';
  }
  const me = (await res.json().catch(() => null)) as MeResponse | null;
  if (!res.ok || !me?.signedIn) return 'offline';
  await saveAccount({ ...a, me: toCached(me), refreshedAt: now });
  return 'fresh';
}

/** Sign out: end the session on the server (best effort) and forget the token locally either way. */
export async function signOut() {
  const a = await loadAccount();
  if (a.token) await call('/api/ext/sign-out', { method: 'POST', token: a.token }).catch(() => null);
  await saveAccount(EMPTY_ACCOUNT);
}
