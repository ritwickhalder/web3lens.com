'use client';
/**
 * Website side of cloud sync (Pro): pull changes, merge (lib/saved-sync.ts), write local, push. Runs when the
 * account is Pro, on load and shortly after saved items change. Never deletes local data on an error: a failed pull
 * stops the run before anything is written.
 */
import { accountStore } from '@/lib/client/account';
import { canUse } from '@/lib/entitlements';
import { savedStore, tombstoneStore } from '@/lib/saved';
import { mergeSaved, sanitizeCloud, SYNC_BATCH, type CloudItem } from '@/lib/saved-sync';

const CURSOR_KEY = 'w3l:sync';

export type SyncState = { status: 'off' | 'syncing' | 'ok' | 'error'; lastSyncAt: number | null; message: string | null };

let state: SyncState = { status: 'off', lastSyncAt: null, message: null };
const listeners = new Set<() => void>();
const set = (next: Partial<SyncState>) => {
  state = { ...state, ...next };
  for (const l of listeners) l();
};

export const syncStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  getSnapshot: () => state,
  getServerSnapshot: (): SyncState => ({ status: 'off', lastSyncAt: null, message: null }),
};

function readCursor(): { cursor: string | null; lastSyncAt: number | null } {
  try {
    const v = JSON.parse(localStorage.getItem(CURSOR_KEY) ?? 'null') as { cursor?: unknown; lastSyncAt?: unknown } | null;
    return { cursor: typeof v?.cursor === 'string' ? v.cursor : null, lastSyncAt: typeof v?.lastSyncAt === 'number' ? v.lastSyncAt : null };
  } catch {
    return { cursor: null, lastSyncAt: null };
  }
}

function writeCursor(cursor: string | null, lastSyncAt: number) {
  try {
    localStorage.setItem(CURSOR_KEY, JSON.stringify({ cursor, lastSyncAt }));
  } catch {
    /* private mode: next run pulls everything again, which is safe */
  }
}

let running: Promise<void> | null = null;

export function syncEnabled(): boolean {
  const s = accountStore.getSnapshot();
  return s.status === 'signedIn' && canUse('cloudSync', s.me.plan);
}

export function syncNow(): Promise<void> {
  if (!syncEnabled()) {
    set({ status: 'off' });
    return Promise.resolve();
  }
  running ??= run().finally(() => {
    running = null;
  });
  return running;
}

async function run() {
  set({ status: 'syncing', message: null });
  const { cursor } = readCursor();
  try {
    // 1. Pull everything changed since the last good sync (all of it the first time).
    const remote: CloudItem[] = [];
    let next = cursor;
    for (let page = 0; page < 20; page++) {
      const r = await fetch(`/api/sync/saved${next ? `?since=${encodeURIComponent(next)}` : ''}`, { cache: 'no-store', credentials: 'same-origin' });
      if (!r.ok) throw new Error(`Sync read failed (HTTP ${r.status}).`);
      const body = (await r.json()) as { items?: unknown; cursor?: string | null };
      const items = sanitizeCloud(body.items);
      remote.push(...items);
      if (!Array.isArray(body.items) || body.items.length < 5000 || body.cursor === next) {
        next = body.cursor ?? next;
        break;
      }
      next = body.cursor ?? next;
    }
    // 2. Merge with local items and local deletions.
    const merged = mergeSaved(savedStore.getSnapshot(), tombstoneStore.getSnapshot(), remote);
    if (merged.changed) savedStore.set(merged.items);
    tombstoneStore.set(merged.tombstones);
    // 3. Push what the server doesn't have yet, in batches.
    let refused = 0;
    for (let i = 0; i < merged.push.length; i += SYNC_BATCH) {
      const r = await fetch('/api/sync/saved', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items: merged.push.slice(i, i + SYNC_BATCH) }),
      });
      if (!r.ok) throw new Error(r.status === 402 ? 'Cloud sync is a Pro feature.' : `Sync upload failed (HTTP ${r.status}).`);
      refused += Number(((await r.json()) as { refused?: number }).refused ?? 0);
    }
    const now = Date.now();
    writeCursor(next, now);
    set({ status: 'ok', lastSyncAt: now, message: refused ? `${refused} items weren't uploaded: your account holds up to 2,000 saved items.` : null });
  } catch (e) {
    set({ status: 'error', message: e instanceof Error ? e.message : 'Sync failed. Your items are safe in this browser.' });
  }
}

let timer: number | null = null;

/** Starts automatic sync (idempotent): when the account becomes Pro, and 2 s after saved items change. */
export function startAutoSync() {
  if (typeof window === 'undefined' || (window as { __w3lSync?: boolean }).__w3lSync) return;
  (window as { __w3lSync?: boolean }).__w3lSync = true;
  set({ lastSyncAt: readCursor().lastSyncAt });
  const schedule = () => {
    if (!syncEnabled()) return;
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => void syncNow(), 2000);
  };
  let wasPro = false;
  accountStore.subscribe(() => {
    const pro = syncEnabled();
    if (pro && !wasPro) void syncNow();
    if (!pro) set({ status: 'off' });
    wasPro = pro;
  });
  savedStore.subscribe(() => {
    if (state.status !== 'syncing') schedule();
  });
  tombstoneStore.subscribe(schedule);
}
