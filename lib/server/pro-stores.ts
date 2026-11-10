/**
 * Database access for Pro data: synced saved items, collections, investigations and API keys. Every function takes
 * the owner's user id from the session (lib/server/gate.ts) and every query filters by it, so one user can never read
 * or change another's rows. Caps are part of the statements that write.
 */
import { createHash, randomBytes } from 'node:crypto';
import { and, count, desc, eq, gt, inArray, isNull, sql } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import { sanitizeInvestigation, type Investigation } from '@/lib/investigation';
import type { CloudItem } from '@/lib/saved-sync';

export const CAPS = { savedCloud: 2000, collections: 20, collectionItems: 2000, investigations: 100, apiKeys: 5 } as const;

const rowsOf = <T>(r: unknown): T[] => ((r as { rows?: T[] }).rows ?? (r as T[])) as T[];

/* ---- Saved items sync ---- */

export async function pullSaved(userId: string, since: Date | null): Promise<{ items: CloudItem[]; cursor: string | null }> {
  const s = schema.savedItems;
  const rows = await getDb()
    .select()
    .from(s)
    .where(since ? and(eq(s.userId, userId), gt(s.syncedAt, since)) : eq(s.userId, userId))
    .orderBy(s.syncedAt)
    .limit(5000);
  const items = rows.map((r) => ({
    key: r.itemKey,
    query: r.query,
    chainId: r.chainId,
    label: r.label,
    note: r.note,
    favourite: r.favourite,
    addedAt: r.addedAt.getTime(),
    updatedAt: r.updatedAt.getTime(),
    deletedAt: r.deletedAt?.getTime() ?? null,
  }));
  const last = rows.at(-1)?.syncedAt;
  return { items, cursor: last ? last.toISOString() : (since?.toISOString() ?? null) };
}

/**
 * Upserts a batch in one statement. Per item the newest change wins (`updated_at`, or `deleted_at` for a deletion).
 * New live items are accepted only while the user is under the cloud cap; edits and deletions of known items always
 * apply. Returns how many rows were written and how many new items were refused by the cap.
 */
export async function pushSaved(userId: string, items: CloudItem[], cap: number = CAPS.savedCloud): Promise<{ written: number; refused: number }> {
  if (!items.length) return { written: 0, refused: 0 };
  const input = JSON.stringify(
    items.map((i) => ({
      item_key: i.key,
      query: i.query,
      chain_id: i.chainId,
      label: i.label,
      note: i.note,
      favourite: i.favourite,
      added_at: new Date(i.addedAt).toISOString(),
      updated_at: new Date(i.deletedAt ?? i.updatedAt).toISOString(),
      deleted_at: i.deletedAt ? new Date(i.deletedAt).toISOString() : null,
    })),
  );
  const result = await getDb().execute(sql`
    with input as (
      select * from jsonb_to_recordset(${input}::jsonb) as x(item_key text, query text, chain_id text, label text, note text,
        favourite boolean, added_at timestamptz, updated_at timestamptz, deleted_at timestamptz)
    ),
    known as (select item_key from saved_items where user_id = ${userId}),
    live as (select count(*)::int as n from saved_items where user_id = ${userId} and deleted_at is null),
    fresh as (
      select i.*, row_number() over (order by i.updated_at desc) as rn
      from input i where i.deleted_at is null and i.item_key not in (select item_key from known)
    ),
    accepted as (
      select i.* from input i where i.item_key in (select item_key from known)
      union all
      select f.item_key, f.query, f.chain_id, f.label, f.note, f.favourite, f.added_at, f.updated_at, f.deleted_at
      from fresh f, live where f.rn <= greatest(0, ${cap} - live.n)
    ),
    written as (
      insert into saved_items (user_id, item_key, query, chain_id, label, note, favourite, added_at, updated_at, deleted_at, synced_at)
      select ${userId}, item_key, query, chain_id, label, note, favourite, added_at, updated_at, deleted_at, now() from accepted
      on conflict (user_id, item_key) do update set
        query = excluded.query, chain_id = excluded.chain_id, label = excluded.label, note = excluded.note,
        favourite = excluded.favourite, updated_at = excluded.updated_at, deleted_at = excluded.deleted_at, synced_at = now()
      where saved_items.updated_at < excluded.updated_at
      returning 1
    )
    select (select count(*)::int from written) as written,
           (select count(*)::int from fresh, live where fresh.rn > greatest(0, ${cap} - live.n)) as refused
  `);
  const [row] = rowsOf<{ written: number; refused: number }>(result);
  return { written: Number(row?.written ?? 0), refused: Number(row?.refused ?? 0) };
}

