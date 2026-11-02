/**
 * Tiny external store over one localStorage key, for useSyncExternalStore. Values stay in this
 * browser only. Reads are cached by raw string so snapshots are referentially stable.
 */
export type LocalStore<T> = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => T;
  getServerSnapshot: () => T;
  set: (next: T | ((prev: T) => T)) => void;
};

export function createLocalStore<T>(key: string, fallback: T, sanitize: (raw: unknown) => T): LocalStore<T> {
  const listeners = new Set<() => void>();
  let cachedRaw: string | null | undefined;
  let cached: T = fallback;

  function read(): T {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      return cached;
    }
    if (raw === cachedRaw) return cached;
    cachedRaw = raw;
    try {
      cached = raw === null ? fallback : sanitize(JSON.parse(raw));
    } catch {
      cached = fallback;
    }
    return cached;
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      const onStorage = (e: StorageEvent) => e.key === key && listener();
      window.addEventListener('storage', onStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener('storage', onStorage);
      };
    },
    getSnapshot: read,
    getServerSnapshot: () => fallback,
    set(next) {
      const value = typeof next === 'function' ? (next as (prev: T) => T)(read()) : next;
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // Storage blocked (private mode, quota): keep it for this page view only.
        cached = value;
        cachedRaw = undefined;
      }
      listeners.forEach((l) => l());
    },
  };
}
