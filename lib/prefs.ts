/** Search preferences, kept in this browser (localStorage). The extensions store the same shape in storage.local. */
import { createLocalStore } from '@/lib/local-store';

export type Prefs = {
  /** chain id → preferred explorer name (from data/explorers.json). */
  explorers: Record<string, string>;
  /** Chain ids pinned to the top of the chain picker. */
  favouriteChains: string[];
  /**
   * What Search does: `results` shows Web3Lens results first when native data exists for the chain
   * (explorer links on the page), `explorer` always opens the block explorer in a new tab.
   */
  searchAction: 'results' | 'explorer';
};

export const DEFAULT_PREFS: Prefs = { explorers: {}, favouriteChains: [], searchAction: 'results' };

export function sanitizePrefs(raw: unknown): Prefs {
  const r = (raw ?? {}) as Partial<Prefs>;
  const explorers: Record<string, string> = {};
  if (r.explorers && typeof r.explorers === 'object') {
    for (const [k, v] of Object.entries(r.explorers)) if (typeof v === 'string' && v.length < 80) explorers[k] = v;
  }
  return {
    explorers,
    favouriteChains: Array.isArray(r.favouriteChains) ? r.favouriteChains.filter((x) => typeof x === 'string').slice(0, 50) : [],
    searchAction: r.searchAction === 'explorer' ? 'explorer' : 'results',
  };
}

export const prefsStore = createLocalStore<Prefs>('w3l:prefs', DEFAULT_PREFS, sanitizePrefs);

export function toggleFavouriteChain(id: string) {
  prefsStore.set((p) => ({
    ...p,
    favouriteChains: p.favouriteChains.includes(id) ? p.favouriteChains.filter((x) => x !== id) : [...p.favouriteChains, id],
  }));
}

export function setPreferredExplorer(chainId: string, explorer: string | null) {
  prefsStore.set((p) => {
    const explorers = { ...p.explorers };
    if (explorer) explorers[chainId] = explorer;
    else delete explorers[chainId];
    return { ...p, explorers };
  });
}
