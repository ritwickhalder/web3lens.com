/**
 * Database side of the watchlist and alerts. User-facing functions take the session's user id and filter by it; the
 * cron functions work across users but only check watches whose owner still has Pro (a downgrade pauses, never
 * deletes).
 */
import { and, desc, eq, inArray, isNull, lt, lte, sql } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import { canUse, limitsFor } from '@/lib/entitlements';
import { formatAmount } from '@/lib/format';
import { getNetwork } from '@/lib/networks';
import { formatUnits } from '@/lib/tools/units';
import { planOf } from '@/lib/server/session';
import { diffWatch, snapshotOf, watchableChain, type AlertKind } from '@/lib/server/watch';

const rowsOf = <T>(r: unknown): T[] => ((r as { rows?: T[] }).rows ?? (r as T[])) as T[];
const W = schema.watches;
const A = schema.alerts;

/** Check cadence: due again after this long (the cron runs on its own schedule; this spaces checks out). */
export const CHECK_EVERY_MS = 15 * 60_000;
/** After a provider error, retry sooner. */
const RETRY_MS = 5 * 60_000;
export const ALERT_RETENTION_MS = 90 * 24 * 3600_000;

export type WatchOut = {
  id: string;
  chainId: string;
  address: string;
  label: string;
  notifyEmail: boolean;
  lastCheckedAt: string | null;
  lastError: string | null;
  balance: string | null;
  createdAt: string;
};

const out = (r: typeof W.$inferSelect): WatchOut => {
  const net = getNetwork(r.chainId);
  const decimals = net?.family === 'utxo' ? 8 : 18;
  return {
    id: r.id,
    chainId: r.chainId,
    address: r.address,
    label: r.label,
    notifyEmail: r.notifyEmail,
    lastCheckedAt: r.lastCheckedAt?.toISOString() ?? null,
    lastError: r.lastError,
    balance: r.lastBalance !== null && net ? formatAmount(formatUnits(BigInt(r.lastBalance), decimals), net.symbol) : null,
    createdAt: r.createdAt.toISOString(),
  };
};

export async function listWatches(userId: string): Promise<WatchOut[]> {
  return (await getDb().select().from(W).where(eq(W.userId, userId)).orderBy(desc(W.createdAt))).map(out);
}

/** Adds a watch while under the cap. 'exists' = already watched; null = cap reached. */
export async function addWatch(userId: string, w: { chainId: string; address: string; label: string; notifyEmail: boolean }, cap: number): Promise<{ id: string } | 'exists' | null> {
  const result = await getDb().execute(sql`
    insert into watches (user_id, chain_id, address, label, notify_email)
    select ${userId}, ${w.chainId}, ${w.address}, ${w.label}, ${w.notifyEmail}
    where (select count(*) from watches where user_id = ${userId}) < ${cap}
    on conflict do nothing
    returning id
  `);
  const [row] = rowsOf<{ id: string }>(result);
  if (row) return { id: row.id };
  const [dup] = await getDb()
    .select({ id: W.id })
    .from(W)
    .where(and(eq(W.userId, userId), eq(W.chainId, w.chainId), sql`lower(${W.address}) = lower(${w.address})`))
    .limit(1);
  return dup ? 'exists' : null;
}

const isUuid = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

export async function updateWatch(userId: string, id: string, change: { label?: string; notifyEmail?: boolean }): Promise<boolean> {
  if (!isUuid(id)) return false;
  const set: Partial<typeof W.$inferInsert> = {};
  if (change.label !== undefined) set.label = change.label;
  if (change.notifyEmail !== undefined) set.notifyEmail = change.notifyEmail;
  if (!Object.keys(set).length) return true;
  const rows = await getDb().update(W).set(set).where(and(eq(W.id, id), eq(W.userId, userId))).returning({ id: W.id });
  return rows.length > 0;
}

export async function deleteWatch(userId: string, id: string): Promise<boolean> {
  if (!isUuid(id)) return false;
  const rows = await getDb().delete(W).where(and(eq(W.id, id), eq(W.userId, userId))).returning({ id: W.id });
  return rows.length > 0;
}

/** Signed unsubscribe link: turns email off for one watch (the token proves which). */
export async function unsubscribeWatch(id: string): Promise<boolean> {
  const rows = await getDb().update(W).set({ notifyEmail: false }).where(eq(W.id, id)).returning({ id: W.id });
  return rows.length > 0;
}

