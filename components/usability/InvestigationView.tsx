'use client';

import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';
import { Badge } from '@/components/results/ResultHeader';
import { ChainGlyph } from '@/components/search/ChainGlyph';
import { btnCls, Panel } from '@/components/tools/ui';
import { getChain } from '@/lib/chains';
import { detectQuery } from '@/lib/detect';
import { explorerLinks, toQueryKind } from '@/lib/explorer';
import { decodeInvestigation } from '@/lib/investigation';
import { hasNativeSupport } from '@/lib/networks';
import { upsertSaved } from '@/lib/saved';
import { nativeResultUrl, searchUrl } from '@/lib/search-url';
import { checkSanctions } from '@/lib/security/sanctions';

const subscribeHash = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

export function InvestigationView() {
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash, () => '');
  const [saved, setSaved] = useState(false);
  const inv = hash ? decodeInvestigation(hash) : null;

  if (!hash) {
    return (
      <Panel>
        <p className="text-[15px] font-semibold text-muted">
          Open a shared investigation link here, or create one: select items on your <Link href="/saved" className="text-accent underline underline-offset-2">saved list</Link> or run a{' '}
          <Link href="/batch" className="text-accent underline underline-offset-2">batch search</Link> and choose “share”.
        </p>
      </Panel>
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
            disabled={saved}
            onClick={() => {
              for (const i of inv.items) upsertSaved({ query: i.q, chainId: i.c && getChain(i.c) ? i.c : null, label: i.l, note: i.n });
              setSaved(true);
            }}
          >
            {saved ? 'Saved to this browser' : 'Save all to my list'}
          </button>
        }
      >
        <p className="mb-4 text-sm font-semibold text-faint">
          Labels and notes were written by whoever shared this link; Web3Lens hasn't checked them. Treat them as claims, not facts.
        </p>
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
