'use client';
/** The signed-in user's watchlist, shared by result pages and /watchlist (one fetch, refreshed on change). */
import { accountCall, accountStore } from '@/lib/client/account';
import { canUse } from '@/lib/entitlements';

export type Watch = { id: string; chainId: string; address: string; label: string; notifyEmail: boolean; lastCheckedAt: string | null; lastError: string | null; balance: string | null; createdAt: string };

let watches: Watch[] | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function canWatch(): boolean {
  const s = accountStore.getSnapshot();
  return s.status === 'signedIn' && canUse('watchlist', s.me.plan);
}

export function refreshWatches(): Promise<void> {
  if (accountStore.getSnapshot().status !== 'signedIn') return Promise.resolve();
  loading ??= accountCall<{ watches: Watch[] }>('/api/watches', 'GET')
    .then((r) => {
      watches = r.watches;
      emit();
    })
    .catch(() => {})
    .finally(() => {
      loading = null;
    });
  return loading;
}

export const watchStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    if (watches === null) void refreshWatches();
    return () => listeners.delete(l);
  },
  getSnapshot: () => watches,
  getServerSnapshot: (): Watch[] | null => null,
};

export const findWatch = (list: Watch[] | null, chainId: string, address: string) => list?.find((w) => w.chainId === chainId && w.address.toLowerCase() === address.toLowerCase());

export async function addWatch(chainId: string, address: string, label = ''): Promise<void> {
  await accountCall('/api/watches', 'POST', { chainId, address, label });
  await refreshWatches();
}

export async function removeWatch(id: string): Promise<void> {
  await accountCall(`/api/watches/${id}`, 'DELETE');
  await refreshWatches();
}

export async function setWatchEmail(id: string, notifyEmail: boolean): Promise<void> {
  await accountCall(`/api/watches/${id}`, 'PATCH', { notifyEmail });
  await refreshWatches();
}
