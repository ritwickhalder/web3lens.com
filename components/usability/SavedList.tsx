'use client';

import { Star, Trash } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ChainGlyph } from '@/components/search/ChainGlyph';
import { ghostBtnCls, inputCls, Panel } from '@/components/tools/ui';
import { getChain } from '@/lib/chains';
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

function Row({ item, selected, onSelect }: { item: SavedItem; selected: boolean; onSelect: (v: boolean) => void }) {
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

export function SavedList() {
  const saved = useSyncExternalStore(savedStore.subscribe, savedStore.getSnapshot, savedStore.getServerSnapshot);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const list = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return [...saved]
      .filter((x) => !f || x.label.toLowerCase().includes(f) || x.query.toLowerCase().includes(f) || x.note.toLowerCase().includes(f))
      .sort((a, b) => Number(b.favourite) - Number(a.favourite) || b.addedAt - a.addedAt);
  }, [saved, filter]);

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
                const n = importSaved(await file.text());
                setNotice(`Imported ${n} items.`);
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
      {notice && <p className="mb-4 text-sm font-semibold text-accent">{notice}</p>}
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
