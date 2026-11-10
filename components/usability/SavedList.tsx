'use client';

import { ArrowsClockwise, Star, Trash } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ProNote } from '@/components/account/ProNote';
import { ChainGlyph } from '@/components/search/ChainGlyph';
import { ghostBtnCls, inputCls, Panel } from '@/components/tools/ui';
import { getChain } from '@/lib/chains';
import { accountCall, accountStore, planOfState } from '@/lib/client/account';
import { syncNow, syncStore } from '@/lib/client/sync';
import { canUse, LIMITS } from '@/lib/entitlements';
import { downloadText } from '@/lib/csv';
import { detectQuery } from '@/lib/detect';
import { investigationUrl } from '@/lib/investigation';
import { exportSaved, importSaved, removeSaved, savedStore, upsertSaved, type SavedItem } from '@/lib/saved';
import { nativeResultUrl, searchUrl } from '@/lib/search-url';
import { hasNativeSupport } from '@/lib/networks';
import { toQueryKind } from '@/lib/explorer';

function hrefFor(item: SavedItem): string {
  const d = detectQuery(item.query);
  const chain = item.chainId ?? (d?.chains.length === 1 ? d.chains[0] : null);
  const kind = toQueryKind(d);
  if (chain && d && hasNativeSupport(chain, kind)) return nativeResultUrl(chain, kind, d.normalized)!;
  return searchUrl(item.query, item.chainId ?? undefined);
}

type Collection = { id: string; name: string; itemKeys: string[] };

