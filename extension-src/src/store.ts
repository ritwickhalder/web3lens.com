/**
 * Extension storage (storage.local): the same shapes and sanitisers as the website's localStorage,
 * plus extension-only settings. Nothing is synced or sent anywhere.
 */
import { DEFAULT_PREFS, sanitizePrefs, type Prefs } from '@/lib/prefs';
import type { Theme } from '@/lib/theme';
import type { RecentSearch } from '@/lib/recent';
import { MAX_SAVED, sanitizeSaved, savedId, type SavedItem } from '@/lib/saved';
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

export async function upsertSaved(item: { query: string; chainId: string | null; label?: string; note?: string; favourite?: boolean }) {
  const { saved } = await load();
  const id = savedId(item.query, item.chainId);
  const existing = saved.find((x) => x.id === id);
  const next: SavedItem = {
    id,
    query: item.query.trim(),
    chainId: item.chainId,
    label: (item.label ?? existing?.label ?? '').slice(0, 80),
    note: (item.note ?? existing?.note ?? '').slice(0, 1000),
    favourite: item.favourite ?? existing?.favourite ?? false,
    addedAt: existing?.addedAt ?? Date.now(),
  };
  await setSaved([next, ...saved.filter((x) => x.id !== id)]);
}

export async function removeSaved(id: string) {
  const { saved } = await load();
  await setSaved(saved.filter((x) => x.id !== id));
}

export function onStorageChange(cb: () => void) {
  ext.storage.onChanged.addListener((_changes, area) => area === 'local' && cb());
}
