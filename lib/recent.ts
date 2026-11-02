/** Recent searches, kept only in this browser (localStorage). */
import { createLocalStore } from '@/lib/local-store';

export type RecentSearch = { chainId: string; query: string };

const MAX = 6;
const EMPTY: RecentSearch[] = [];

const store = createLocalStore<RecentSearch[]>('w3l:recent', EMPTY, (raw) =>
  Array.isArray(raw)
    ? raw.filter((r) => typeof r?.chainId === 'string' && typeof r?.query === 'string').slice(0, MAX)
    : EMPTY,
);

export const recentStore = {
  subscribe: store.subscribe,
  getSnapshot: store.getSnapshot,
  getServerSnapshot: store.getServerSnapshot,
  add(entry: RecentSearch) {
    store.set((list) => [entry, ...list.filter((r) => !(r.chainId === entry.chainId && r.query === entry.query))].slice(0, MAX));
  },
  clear() {
    store.set([]);
  },
};
