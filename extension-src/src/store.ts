/**
 * Extension storage (storage.local): the same shapes and sanitisers as the website's localStorage,
 * plus extension-only settings. Nothing here is synced or sent anywhere; the optional account (./account.ts)
 * keeps its own `account` key.
 */
import { DEFAULT_PREFS, sanitizePrefs, type Prefs } from '@/lib/prefs';
import type { Theme } from '@/lib/theme';
import type { RecentSearch } from '@/lib/recent';
import { applyUpsert, MAX_SAVED, mergeImport, sanitizeSaved, sanitizeTombstones, type SavedItem, type SavedTombstone, type UpsertResult } from '@/lib/saved';
import { extLimits, loadAccount } from './account';
import { ext } from './browser';
import { isLocale, type LanguagePref } from './locales';

export type ExtSettings = {
  /** When false, nothing leaves the browser: detection, explorer links, tools and the OFAC snapshot still work. */
  network: boolean;
  /** Web3Lens API origin (for self-hosting); must be https. */
  apiBase: string;
  /** Colour theme; light is the extensions' default (the website defaults to dark). */
  theme: Theme;
  /** UI language of the extension pages; `auto` follows the browser (English when it isn't one of ours). */
  language: LanguagePref;
};

export const DEFAULT_SETTINGS: ExtSettings = { network: true, apiBase: 'https://web3lens.com', theme: 'light', language: 'auto' };

export function sanitizeSettings(raw: unknown): ExtSettings {
  const r = (raw ?? {}) as Partial<ExtSettings>;
  let apiBase = DEFAULT_SETTINGS.apiBase;
  if (typeof r.apiBase === 'string') {
    try {
      const u = new URL(r.apiBase);
      if (u.protocol === 'https:' && !u.username) apiBase = u.origin;
    } catch {
      // keep default
    }
  }
  return {
    network: r.network !== false,
    apiBase,
    theme: r.theme === 'dark' || r.theme === 'system' ? r.theme : 'light',
    language: isLocale(r.language) ? r.language : 'auto',
  };
}

export async function load(): Promise<{ prefs: Prefs; saved: SavedItem[]; recent: RecentSearch[]; settings: ExtSettings }> {
  const raw = await ext.storage.local.get(['prefs', 'saved', 'recent', 'settings']);
  const recent = Array.isArray(raw.recent)
    ? (raw.recent as RecentSearch[]).filter((r) => typeof r?.chainId === 'string' && typeof r?.query === 'string').slice(0, 8)
    : [];
  return {
    prefs: raw.prefs ? sanitizePrefs(raw.prefs) : DEFAULT_PREFS,
    saved: sanitizeSaved(raw.saved ?? []),
    recent,
    settings: sanitizeSettings(raw.settings),
  };
}

export async function setPrefs(prefs: Prefs) {
  await ext.storage.local.set({ prefs: sanitizePrefs(prefs) });
}

export async function setSettings(settings: ExtSettings) {
  await ext.storage.local.set({ settings: sanitizeSettings(settings) });
}

export async function setSaved(saved: SavedItem[]) {
  await ext.storage.local.set({ saved: sanitizeSaved(saved).slice(0, MAX_SAVED) });
}

export async function addRecent(entry: RecentSearch) {
  const { recent } = await load();
  const next = [entry, ...recent.filter((r) => !(r.chainId === entry.chainId && r.query === entry.query))].slice(0, 8);
  await ext.storage.local.set({ recent: next });
}

export async function clearRecent() {
  await ext.storage.local.set({ recent: [] });
}

/** The cap for adding new saved items: the signed-in plan (cached), Free when signed out. Existing items are never cut. */
export async function savedCap(): Promise<number> {
  return extLimits(await loadAccount()).savedLocal;
}

export async function loadTombstones(): Promise<SavedTombstone[]> {
  return sanitizeTombstones((await ext.storage.local.get(['savedDeleted'])).savedDeleted);
}

export async function setTombstones(list: SavedTombstone[]) {
  await ext.storage.local.set({ savedDeleted: sanitizeTombstones(list) });
}

export async function upsertSaved(item: { query: string; chainId: string | null; label?: string; note?: string; favourite?: boolean }): Promise<UpsertResult> {
  const { saved } = await load();
  const r = applyUpsert(saved, item, await savedCap());
  if (r.result !== 'limit') await setSaved(r.list);
  return r.result;
}

export async function removeSaved(id: string) {
  const { saved } = await load();
  await setSaved(saved.filter((x) => x.id !== id));
  await setTombstones([...(await loadTombstones()).filter((x) => x.id !== id), { id, deletedAt: Date.now() }]);
}

/** Settings → Delete saved items (behind a confirm); remembered as deletions so sync removes them everywhere. */
export async function clearSaved() {
  const { saved } = await load();
  const now = Date.now();
  const ids = new Set(saved.map((x) => x.id));
  await setSaved([]);
  await setTombstones([...(await loadTombstones()).filter((x) => !ids.has(x.id)), ...[...ids].map((id) => ({ id, deletedAt: now }))]);
}

/** Import adds or updates only; new items stop at the plan's cap (the rest stay in the file). */
export async function importSaved(incoming: SavedItem[]): Promise<{ imported: number; skipped: number }> {
  const { saved } = await load();
  const r = mergeImport(saved, incoming, await savedCap());
  await setSaved(r.list);
  return { imported: r.imported, skipped: r.skipped };
}

export function onStorageChange(cb: () => void) {
  ext.storage.onChanged.addListener((_changes, area) => area === 'local' && cb());
}