/* ---- Checking ---- */

export type CheckResult = { watchId: string; kind: AlertKind | null; error: string | null };

/** Checks one watch: fetch, compare, store the new state, and record an alert when something changed. */
export async function checkWatch(row: typeof W.$inferSelect, now = new Date()): Promise<CheckResult> {
  const family = watchableChain(row.chainId);
  const db = getDb();
  if (!family) {
    await db.update(W).set({ lastCheckedAt: now, lastError: 'Unsupported chain', nextCheckAt: new Date(now.getTime() + 24 * 3600_000) }).where(eq(W.id, row.id));
    return { watchId: row.id, kind: null, error: 'Unsupported chain' };
  }
  let snap;
  try {
    snap = await snapshotOf(row.chainId, row.address);
  } catch (e) {
    const error = (e instanceof Error ? e.message : 'Lookup failed').slice(0, 200);
    await db.update(W).set({ lastError: error, nextCheckAt: new Date(now.getTime() + RETRY_MS) }).where(eq(W.id, row.id));
    return { watchId: row.id, kind: null, error };
  }
  const kind = diffWatch(family, { count: row.lastCount, balance: row.lastBalance }, snap);
  // The state update is conditional on the state we compared against, so two overlapping runs can't both alert.
  const updated = await db
    .update(W)
    .set({ lastCount: snap.count, lastBalance: snap.balance, lastCheckedAt: now, lastError: null, nextCheckAt: new Date(now.getTime() + CHECK_EVERY_MS) })
    .where(
      and(
        eq(W.id, row.id),
        row.lastCount === null ? isNull(W.lastCount) : eq(W.lastCount, row.lastCount),
        row.lastBalance === null ? isNull(W.lastBalance) : eq(W.lastBalance, row.lastBalance),
      ),
    )
    .returning({ id: W.id });
  if (kind && updated.length) {
    await db.insert(A).values({
      userId: row.userId,
      watchId: row.id,
      kind,
      detail: { chainId: row.chainId, address: row.address, label: row.label, before: { count: row.lastCount, balance: row.lastBalance }, after: { count: snap.count, balance: snap.balance }, source: snap.source, fetchedAt: snap.fetchedAt },
      createdAt: now,
    });
  }
  return { watchId: row.id, kind: updated.length ? kind : null, error: null };
}

async function isPro(userId: string, email: string, cache: Map<string, boolean>, now: Date): Promise<boolean> {
  const hit = cache.get(userId);
  if (hit !== undefined) return hit;
  const pro = canUse('watchlist', (await planOf({ id: userId, email, name: '' }, now)).plan);
  cache.set(userId, pro);
  return pro;
}

/**
 * Checks due watches (oldest first) whose owners have Pro, with a few workers and a time budget, so one cron run
 * never overruns its function limit. Watches of non-Pro owners are pushed back a day, not deleted.
 */
export async function runDueChecks({ limit = 300, workers = 6, budgetMs = 45_000, userId, now = new Date() }: { limit?: number; workers?: number; budgetMs?: number; userId?: string; now?: Date } = {}) {
  const db = getDb();
  const due = await db
    .select({ w: W, email: schema.user.email })
    .from(W)
    .innerJoin(schema.user, eq(schema.user.id, W.userId))
    .where(userId ? eq(W.userId, userId) : lte(W.nextCheckAt, now))
    .orderBy(W.nextCheckAt)
    .limit(limit);
  const start = Date.now();
  const plans = new Map<string, boolean>();
  const results: CheckResult[] = [];
  let skipped = 0;
  let next = 0;
  const run = async () => {
    while (next < due.length && Date.now() - start < budgetMs) {
      const { w, email } = due[next++]!;
      if (!(await isPro(w.userId, email, plans, now))) {
        skipped++;
        await db.update(W).set({ nextCheckAt: new Date(now.getTime() + 24 * 3600_000) }).where(eq(W.id, w.id));
        continue;
      }
      results.push(await checkWatch(w, now));
    }
  };
  await Promise.all(Array.from({ length: Math.min(workers, Math.max(1, due.length)) }, run));
  return { checked: results.length, alerts: results.filter((r) => r.kind).length, errors: results.filter((r) => r.error).length, skipped };
}

/* ---- Alerts ---- */

