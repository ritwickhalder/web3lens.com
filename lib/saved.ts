/**
 * Saved addresses / transactions with labels and notes, kept in this browser (localStorage).
 * Exportable as JSON; the extensions keep the same shape in storage.local.
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
};

export const MAX_SAVED = 500;
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
    });
    if (out.length >= MAX_SAVED) break;
  }
  return out;
}

export const savedStore = createLocalStore<SavedItem[]>('w3l:saved', EMPTY, sanitizeSaved);

export function upsertSaved(item: { query: string; chainId: string | null; label?: string; note?: string; favourite?: boolean }) {
  const id = savedId(item.query, item.chainId);
  savedStore.set((list) => {
    const existing = list.find((x) => x.id === id);
    const next: SavedItem = {
      id,
      query: item.query.trim(),
      chainId: item.chainId,
      label: (item.label ?? existing?.label ?? '').slice(0, 80),
      note: (item.note ?? existing?.note ?? '').slice(0, 1000),
      favourite: item.favourite ?? existing?.favourite ?? false,
      addedAt: existing?.addedAt ?? Date.now(),
    };
    return [next, ...list.filter((x) => x.id !== id)].slice(0, MAX_SAVED);
  });
}

export function removeSaved(id: string) {
  savedStore.set((list) => list.filter((x) => x.id !== id));
}

/** Merges imported items over existing ones (imported labels win). Returns how many were added or updated. */
export function importSaved(json: string): number {
  const incoming = sanitizeSaved(JSON.parse(json)?.items ?? JSON.parse(json));
  savedStore.set((list) => sanitizeSaved([...incoming, ...list]));
  return incoming.length;
}

export function exportSaved(list: SavedItem[]): string {
  return JSON.stringify({ app: 'web3lens', version: 1, exportedAt: new Date().toISOString(), items: list }, null, 2);
}

/** Label lookup for showing saved names next to addresses. */
export function labelFor(list: SavedItem[], query: string, chainId: string | null): SavedItem | undefined {
  return list.find((x) => x.id === savedId(query, chainId)) ?? list.find((x) => x.id === savedId(query, null));
}