export async function cloudSavedCount(userId: string): Promise<number> {
  const s = schema.savedItems;
  const [r] = await getDb().select({ n: count() }).from(s).where(and(eq(s.userId, userId), isNull(s.deletedAt)));
  return Number(r?.n ?? 0);
}

/* ---- Collections ---- */

export type CollectionOut = { id: string; name: string; itemKeys: string[]; updatedAt: string };

export async function listCollections(userId: string): Promise<CollectionOut[]> {
  const c = schema.collections;
  const ci = schema.collectionItems;
  const cols = await getDb().select().from(c).where(eq(c.userId, userId)).orderBy(c.name);
  if (!cols.length) return [];
  const items = await getDb()
    .select({ collectionId: ci.collectionId, itemKey: ci.itemKey })
    .from(ci)
    .where(inArray(ci.collectionId, cols.map((x) => x.id)));
  return cols.map((x) => ({ id: x.id, name: x.name, updatedAt: x.updatedAt.toISOString(), itemKeys: items.filter((i) => i.collectionId === x.id).map((i) => i.itemKey) }));
}

export const cleanName = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

/** Creates a collection while the user has fewer than the cap. null = cap reached; 'exists' = same name taken. */
export async function createCollection(userId: string, name: string): Promise<{ id: string } | null | 'exists'> {
  const result = await getDb().execute(sql`
    insert into collections (user_id, name)
    select ${userId}, ${name}
    where (select count(*) from collections where user_id = ${userId}) < ${CAPS.collections}
    on conflict do nothing
    returning id
  `);
  const [row] = rowsOf<{ id: string }>(result);
  if (row) return { id: row.id };
  const c = schema.collections;
  const [taken] = await getDb().select({ id: c.id }).from(c).where(and(eq(c.userId, userId), sql`lower(${c.name}) = lower(${name})`)).limit(1);
  return taken ? 'exists' : null;
}

/** Owned collection or nothing: every change below starts here, so a foreign id is a 404. */
async function owned(userId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const c = schema.collections;
  const [row] = await getDb().select().from(c).where(and(eq(c.id, id), eq(c.userId, userId))).limit(1);
  return row ?? null;
}

export async function updateCollection(userId: string, id: string, change: { name?: string; add?: string[]; remove?: string[] }): Promise<boolean | 'exists' | 'full'> {
  const col = await owned(userId, id);
  if (!col) return false;
  const db = getDb();
  const c = schema.collections;
  const ci = schema.collectionItems;
  if (change.name) {
    try {
      await db.update(c).set({ name: change.name, updatedAt: new Date() }).where(and(eq(c.id, id), eq(c.userId, userId)));
    } catch {
      return 'exists';
    }
  }
  if (change.remove?.length) await db.delete(ci).where(and(eq(ci.collectionId, id), inArray(ci.itemKey, change.remove)));
  if (change.add?.length) {
    const keys = JSON.stringify(change.add);
    const result = await db.execute(sql`
      insert into collection_items (collection_id, item_key)
      select ${id}::uuid, k from jsonb_array_elements_text(${keys}::jsonb) as k
      where (select count(*) from collection_items where collection_id = ${id}::uuid) < ${CAPS.collectionItems}
      on conflict do nothing
      returning 1
    `);
    if (!rowsOf(result).length && change.add.length) {
      const [n] = await db.select({ n: count() }).from(ci).where(eq(ci.collectionId, id));
      if (Number(n?.n ?? 0) >= CAPS.collectionItems) return 'full';
    }
  }
  await db.update(c).set({ updatedAt: new Date() }).where(and(eq(c.id, id), eq(c.userId, userId)));
  return true;
}

export async function deleteCollection(userId: string, id: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return false;
  const c = schema.collections;
  const gone = await getDb().delete(c).where(and(eq(c.id, id), eq(c.userId, userId))).returning({ id: c.id });
  return gone.length > 0;
}

/* ---- Investigations ---- */

export type InvestigationSummary = { id: string; title: string; items: number; updatedAt: string };

export async function listInvestigations(userId: string): Promise<InvestigationSummary[]> {
  const t = schema.investigations;
  const rows = await getDb().select().from(t).where(eq(t.userId, userId)).orderBy(desc(t.updatedAt)).limit(CAPS.investigations);
  return rows.map((r) => ({ id: r.id, title: r.title, items: (r.body as Investigation).items?.length ?? 0, updatedAt: r.updatedAt.toISOString() }));
}

export async function getInvestigation(userId: string, id: string): Promise<{ id: string; investigation: Investigation; updatedAt: string } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const t = schema.investigations;
  const [r] = await getDb().select().from(t).where(and(eq(t.id, id), eq(t.userId, userId))).limit(1);
  const inv = r ? sanitizeInvestigation(r.body) : null;
  return r && inv ? { id: r.id, investigation: inv, updatedAt: r.updatedAt.toISOString() } : null;
}

