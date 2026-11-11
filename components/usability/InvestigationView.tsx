'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { ProNote, ProTag } from '@/components/account/ProNote';
import { Badge } from '@/components/results/ResultHeader';
import { ChainGlyph } from '@/components/search/ChainGlyph';
import { btnCls, ErrorText, ghostBtnCls, Panel } from '@/components/tools/ui';
import { accountCall, accountStore, planOfState } from '@/lib/client/account';
import { downloadText } from '@/lib/csv';
import { canUse, LIMITS } from '@/lib/entitlements';
import { getChain } from '@/lib/chains';
import { detectQuery } from '@/lib/detect';
import { explorerLinks, toQueryKind } from '@/lib/explorer';
import { decodeInvestigation, investigationUrl, type Investigation } from '@/lib/investigation';
import { hasNativeSupport } from '@/lib/networks';
import { upsertSaved } from '@/lib/saved';
import { nativeResultUrl, searchUrl } from '@/lib/search-url';
import { checkSanctions } from '@/lib/security/sanctions';

const subscribeHash = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

type Summary = { id: string; title: string; items: number; updatedAt: string };

/** Investigations stored in the account (Pro): open (decoded into the link, as before), delete. */
function CloudInvestigations() {
  const account = useSyncExternalStore(accountStore.subscribe, accountStore.getSnapshot, accountStore.getServerSnapshot);
  const { plan, signedIn, launched } = planOfState(account);
  const [list, setList] = useState<Summary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    accountCall<{ investigations: Summary[] }>('/api/investigations', 'GET')
      .then((r) => setList(r.investigations))
      .catch(() => setList(null));
  }, []);
  useEffect(() => {
    if (signedIn) load();
  }, [signedIn, load]);

  if (!signedIn) return null;
  if (!canUse('investigations', plan) && !list?.length) {
    return launched ? (
      <Panel>
        <ProNote>Keep up to {LIMITS.pro.investigations} investigations in your account and open them on any device.</ProNote>
      </Panel>
    ) : null;
  }
  return (
    <Panel title="Your investigations">
      {!list ? (
        <p className="text-sm font-semibold text-muted">Loading…</p>
      ) : list.length === 0 ? (
        <p className="text-sm font-semibold text-muted">None yet. Open a shared link or share from your saved list, then choose “Save to account”.</p>
      ) : (
        <ul className="divide-y divide-line">
          {list.map((x) => (
            <li key={x.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <span className="min-w-0">
                <span className="block truncate font-bold">{x.title || 'Untitled investigation'}</span>
                <span className="text-xs font-semibold text-faint">
                  {x.items} items · updated {new Date(x.updatedAt).toLocaleDateString()}
                </span>
              </span>
              <span className="flex gap-2">
                <button
                  type="button"
                  className={ghostBtnCls}
                  onClick={async () => {
                    try {
                      const r = await accountCall<{ investigation: Investigation }>(`/api/investigations/${x.id}`, 'GET');
                      window.location.href = investigationUrl(r.investigation, window.location.origin);
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  Open
                </button>
                <button
                  type="button"
                  className={`${ghostBtnCls} hover:border-danger hover:text-danger`}
                  onClick={async () => {
                    if (!window.confirm(`Delete "${x.title || 'this investigation'}" from your account?`)) return;
                    await accountCall(`/api/investigations/${x.id}`, 'DELETE').catch((e: Error) => setError(e.message));
                    load();
                  }}
                >
                  Delete
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {error && <div className="mt-3"><ErrorText>{error}</ErrorText></div>}
    </Panel>
  );
}

function InvestigationActions({ inv }: { inv: Investigation }) {
  const account = useSyncExternalStore(accountStore.subscribe, accountStore.getSnapshot, accountStore.getServerSnapshot);
  const { plan, signedIn, launched } = planOfState(account);
  const [state, setState] = useState<'idle' | 'busy' | 'saved'>('idle');
  const [error, setError] = useState<string | null>(null);
  const pro = canUse('investigations', plan);
  if (!signedIn && !launched) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {pro ? (
        <button
          type="button"
          className={ghostBtnCls}
          disabled={state !== 'idle'}
          onClick={async () => {
            setState('busy');
            setError(null);
            try {
              await accountCall('/api/investigations', 'POST', { investigation: inv });
              setState('saved');
            } catch (e) {
              setError((e as Error).message);
              setState('idle');
            }
          }}
        >
          {state === 'saved' ? 'Saved to your account' : state === 'busy' ? 'Saving…' : 'Save to account'}
        </button>
      ) : null}
      <button
        type="button"
        className={`${ghostBtnCls} disabled:opacity-60`}
        disabled={!canUse('jsonExport', plan)}
        onClick={() => downloadText(`web3lens-investigation-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ app: 'web3lens', kind: 'investigation', exportedAt: new Date().toISOString(), ...inv }, null, 2), 'application/json')}
      >
        Export JSON {!canUse('jsonExport', plan) && <ProTag />}
      </button>
      {!pro && launched && <ProNote>Save investigations to your account and export them as JSON.</ProNote>}
      {error && <ErrorText>{error}</ErrorText>}
    </div>
  );
}

export function InvestigationView() {
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash, () => '');
  const [saved, setSaved] = useState<string | false>(false);
  const inv = hash ? decodeInvestigation(hash) : null;

  if (!hash) {
    return (
      <div className="space-y-4">
        <Panel>
          <p className="text-[15px] font-semibold text-muted">
            Open a shared investigation link here, or create one: select items on your <Link href="/saved" className="text-accent underline underline-offset-2">saved list</Link> or run a{' '}
            <Link href="/batch" className="text-accent underline underline-offset-2">batch search</Link> and choose “share”.
          </p>
        </Panel>
        <CloudInvestigations />
      </div>
    );
  }
  if (!inv) return <Panel><p className="font-semibold text-danger">This link is damaged or incomplete; ask the sender to copy it again.</p></Panel>;

  return (
    <div className="space-y-4">
      <Panel
        title={inv.t ?? 'Shared investigation'}
        aside={
          <button
            type="button"
            className={btnCls}
            disabled={!!saved}
            onClick={() => {
              let refused = 0;
              for (const i of inv.items) if (upsertSaved({ query: i.q, chainId: i.c && getChain(i.c) ? i.c : null, label: i.l, note: i.n }) === 'limit') refused++;
              setSaved(refused ? `${refused} not saved: your saved list is full` : 'Saved to your list');
            }}
          >
            {saved || 'Save all to my list'}
          </button>
        }
      >
        <p className="mb-4 text-sm font-semibold text-faint">
          Labels and notes were written by whoever shared this link; Web3Lens hasn't checked them. Treat them as claims, not facts.
        </p>
        <InvestigationActions inv={inv} />
        <ul className="divide-y divide-line">
          {inv.items.map((item, i) => {
            const d = detectQuery(item.q);
            const chainId = item.c && getChain(item.c) ? item.c : d?.chains[0];
            const chain = chainId ? getChain(chainId) : undefined;
            const kind = toQueryKind(d);
            const native = chain && d && d.kind !== 'secret' && hasNativeSupport(chain.id, kind) ? nativeResultUrl(chain.id, kind, d.normalized) : null;
            const ex = chain && d && d.kind !== 'secret' ? explorerLinks(chain, d.normalized, d)[0] : undefined;
            const sanctions = d?.kind === 'address' ? checkSanctions(d.normalized) : null;
            return (
              <li key={i} className="grid grid-cols-1 gap-2 py-4 md:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    {chain && <ChainGlyph id={chain.id} name={chain.name} size="xs" />}
                    <span className="font-extrabold">{item.l ?? d?.label ?? 'Item'}</span>
                    {d?.kind === 'secret' && <Badge tone="danger">Secret key: do not use</Badge>}
                    {d?.checksum === 'invalid' && <Badge tone="danger">Bad checksum</Badge>}
                    {sanctions?.listed && <Badge tone="danger">OFAC listed</Badge>}
                  </p>
                  <p className="mt-1 break-all font-mono text-[13px] text-fg/90">{item.q}</p>
                  {item.n && <p className="mt-1.5 whitespace-pre-wrap text-sm font-medium text-muted">{item.n}</p>}
                </div>
                {d?.kind !== 'secret' && (
                  <div className="flex items-start gap-3 text-sm font-bold">
                    <Link href={native ?? searchUrl(item.q, chainId)} className="text-accent hover:underline">
                      Web3Lens
                    </Link>
                    {ex && (
                      <a href={ex.href} target="_blank" rel="noopener noreferrer" className="hover:text-accent">
                        {ex.name}
                      </a>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}
