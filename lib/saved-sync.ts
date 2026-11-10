/**
 * Cloud sync of saved items (Pro), as a pure merge shared by the website and the extensions.
 *
 * Rules (USER DATA FIRST):
 * - Per item, the newest change wins: an edit (`updatedAt`) or a deletion the user made on one of their devices
 *   (`deletedAt`). On a tie the item is kept.
 * - Nothing else removes an item: a failed or offline sync, an empty server answer, a downgrade or a cap never
 *   deletes anything locally.
 * - The merge only reports what to push; callers push only after a successful pull.
 */
import { sanitizeSaved, type SavedItem, type SavedTombstone } from '@/lib/saved';

/** An item as the sync API sends and receives it. */
export type CloudItem = Omit<SavedItem, 'id'> & { key: string; deletedAt: number | null };

export const SYNC_BATCH = 500;

export function toCloud(item: SavedItem): CloudItem {
  return { key: item.id, query: item.query, chainId: item.chainId, label: item.label, note: item.note, favourite: item.favourite, addedAt: item.addedAt, updatedAt: item.updatedAt, deletedAt: null };
}

const stamp = (c: CloudItem) => (c.deletedAt ?? c.updatedAt);

/** Remote rows are untrusted input: keep only well-formed ones (same limits as local items). */
export function sanitizeCloud(raw: unknown): CloudItem[] {
  if (!Array.isArray(raw)) return [];
  const out: CloudItem[] = [];
  for (const r of raw) {
    const [item] = sanitizeSaved([{ ...r, id: undefined }]);
    if (!item || typeof r?.key !== 'string' || r.key !== item.id || typeof r?.updatedAt !== 'number') continue;
    out.push({ ...toCloud(item), deletedAt: typeof r.deletedAt === 'number' ? r.deletedAt : null });
  }
  return out;
}

export function mergeSaved(
  local: SavedItem[],
  tombstones: SavedTombstone[],
  remote: CloudItem[],
): { items: SavedItem[]; tombstones: SavedTombstone[]; push: CloudItem[]; changed: boolean } {
  const remoteBy = new Map(remote.map((r) => [r.key, r]));
  const tombBy = new Map(tombstones.map((t) => [t.id, t]));
  const localBy = new Map(local.map((l) => [l.id, l]));
  const push: CloudItem[] = [];
  const items: SavedItem[] = [];
  const nextTombs = new Map(tombBy);
  let changed = false;

  // Local items, in their order.
  for (const l of local) {
    const r = remoteBy.get(l.id);
    if (!r) {
      push.push(toCloud(l));
      items.push(l);
      continue;
    }
    if (r.deletedAt !== null && r.deletedAt > l.updatedAt) {
      // Deleted on another device after this copy's last edit.
      changed = true;
      nextTombs.set(l.id, { id: l.id, deletedAt: r.deletedAt });
      continue;
    }
    if (r.deletedAt === null && r.updatedAt > l.updatedAt) {
      const { key, deletedAt: _d, ...rest } = r;
      items.push({ ...rest, id: key });
      changed = true;
      continue;
    }
    if (stamp(r) < l.updatedAt || (r.deletedAt !== null && r.deletedAt <= l.updatedAt)) push.push(toCloud(l));
    items.push(l);
  }

  // Local deletions the server doesn't have yet.
  for (const t of tombstones) {
    if (localBy.has(t.id)) continue;
    const r = remoteBy.get(t.id);
    if (r && r.deletedAt === null && r.updatedAt <= t.deletedAt) {
      push.push({ ...r, deletedAt: t.deletedAt });
    }
  }

  // Items only on the server: added on another device, unless deleted here later.
  const added: SavedItem[] = [];
  for (const r of remote) {
    if (localBy.has(r.key) || r.deletedAt !== null) continue;
    const t = tombBy.get(r.key);
    if (t && t.deletedAt >= r.updatedAt) continue;
    if (t) nextTombs.delete(r.key);
    const { key, deletedAt: _d, ...rest } = r;
    added.push({ ...rest, id: key });
    changed = true;
  }
  added.sort((a, b) => b.addedAt - a.addedAt);

  return { items: [...added, ...items], tombstones: [...nextTombs.values()], push, changed };
}
