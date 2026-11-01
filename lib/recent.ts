/**
 * Recent searches, kept only in this browser (localStorage). Exposed as a tiny external store
 * so components can read it with useSyncExternalStore without hydration mismatches.
 */
export type RecentSearch = { chainId: string; query: string };

const KEY = 'w3l:recent';
const MAX = 6;
const EMPTY: RecentSearch[] = [];
const listeners = new Set<() => void>();

let cachedRaw: string | null = null;
let cached: RecentSearch[] = EMPTY;

function read(): RecentSearch[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  try {
    const parsed = JSON.parse(raw ?? '[]');
    cached = Array.isArray(parsed)
      ? parsed.filter((r) => typeof r?.chainId === 'string' && typeof r?.query === 'string').slice(0, MAX)
      : EMPTY;
  } catch {
    cached = EMPTY;
  }
  return cached;
}

function write(list: RecentSearch[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Storage blocked (private mode, quota): recents just won't persist.
  }
  listeners.forEach((l) => l());
}

export const recentStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => e.key === KEY && listener();
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener('storage', onStorage);
    };
  },
  getSnapshot: read,
  getServerSnapshot: () => EMPTY,
  add(entry: RecentSearch) {
    const rest = read().filter((r) => !(r.chainId === entry.chainId && r.query === entry.query));
    write([entry, ...rest].slice(0, MAX));
  },
  clear() {
    write([]);
  },
};
