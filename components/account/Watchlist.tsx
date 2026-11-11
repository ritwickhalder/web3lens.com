'use client';

import { ArrowsClockwise, BellSimple, Trash } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { ProNote } from '@/components/account/ProNote';
import { ChainGlyph } from '@/components/search/ChainGlyph';
import { btnCls, ErrorText, ghostBtnCls, Panel } from '@/components/tools/ui';
import { getChain } from '@/lib/chains';
import { accountCall, accountStore, planOfState, signInWithGoogle } from '@/lib/client/account';
import { refreshWatches, removeWatch, setWatchEmail, watchStore } from '@/lib/client/watches';
import { canUse, LIMITS } from '@/lib/entitlements';
import { shortHash } from '@/lib/format';
import { nativeResultUrl } from '@/lib/search-url';

type Alert = { id: string; kind: 'sent' | 'received' | 'balance_changed'; chainId: string; address: string; label: string; summary: string; source: string; createdAt: string; read: boolean };

const ago = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'not yet');

export function Watchlist() {
  const account = useSyncExternalStore(accountStore.subscribe, accountStore.getSnapshot, accountStore.getServerSnapshot);
  const watches = useSyncExternalStore(watchStore.subscribe, watchStore.getSnapshot, watchStore.getServerSnapshot);
  const { plan, signedIn, launched } = planOfState(account);
  const pro = canUse('watchlist', plan);
  const [alerts, setAlerts] = useState<{ alerts: Alert[]; unread: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadAlerts = useCallback(() => {
    accountCall<{ alerts: Alert[]; unread: number }>('/api/alerts', 'GET')
      .then(setAlerts)
      .catch(() => setAlerts(null));
  }, []);
  useEffect(() => {
    if (signedIn) {
      loadAlerts();
      void refreshWatches();
    }
  }, [signedIn, loadAlerts]);

  if (account.status === 'loading') return <Panel><p className="text-sm font-semibold text-muted">Loading…</p></Panel>;
  if (account.status === 'unavailable') return <Panel title="Coming with Pro"><p className="text-sm font-medium text-muted">The watchlist needs an account, which isn't switched on yet.</p></Panel>;
  if (!signedIn) {
    return (
      <Panel title="Sign in to use the watchlist">
        <p className="mb-4 text-sm font-medium text-muted">Watch up to {LIMITS.pro.watches} addresses with Pro and get an alert when one sends or receives.</p>
        <button type="button" className={btnCls} onClick={() => signInWithGoogle('/watchlist').catch((e: Error) => setError(e.message))}>
          Sign in with Google
        </button>
        {error && <div className="mt-3"><ErrorText>{error}</ErrorText></div>}
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      {!pro && (
        <Panel>
          {launched ? (
            <ProNote>Watch up to {LIMITS.pro.watches} addresses and get an email when one sends or receives. Your existing watches are kept and resume with Pro.</ProNote>
          ) : (
            <p className="text-sm font-medium text-muted">The watchlist is part of Pro, which opens soon.</p>
          )}
        </Panel>
      )}
      <Panel
        title={`Watched addresses${watches ? ` (${watches.length}${pro ? ` of ${LIMITS.pro.watches}` : ''})` : ''}`}
        aside={
          pro && watches && watches.length > 0 ? (
            <button
              type="button"
              className={ghostBtnCls}
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  const r = await accountCall<{ checked: number; alerts: number; errors: number }>('/api/watches/check', 'POST');
                  setNotice(`Checked ${r.checked}: ${r.alerts} new alert${r.alerts === 1 ? '' : 's'}${r.errors ? `, ${r.errors} couldn't be reached (tried again later)` : ''}.`);
                  await refreshWatches();
                  loadAlerts();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <ArrowsClockwise aria-hidden weight="bold" className={`size-4 ${busy ? 'animate-spin' : ''}`} /> Check now
            </button>
          ) : null
        }
      >
        {notice && <p className="mb-3 text-sm font-semibold text-accent">{notice}</p>}
        {!watches ? (
          <p className="text-sm font-semibold text-muted">Loading…</p>
        ) : watches.length === 0 ? (
          <p className="text-sm font-medium text-muted">
            Nothing watched yet. Open an address on an EVM chain, Bitcoin or Litecoin and choose <span className="font-bold text-fg">Watch</span>. Watches are checked against the
            same public sources as the address pages; the first check records the starting point.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {watches.map((w) => {
              const chain = getChain(w.chainId);
              const href = nativeResultUrl(w.chainId, 'address', w.address);
              return (
                <li key={w.id} className="grid grid-cols-1 gap-3 py-3 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      {chain && <ChainGlyph id={chain.id} name={chain.name} size="xs" />}
                      <span className="font-extrabold">{w.label || chain?.name || w.chainId}</span>
                    </p>
                    {href ? (
                      <Link href={href} className="block break-all font-mono text-[13px] hover:text-accent">
                        {w.address}
                      </Link>
                    ) : (
                      <span className="block break-all font-mono text-[13px]">{w.address}</span>
                    )}
                    <p className="text-xs font-semibold text-faint">
                      {w.balance ? `Balance ${w.balance} · ` : ''}checked {ago(w.lastCheckedAt)}
                      {w.lastError && <span className="text-redline"> · last check failed ({w.lastError}); retrying</span>}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-line px-3 text-sm font-bold">
                      <input type="checkbox" className="accent-[var(--color-accent)]" checked={w.notifyEmail} onChange={(e) => void setWatchEmail(w.id, e.target.checked).catch((err: Error) => setError(err.message))} />
                      Email me
                    </label>
                    <button
                      type="button"
                      aria-label={`Stop watching ${w.label || w.address}`}
                      className={`${ghostBtnCls} hover:border-danger hover:text-danger`}
                      onClick={() => void removeWatch(w.id).catch((err: Error) => setError(err.message))}
                    >
                      <Trash aria-hidden weight="bold" className="size-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {error && <div className="mt-3"><ErrorText>{error}</ErrorText></div>}
      </Panel>

      <Panel
        title={`Alerts${alerts?.unread ? ` (${alerts.unread} new)` : ''}`}
        aside={
          alerts?.unread ? (
            <button
              type="button"
              className={ghostBtnCls}
              onClick={async () => {
                await accountCall('/api/alerts', 'POST', { read: 'all' }).catch(() => {});
                loadAlerts();
              }}
            >
              Mark all read
            </button>
          ) : null
        }
      >
        {!alerts ? (
          <p className="text-sm font-semibold text-muted">Loading…</p>
        ) : alerts.alerts.length === 0 ? (
          <p className="text-sm font-medium text-muted">No activity yet. Alerts are kept for 90 days.</p>
        ) : (
          <ul className="divide-y divide-line">
            {alerts.alerts.map((a) => (
              <li key={a.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <BellSimple aria-hidden weight={a.read ? 'bold' : 'fill'} className={`mt-0.5 size-4 shrink-0 ${a.read ? 'text-faint' : 'text-accent'}`} />
                <div className="min-w-0">
                  <p className="font-bold">
                    {a.label || shortHash(a.address, 10, 6)}: <span className="font-semibold">{a.summary}</span>
                  </p>
                  <p className="text-xs font-semibold text-faint">
                    {new Date(a.createdAt).toLocaleString()} · source {a.source}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs font-medium text-faint">
          Alerts compare an address's transaction count and native balance between checks, from free public sources. Token transfers alone aren't detected. Always open the address to confirm.
        </p>
      </Panel>
    </div>
  );
}
