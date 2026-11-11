/**
 * Watchlist in the extension (Pro): a cached copy of /api/watches for the "Watching" badges, watch/unwatch on
 * address results, and the unread-alerts count on the toolbar icon. Refreshed when a view opens (at most every
 * 10 minutes); there is no background polling, which would need the `alarms` permission.
 */
import { canUse } from '@/lib/entitlements';
import { getNetwork } from '@/lib/networks';
import { authedCall, displayPlan, loadAccount } from './account';
import { ext } from './browser';

export type CachedWatch = { id: string; chainId: string; address: string };
const TTL_MS = 10 * 60_000;
const BADGE_TTL_MS = 5 * 60_000;

export async function watchlistAvailable(): Promise<boolean> {
  const plan = displayPlan(await loadAccount());
  return !!plan && canUse('watchlist', plan);
}

export const watchable = (chainId: string) => {
  const f = getNetwork(chainId)?.family;
  return f === 'evm' || f === 'utxo';
};

function sanitize(raw: unknown): CachedWatch[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((w) => typeof w?.id === 'string' && typeof w?.chainId === 'string' && typeof w?.address === 'string')
    .map((w) => ({ id: w.id, chainId: w.chainId, address: w.address }))
    .slice(0, 500);
}

export async function loadWatches(force = false): Promise<CachedWatch[]> {
  if (!(await watchlistAvailable())) return [];
  const cache = (await ext.storage.local.get(['watchCache'])).watchCache as { at?: number; list?: unknown } | undefined;
  if (!force && cache && typeof cache.at === 'number' && Date.now() - cache.at < TTL_MS) return sanitize(cache.list);
  const res = await authedCall('/api/watches');
  if (!res?.ok) return sanitize(cache?.list);
  const list = sanitize(((await res.json().catch(() => null)) as { watches?: unknown } | null)?.watches);
  await ext.storage.local.set({ watchCache: { at: Date.now(), list } });
  return list;
}

export const isWatched = (list: CachedWatch[], chainId: string | null, address: string) =>
  list.some((w) => (!chainId || w.chainId === chainId) && w.address.toLowerCase() === address.toLowerCase());

export async function toggleWatch(chainId: string, address: string): Promise<'added' | 'removed' | 'error'> {
  const list = await loadWatches();
  const existing = list.find((w) => w.chainId === chainId && w.address.toLowerCase() === address.toLowerCase());
  const res = existing ? await authedCall(`/api/watches/${existing.id}`, { method: 'DELETE' }) : await authedCall('/api/watches', { method: 'POST', body: JSON.stringify({ chainId, address }) });
  if (!res?.ok && res?.status !== 409) return 'error';
  await loadWatches(true);
  return existing ? 'removed' : 'added';
}

/** Unread alerts on the toolbar icon (text only; no permission needed). Cleared when signed out or not Pro. */
export async function refreshAlertBadge(force = false): Promise<void> {
  if (!ext.action) return;
  if (!(await watchlistAvailable())) return void (await ext.action.setBadgeText({ text: '' }));
  const last = (await ext.storage.local.get(['alertBadgeAt'])).alertBadgeAt;
  if (!force && typeof last === 'number' && Date.now() - last < BADGE_TTL_MS) return;
  await ext.storage.local.set({ alertBadgeAt: Date.now() });
  const res = await authedCall('/api/alerts');
  if (!res?.ok) return;
  const unread = Number(((await res.json().catch(() => null)) as { unread?: number } | null)?.unread ?? 0);
  await ext.action.setBadgeText({ text: unread > 0 ? (unread > 99 ? '99+' : String(unread)) : '' });
  await ext.action.setBadgeBackgroundColor?.({ color: '#00729c' });
}