function Row({
  item,
  selected,
  onSelect,
  collections,
  onCollection,
}: {
  item: SavedItem;
  selected: boolean;
  onSelect: (v: boolean) => void;
  collections: Collection[] | null;
  onCollection: (collectionId: string, add: boolean) => void;
}) {
  const chain = item.chainId ? getChain(item.chainId) : undefined;
  const d = detectQuery(item.query);
  return (
    <li className="grid grid-cols-1 gap-3 py-4 md:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-start">
      <input type="checkbox" checked={selected} onChange={(e) => onSelect(e.target.checked)} aria-label={`Select ${item.label || item.query}`} className="mt-3 size-4 accent-[var(--color-accent)]" />
      <div className="min-w-0 space-y-1.5">
        <input
          className={`${inputCls} h-10 font-sans font-bold`}
          defaultValue={item.label}
          placeholder="Add a label"
          aria-label="Label"
          maxLength={80}
          onBlur={(e) => e.target.value !== item.label && upsertSaved({ query: item.query, chainId: item.chainId, label: e.target.value })}
        />
        <Link href={hrefFor(item)} className="flex items-center gap-2 text-sm hover:text-accent">
          {chain && <ChainGlyph id={chain.id} name={chain.name} size="xs" />}
          <span className="min-w-0 break-all font-mono text-[13px]">{item.query}</span>
        </Link>
        <p className="text-xs font-semibold text-faint">
          {d?.label ?? 'Unrecognised'}
          {chain ? ` · ${chain.name}` : ''} · saved {new Date(item.addedAt).toISOString().slice(0, 10)}
        </p>
        {collections && collections.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {collections.map((c) => {
              const inIt = c.itemKeys.includes(item.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={inIt}
                  onClick={() => onCollection(c.id, !inIt)}
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${inIt ? 'border-accent text-accent' : 'border-line text-faint hover:border-line-strong hover:text-fg'}`}
                >
                  {inIt ? '✓ ' : '+ '}
                  {c.name}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <textarea
        className="min-h-[4.5rem] w-full rounded-lg border border-line-strong bg-ink p-2.5 text-sm font-medium text-fg outline-none focus:border-accent"
        defaultValue={item.note}
        placeholder="Notes"
        aria-label="Notes"
        maxLength={1000}
        onBlur={(e) => e.target.value !== item.note && upsertSaved({ query: item.query, chainId: item.chainId, note: e.target.value })}
      />
      <div className="flex gap-1.5">
        <button
          type="button"
          aria-label={item.favourite ? 'Remove from favourites' : 'Mark as favourite'}
          aria-pressed={item.favourite}
          onClick={() => upsertSaved({ query: item.query, chainId: item.chainId, favourite: !item.favourite })}
          className="grid size-10 place-items-center rounded-lg border border-line hover:border-accent"
        >
          <Star weight={item.favourite ? 'fill' : 'bold'} className={`size-4 ${item.favourite ? 'text-accent' : 'text-faint'}`} />
        </button>
        <button type="button" aria-label="Remove" onClick={() => removeSaved(item.id)} className="grid size-10 place-items-center rounded-lg border border-line text-faint hover:border-danger hover:text-danger">
          <Trash weight="bold" className="size-4" />
        </button>
      </div>
    </li>
  );
}

function SyncStatus() {
  const sync = useSyncExternalStore(syncStore.subscribe, syncStore.getSnapshot, syncStore.getServerSnapshot);
  const text =
    sync.status === 'syncing'
      ? 'Syncing with your account…'
      : sync.status === 'error'
        ? (sync.message ?? 'Sync failed. Your items are safe in this browser.')
        : sync.lastSyncAt
          ? `Synced with your account ${new Date(sync.lastSyncAt).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}.`
          : 'Cloud sync is on for your Pro account.';
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line p-3">
      <p className={`text-sm font-semibold ${sync.status === 'error' ? 'text-redline' : 'text-muted'}`} role="status">
        {text}
        {sync.status === 'ok' && sync.message && <span className="block text-redline">{sync.message}</span>}
      </p>
      <button type="button" className={ghostBtnCls} disabled={sync.status === 'syncing'} onClick={() => void syncNow()}>
        <ArrowsClockwise aria-hidden weight="bold" className={`size-4 ${sync.status === 'syncing' ? 'animate-spin' : ''}`} /> Sync now
      </button>
    </div>
  );
}

export function SavedList() {
  const saved = useSyncExternalStore(savedStore.subscribe, savedStore.getSnapshot, savedStore.getServerSnapshot);
  const account = useSyncExternalStore(accountStore.subscribe, accountStore.getSnapshot, accountStore.getServerSnapshot);
  const { plan, limits, launched } = planOfState(account);
  const cloud = canUse('cloudSync', plan);
  const [collections, setCollections] = useState<Collection[] | null>(null);
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [newCollection, setNewCollection] = useState('');
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadCollections = useCallback(() => {
    accountCall<{ collections: Collection[] }>('/api/collections', 'GET')
      .then((r) => setCollections(r.collections))
      .catch(() => setCollections(null));
  }, []);
  useEffect(() => {
    if (cloud) loadCollections();
  }, [cloud, loadCollections]);

  async function changeCollection(id: string, change: { add?: string[]; remove?: string[]; name?: string }) {
    try {
      await accountCall(`/api/collections/${id}`, 'PATCH', change);
      loadCollections();
    } catch (e) {
      setNotice((e as Error).message);
    }
  }

  const list = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const inCollection = activeCollection ? new Set(collections?.find((c) => c.id === activeCollection)?.itemKeys ?? []) : null;
    return [...saved]
      .filter((x) => !inCollection || inCollection.has(x.id))
      .filter((x) => !f || x.label.toLowerCase().includes(f) || x.query.toLowerCase().includes(f) || x.note.toLowerCase().includes(f))
      .sort((a, b) => Number(b.favourite) - Number(a.favourite) || b.addedAt - a.addedAt);
  }, [saved, filter, activeCollection, collections]);

  async function shareSelected() {
    const items = saved.filter((x) => selected.has(x.id)).map((x) => ({ q: x.query, c: x.chainId ?? undefined, l: x.label, n: x.note }));
    try {
      const url = investigationUrl({ v: 1, t: `Investigation (${items.length} items)`, items }, window.location.origin);
      await navigator.clipboard.writeText(url);
      setNotice('Share link copied. Labels and notes travel inside the link: anyone with it can read them.');
    } catch (e) {
      setNotice((e as Error).message);
    }
  }

  return (
    <Panel
      aside={
        <div className="flex flex-wrap gap-2">
          <button type="button" className={ghostBtnCls} disabled={!saved.length} onClick={() => downloadText('web3lens-saved.json', exportSaved(saved), 'application/json')}>
            Export JSON
          </button>
          <button type="button" className={ghostBtnCls} onClick={() => fileRef.current?.click()}>
            Import JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                if (file.size > 2_000_000) throw new Error('File too large');
                const r = importSaved(await file.text());
                setNotice(r.skipped ? `Imported ${r.imported} items; ${r.skipped} were left out (your plan keeps up to ${limits.savedLocal.toLocaleString('en-US')}). They're still in the file.` : `Imported ${r.imported} items.`);
              } catch (err) {
                setNotice(`Import failed: ${(err as Error).message}`);
              }
              e.target.value = '';
            }}
          />
          <button type="button" className={ghostBtnCls} disabled={!selected.size} onClick={shareSelected}>
            Share selected ({selected.size})
          </button>
        </div>
      }
    >
      {cloud && <SyncStatus />}
      {notice && <p className="mb-4 text-sm font-semibold text-accent">{notice}</p>}
      {launched && !cloud && saved.length >= limits.savedLocal && (
        <ProNote className="mb-4">
          You've reached {limits.savedLocal.toLocaleString('en-US')} saved items, the Free limit in this browser. Everything you have stays; new items need room. Pro keeps {LIMITS.pro.savedCloud.toLocaleString('en-US')}, synced across devices and the extension.
        </ProNote>
      )}
      {cloud && collections && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setActiveCollection(null)} className={`rounded-full border px-3 py-1 text-sm font-bold ${!activeCollection ? 'border-accent text-accent' : 'border-line text-muted hover:text-fg'}`}>
            All
          </button>
          {collections.map((c) => (
            <span key={c.id} className="inline-flex items-center">
              <button
                type="button"
                onClick={() => setActiveCollection(c.id === activeCollection ? null : c.id)}
                className={`rounded-l-full border px-3 py-1 text-sm font-bold ${activeCollection === c.id ? 'border-accent text-accent' : 'border-line text-muted hover:text-fg'}`}
              >
                {c.name} <span className="text-faint">{c.itemKeys.length}</span>
              </button>
              <button
                type="button"
                aria-label={`Delete collection ${c.name}`}
                title="Delete collection (saved items stay)"
                onClick={async () => {
                  if (!window.confirm(`Delete the collection "${c.name}"? The saved items in it stay.`)) return;
                  await accountCall(`/api/collections/${c.id}`, 'DELETE').catch((e: Error) => setNotice(e.message));
                  if (activeCollection === c.id) setActiveCollection(null);
                  loadCollections();
                }}
                className="rounded-r-full border border-l-0 border-line px-2 py-1 text-sm font-bold text-faint hover:text-danger"
              >
                ×
              </button>
            </span>
          ))}
          <form
            className="flex items-center gap-1.5"
            onSubmit={async (e) => {
              e.preventDefault();
              const name = newCollection.trim();
              if (!name) return;
              try {
                await accountCall('/api/collections', 'POST', { name });
                setNewCollection('');
                loadCollections();
              } catch (err) {
                setNotice((err as Error).message);
              }
            }}
          >
            <input value={newCollection} onChange={(e) => setNewCollection(e.target.value)} maxLength={60} placeholder="New collection" aria-label="New collection name" className="h-8 w-40 rounded-full border border-line-strong bg-ink px-3 text-sm font-semibold outline-none focus:border-accent" />
            <button type="submit" className="h-8 rounded-full border border-line px-3 text-sm font-bold hover:border-accent hover:text-accent">
              Add
            </button>
          </form>
        </div>
      )}
      {saved.length === 0 ? (
        <p className="text-[15px] font-semibold text-muted">
          Nothing saved yet. Use <span className="text-fg">Save & label</span> on any result page, or <span className="text-fg">Save all</span> in batch search. Saved items stay in this browser
          only.
        </p>
      ) : (
        <>
          <input className={inputCls} value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={`Filter ${saved.length} saved items`} aria-label="Filter saved items" />
          <ul className="mt-2 divide-y divide-line">
            {list.map((item) => (
              <Row
                key={item.id}
                item={item}
                selected={selected.has(item.id)}
                collections={cloud ? collections : null}
                onCollection={(id, add) => void changeCollection(id, add ? { add: [item.id] } : { remove: [item.id] })}
                onSelect={(v) =>
                  setSelected((s) => {
                    const n = new Set(s);
                    if (v) n.add(item.id);
                    else n.delete(item.id);
                    return n;
                  })
                }
              />
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}
