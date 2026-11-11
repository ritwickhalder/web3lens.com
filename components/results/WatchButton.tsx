'use client';

import { Eye, EyeSlash } from '@phosphor-icons/react/dist/ssr';
import { useState, useSyncExternalStore } from 'react';
import { accountStore } from '@/lib/client/account';
import { addWatch, findWatch, removeWatch, watchStore } from '@/lib/client/watches';
import { detectQuery } from '@/lib/detect';
import { canUse } from '@/lib/entitlements';
import { getNetwork } from '@/lib/networks';

const btn = 'inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-bold text-fg/85 transition-colors hover:border-accent hover:text-accent disabled:opacity-60';

/** Watch / Unwatch on address pages of watchable chains, for Pro accounts only (others see nothing). */
export function WatchButton({ query, chainId, label }: { query: string; chainId: string | null; label?: string }) {
  const account = useSyncExternalStore(accountStore.subscribe, accountStore.getSnapshot, accountStore.getServerSnapshot);
  const list = useSyncExternalStore(watchStore.subscribe, watchStore.getSnapshot, watchStore.getServerSnapshot);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const family = chainId ? getNetwork(chainId)?.family : undefined;
  const isAddress = detectQuery(query)?.kind === 'address';
  if (!chainId || (family !== 'evm' && family !== 'utxo') || !isAddress) return null;
  if (account.status !== 'signedIn' || !canUse('watchlist', account.me.plan)) return null;
  const existing = findWatch(list, chainId, query);
  return (
    <>
      <button
        type="button"
        className={btn}
        disabled={busy || list === null}
        aria-pressed={!!existing}
        title={existing ? 'Stop watching this address' : 'Get alerts when this address sends or receives'}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            if (existing) await removeWatch(existing.id);
            else await addWatch(chainId, query, label ?? '');
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {existing ? <EyeSlash aria-hidden weight="bold" className="size-4" /> : <Eye aria-hidden weight="bold" className="size-4" />}
        {existing ? 'Watching' : 'Watch'}
      </button>
      {error && <span className="inline-flex h-9 items-center text-sm font-semibold text-redline">{error}</span>}
    </>
  );
}