export type AlertOut = { id: string; watchId: string; kind: AlertKind; chainId: string; address: string; label: string; summary: string; source: string; createdAt: string; read: boolean };

function summarize(kind: AlertKind, d: { chainId: string; before: { balance: string | null }; after: { balance: string } }): string {
  const net = getNetwork(d.chainId);
  if (!net || d.before.balance === null) return kind;
  const decimals = net.family === 'utxo' ? 8 : 18;
  const delta = BigInt(d.after.balance) - BigInt(d.before.balance);
  const moved = delta === BigInt(0) ? '' : ` (${delta > BigInt(0) ? '+' : '−'}${formatAmount(formatUnits(delta < BigInt(0) ? -delta : delta, decimals), net.symbol)})`;
  const what = kind === 'sent' ? 'Sent a transaction' : kind === 'received' ? 'Received funds' : 'Balance changed';
  return `${what} on ${net.name}${moved}; balance now ${formatAmount(formatUnits(BigInt(d.after.balance), decimals), net.symbol)}`;
}

const alertOut = (r: typeof A.$inferSelect): AlertOut => {
  const d = r.detail as { chainId: string; address: string; label: string; source: string; before: { balance: string | null }; after: { balance: string } };
  return { id: r.id, watchId: r.watchId, kind: r.kind, chainId: d.chainId, address: d.address, label: d.label, summary: summarize(r.kind, d), source: d.source, createdAt: r.createdAt.toISOString(), read: !!r.readAt };
};

export async function listAlerts(userId: string, limit = 100): Promise<{ alerts: AlertOut[]; unread: number }> {
  const db = getDb();
  const rows = await db.select().from(A).where(eq(A.userId, userId)).orderBy(desc(A.createdAt)).limit(limit);
  const [u] = rowsOf<{ n: number }>(await db.execute(sql`select count(*)::int as n from alerts where user_id = ${userId} and read_at is null`));
  return { alerts: rows.map(alertOut), unread: Number(u?.n ?? 0) };
}

export async function markAlertsRead(userId: string, ids: string[] | 'all', now = new Date()): Promise<number> {
  const db = getDb();
  const where = ids === 'all' ? and(eq(A.userId, userId), isNull(A.readAt)) : and(eq(A.userId, userId), inArray(A.id, ids.filter(isUuid)));
  if (ids !== 'all' && !ids.filter(isUuid).length) return 0;
  return (await db.update(A).set({ readAt: now }).where(where).returning({ id: A.id })).length;
}

export async function pruneAlerts(now = new Date()): Promise<number> {
  return (await getDb().delete(A).where(lt(A.createdAt, new Date(now.getTime() - ALERT_RETENTION_MS))).returning({ id: A.id })).length;
}

/** Alerts not yet emailed for watches that want email, grouped per user (only users who still have Pro). */
export async function pendingDigests(now = new Date()): Promise<{ user: { id: string; email: string; name: string }; alerts: (AlertOut & { watchId: string })[] }[]> {
  const db = getDb();
  const rows = await db
    .select({ a: A, email: schema.user.email, name: schema.user.name })
    .from(A)
    .innerJoin(W, eq(W.id, A.watchId))
    .innerJoin(schema.user, eq(schema.user.id, A.userId))
    .where(and(isNull(A.emailedAt), eq(W.notifyEmail, true), sql`${A.createdAt} > ${new Date(now.getTime() - 2 * 24 * 3600_000).toISOString()}::timestamptz`))
    .orderBy(A.createdAt)
    .limit(2000);
  const by = new Map<string, { user: { id: string; email: string; name: string }; alerts: (AlertOut & { watchId: string })[] }>();
  for (const r of rows) {
    const entry = by.get(r.a.userId) ?? { user: { id: r.a.userId, email: r.email, name: r.name }, alerts: [] };
    entry.alerts.push(alertOut(r.a));
    by.set(r.a.userId, entry);
  }
  const plans = new Map<string, boolean>();
  const outList = [];
  for (const e of by.values()) if (await isPro(e.user.id, e.user.email, plans, now)) outList.push(e);
  return outList;
}

export async function markEmailed(alertIds: string[], now = new Date()) {
  if (alertIds.length) await getDb().update(A).set({ emailedAt: now }).where(inArray(A.id, alertIds));
}

export const watchCap = (plan: Parameters<typeof limitsFor>[0]) => limitsFor(plan).watches;