/** Saves a sanitised investigation while the user is under the cap. null = cap reached. */
export async function createInvestigation(userId: string, inv: Investigation): Promise<{ id: string } | null> {
  const body = JSON.stringify(inv);
  const result = await getDb().execute(sql`
    insert into investigations (user_id, title, body)
    select ${userId}, ${inv.t ?? ''}, ${body}::jsonb
    where (select count(*) from investigations where user_id = ${userId}) < ${CAPS.investigations}
    returning id
  `);
  const [row] = rowsOf<{ id: string }>(result);
  return row ? { id: row.id } : null;
}

export async function updateInvestigation(userId: string, id: string, inv: Investigation): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return false;
  const t = schema.investigations;
  const rows = await getDb()
    .update(t)
    .set({ title: inv.t ?? '', body: inv, updatedAt: new Date() })
    .where(and(eq(t.id, id), eq(t.userId, userId)))
    .returning({ id: t.id });
  return rows.length > 0;
}

export async function deleteInvestigation(userId: string, id: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return false;
  const t = schema.investigations;
  const rows = await getDb().delete(t).where(and(eq(t.id, id), eq(t.userId, userId))).returning({ id: t.id });
  return rows.length > 0;
}

/* ---- API keys ---- */

const BASE62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const randomBase62 = (n: number) => [...randomBytes(n * 2)].filter((b) => b < 248).slice(0, n).map((b) => BASE62[b % 62]).join('');
export const hashKey = (key: string) => createHash('sha256').update(key).digest('hex');
export const API_KEY_FORMAT = /^w3l_[A-Za-z0-9]{8}_[A-Za-z0-9]{32}$/;

export type ApiKeyOut = { id: string; name: string; prefix: string; createdAt: string; lastUsedAt: string | null };

export async function listApiKeys(userId: string): Promise<ApiKeyOut[]> {
  const k = schema.apiKeys;
  const rows = await getDb()
    .select({ id: k.id, name: k.name, prefix: k.prefix, createdAt: k.createdAt, lastUsedAt: k.lastUsedAt })
    .from(k)
    .where(and(eq(k.userId, userId), isNull(k.revokedAt)))
    .orderBy(desc(k.createdAt));
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), lastUsedAt: r.lastUsedAt?.toISOString() ?? null }));
}

/** Creates a key (returned once, stored hashed) while the user has fewer than 5 active keys. null = cap. */
export async function createApiKey(userId: string, name: string): Promise<{ key: string; id: string; prefix: string } | null> {
  let prefix = randomBase62(8);
  let key = `w3l_${prefix}_${randomBase62(32)}`;
  // Collisions are astronomically unlikely; regenerate if the length filter ever came up short.
  while (!API_KEY_FORMAT.test(key)) {
    prefix = randomBase62(8);
    key = `w3l_${prefix}_${randomBase62(32)}`;
  }
  const result = await getDb().execute(sql`
    insert into api_keys (user_id, name, prefix, key_hash)
    select ${userId}, ${name}, ${prefix}, ${hashKey(key)}
    where (select count(*) from api_keys where user_id = ${userId} and revoked_at is null) < ${CAPS.apiKeys}
    returning id
  `);
  const [row] = rowsOf<{ id: string }>(result);
  return row ? { key, id: row.id, prefix } : null;
}

export async function revokeApiKey(userId: string, id: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return false;
  const k = schema.apiKeys;
  const rows = await getDb()
    .update(k)
    .set({ revokedAt: new Date() })
    .where(and(eq(k.id, id), eq(k.userId, userId), isNull(k.revokedAt)))
    .returning({ id: k.id });
  return rows.length > 0;
}

/** The live key for a presented secret, with its owner. Revocation is checked on every call (never cached). */
export async function findApiKey(key: string): Promise<{ id: string; user: { id: string; email: string; name: string } } | null> {
  if (!API_KEY_FORMAT.test(key)) return null;
  const k = schema.apiKeys;
  const u = schema.user;
  const [row] = await getDb()
    .select({ id: k.id, userId: u.id, email: u.email, name: u.name })
    .from(k)
    .innerJoin(u, eq(u.id, k.userId))
    .where(and(eq(k.keyHash, hashKey(key)), isNull(k.revokedAt)))
    .limit(1);
  return row ? { id: row.id, user: { id: row.userId, email: row.email, name: row.name } } : null;
}

export async function touchApiKey(id: string) {
  const k = schema.apiKeys;
  await getDb().update(k).set({ lastUsedAt: new Date() }).where(eq(k.id, id));
}
