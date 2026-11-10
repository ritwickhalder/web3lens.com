/**
 * Saved addresses / transactions with labels and notes, kept in this browser (localStorage).
 * Exportable as JSON; the extensions keep the same shape in storage.local. Pro accounts also sync them
 * (lib/saved-sync.ts); the plan's cap (lib/entitlements.ts) applies only when adding a new item, so nothing a user
 * already has is ever hidden or trimmed.
 */
import { createLocalStore } from '@/lib/local-store';

export type SavedItem = {
  id: string;
  query: string;
  /** Chain id, or null when saved without one (e.g. from a batch search). */
  chainId: string | null;
  label: string;
  note: string;
  favourite: boolean;
  addedAt: number;
  /** Last edit (ms). Older data has none; it defaults to addedAt. Newest edit wins when syncing. */
  updatedAt: number;
};

/** Hard ceiling of what storage keeps (above every plan's cap, so the sanitiser never trims a user's items). */
export const MAX_SAVED = 5000;
/** Deletions remembered for sync, so a removal reaches the user's other devices. */
export type SavedTombstone = { id: string; deletedAt: number };
export const MAX_TOMBSTONES = 5000;
const EMPTY: SavedItem[] = [];

export function savedId(query: string, chainId: string | null): string {
  const q = query.trim();
  // 0x values and bech32 strings are case-insensitive; base58 isn't.
  const key = /^0x/i.test(q) || /^[a-z]+1[02-9ac-hj-np-z]+$/i.test(q) ? q.toLowerCase() : q;
  return `${chainId ?? '*'}:${key}`;
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

export function sanitizeSaved(raw: unknown): SavedItem[] {
  if (!Array.isArray(raw)) return EMPTY;
  const seen = new Set<string>();
  const out: SavedItem[] = [];
  for (const r of raw) {
    const query = str(r?.query, 200).trim();
    if (!query) continue;
    const chainId = typeof r?.chainId === 'string' && r.chainId ? r.chainId.slice(0, 60) : null;
    const id = savedId(query, chainId);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      query,
      chainId,
      label: str(r?.label, 80),
      note: str(r?.note, 1000),
      favourite: r?.favourite === true,
      addedAt: typeof r?.addedAt === 'number' ? r.addedAt : Date.now(),
      updatedAt: typeof r?.updatedAt === 'number' ? r.updatedAt : typeof r?.addedAt === 'number' ? r.addedAt : Date.now(),
    });
    if (out.length >= MAX_SAVED) break;
  }
  return out;
}

export const savedStore = createLocalStore<SavedItem[]>('w3l:saved', EMPTY, sanitizeSaved);

export function sanitizeTombstones(raw: unknown): SavedTombstone[] {
  if (!Array.isArray(raw)) return [];
  const out: SavedTombstone[] = [];
  for (const r of raw) if (typeof r?.id === 'string' && r.id.length <= 300 && typeof r?.deletedAt === 'number') out.push({ id: r.id, deletedAt: r.deletedAt });
  return out.slice(-MAX_TOMBSTONES);
}

export const tombstoneStore = createLocalStore<SavedTombstone[]>('w3l:saved-deleted', [], sanitizeTombstones);

/**
 * The cap for adding new items in this browser: Free 50, Pro 2,000 (lib/entitlements.ts). Set from the account
 * (lib/client/account.ts); signed out is Free, and 500 (the pre-Pro limit) until Pro is on sale.
 */
let savedCap = 500;
export function setSavedCap(cap: number) {
  savedCap = cap;
}
export const getSavedCap = () => savedCap;

export type UpsertResult = 'added' | 'updated' | 'limit';

/** Pure: apply an edit or addition. A new item over the cap is refused; existing items are always editable. */
export function applyUpsert(
  list: SavedItem[],
  item: { query: string; chainId: string | null; label?: string; note?: string; favourite?: boolean },
  cap: number,
  now = Date.now(),
): { list: SavedItem[]; result: UpsertResult } {
  const id = savedId(item.query, item.chainId);
  const existing = list.find((x) => x.id === id);
  if (!existing && list.length >= cap) return { list, result: 'limit' };
  const next: SavedItem = {
    id,
    query: item.query.trim(),
    chainId: item.chainId,
    label: (item.label ?? existing?.label ?? '').slice(0, 80),
    note: (item.note ?? existing?.note ?? '').slice(0, 1000),
    favourite: item.favourite ?? existing?.favourite ?? false,
    addedAt: existing?.addedAt ?? now,
    updatedAt: now,
  };
  return { list: [next, ...list.filter((x) => x.id !== id)], result: existing ? 'updated' : 'added' };
}

export function upsertSaved(item: { query: string; chainId: string | null; label?: string; note?: string; favourite?: boolean }): UpsertResult {
  let result = 'limit' as UpsertResult;
  savedStore.set((list) => {
    const r = applyUpsert(list, item, savedCap);
    result = r.result;
    return r.list;
  });
  if (result === 'added') tombstoneStore.set((t) => t.filter((x) => x.id !== savedId(item.query, item.chainId)));
  return result;
}

export function removeSaved(id: string) {
  savedStore.set((list) => list.filter((x) => x.id !== id));
  tombstoneStore.set((t) => [...t.filter((x) => x.id !== id), { id, deletedAt: Date.now() }]);
}

/** Removes everything (Settings → Delete saved items, behind a confirm); remembered as deletions for sync. */
export function clearSaved() {
  const now = Date.now();
  const ids = savedStore.getSnapshot().map((x) => x.id);
  savedStore.set([]);
  tombstoneStore.set((t) => [...t.filter((x) => !ids.includes(x.id)), ...ids.map((id) => ({ id, deletedAt: now }))]);
}

/**
 * Pure: merge imported items over existing ones (imported labels win). Only adds or updates; new items stop at the
 * cap and are counted in `skipped` (they stay in the file).
 */
export function mergeImport(list: SavedItem[], incoming: SavedItem[], cap: number, now = Date.now()): { list: SavedItem[]; imported: number; skipped: number } {
  const byId = new Map(list.map((x) => [x.id, x]));
  let room = Math.max(0, cap - list.length);
  let imported = 0;
  let skipped = 0;
  const added: SavedItem[] = [];
  for (const item of incoming) {
    const existing = byId.get(item.id);
    if (existing) {
      byId.set(item.id, { ...item, addedAt: existing.addedAt, updatedAt: now });
      imported++;
    } else if (room > 0) {
      added.push({ ...item, updatedAt: now });
      room--;
      imported++;
    } else skipped++;
  }
  return { list: [...added, ...list.map((x) => byId.get(x.id)!)], imported, skipped };
}

export function importSaved(json: string): { imported: number; skipped: number } {
  const parsed = JSON.parse(json);
  const incoming = sanitizeSaved(parsed?.items ?? parsed);
  let out = { imported: 0, skipped: 0 };
  savedStore.set((list) => {
    const r = mergeImport(list, incoming, savedCap);
    out = { imported: r.imported, skipped: r.skipped };
    return r.list;
  });
  return out;
}

export function exportSaved(list: SavedItem[]): string {
  return JSON.stringify({ app: 'web3lens', version: 1, exportedAt: new Date().toISOString(), items: list }, null, 2);
}

/** Label lookup for showing saved names next to addresses. */
export function labelFor(list: SavedItem[], query: string, chainId: string | null): SavedItem | undefined {
  return list.find((x) => x.id === savedId(query, chainId)) ?? list.find((x) => x.id === savedId(query, null));
}
