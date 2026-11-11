/**
 * Cloud sync of saved items in the extension (Pro), with the website's merge rules (lib/saved-sync.ts): newest
 * change wins, deletions you made travel, and nothing is removed locally when a request fails. Runs when Settings
 * or Saved opens and after saved items change, at most every 30 s automatically; "Sync now" forces it.
 */
import { canUse } from '@/lib/entitlements';
import { mergeSaved, sanitizeCloud, SYNC_BATCH, type CloudItem } from '@/lib/saved-sync';
import { authedCall, displayPlan, loadAccount } from './account';
import { ext } from './browser';
import { load, loadTombstones, setSaved, setTombstones } from './store';

export type SyncInfo = { cursor: string | null; lastSyncAt: number | null; error: string | null; refused: number };
const EMPTY: SyncInfo = { cursor: null, lastSyncAt: null, error: null, refused: 0 };

export async function loadSyncInfo(): Promise<SyncInfo> {
  const r = (await ext.storage.local.get(['syncInfo'])).syncInfo as Partial<SyncInfo> | undefined;
  return {
    cursor: typeof r?.cursor === 'string' ? r.cursor : null,
    lastSyncAt: typeof r?.lastSyncAt === 'number' ? r.lastSyncAt : null,
    error: typeof r?.error === 'string' ? r.error : null,
    refused: typeof r?.refused === 'number' ? r.refused : 0,
  };
}

async function saveSyncInfo(info: SyncInfo) {
  await ext.storage.local.set({ syncInfo: info });
}

export async function syncAvailable(): Promise<boolean> {
  const plan = displayPlan(await loadAccount());
  return !!plan && canUse('cloudSync', plan);
}

let running: Promise<'off' | 'ok' | 'error'> | null = null;
let lastAuto = 0;

export function syncSaved(force = false): Promise<'off' | 'ok' | 'error' | 'skipped'> {
  if (!force && Date.now() - lastAuto < 30_000) return Promise.resolve('skipped');
  lastAuto = Date.now();
  running ??= run().finally(() => {
    running = null;
  });
  return running;
}

async function run(): Promise<'off' | 'ok' | 'error'> {
  if (!(await syncAvailable())) return 'off';
  const info = await loadSyncInfo();
  try {
    const remote: CloudItem[] = [];
    let cursor = info.cursor;
    for (let page = 0; page < 20; page++) {
      const res = await authedCall(`/api/sync/saved${cursor ? `?since=${encodeURIComponent(cursor)}` : ''}`);
      if (!res?.ok) throw new Error(`read ${res?.status ?? 0}`);
      const body = (await res.json()) as { items?: unknown; cursor?: string | null };
      remote.push(...sanitizeCloud(body.items));
      const done = !Array.isArray(body.items) || body.items.length < 5000 || body.cursor === cursor;
      cursor = body.cursor ?? cursor;
      if (done) break;
    }
    const { saved } = await load();
    const merged = mergeSaved(saved, await loadTombstones(), remote);
    if (merged.changed) await setSaved(merged.items);
    await setTombstones(merged.tombstones);
    let refused = 0;
    for (let i = 0; i < merged.push.length; i += SYNC_BATCH) {
      const res = await authedCall('/api/sync/saved', { method: 'POST', body: JSON.stringify({ items: merged.push.slice(i, i + SYNC_BATCH) }) });
      if (!res?.ok) throw new Error(`write ${res?.status ?? 0}`);
      refused += Number(((await res.json()) as { refused?: number }).refused ?? 0);
    }
    await saveSyncInfo({ cursor, lastSyncAt: Date.now(), error: null, refused });
    return 'ok';
  } catch (e) {
    await saveSyncInfo({ ...info, error: e instanceof Error ? e.message : 'failed' });
    return 'error';
  }
}

export const NO_SYNC = EMPTY;
