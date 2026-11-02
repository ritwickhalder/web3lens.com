'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChainGlyph } from '@/components/search/ChainGlyph';
import { apiGet } from '@/lib/api-client';
import type { LocateResult } from '@/lib/lookup-types';

type State = { status: 'loading' } | { status: 'error'; error: string } | { status: 'ok'; data: LocateResult };

/** Finds which supported EVM chains know a 0x transaction hash. */
export function TxLocator({ hash }: { hash: string }) {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    const ctrl = new AbortController();
    apiGet<LocateResult>('locate-tx', { q: hash }, ctrl.signal)
      .then((data) => setState({ status: 'ok', data }))
      .catch((e: Error) => e.name !== 'AbortError' && setState({ status: 'error', error: e.message }));
    return () => ctrl.abort();
  }, [hash]);

  const found = state.status === 'ok' ? state.data.rows.filter((r) => r.status === 'found') : [];
  const unavailable = state.status === 'ok' ? state.data.rows.filter((r) => r.status === 'unavailable') : [];

  return (
    <section className="min-w-0 rounded-2xl border border-line bg-ink-2 p-5 sm:p-6">
      <h2 className="mb-4 text-lg font-extrabold tracking-tight">Which chain is it on?</h2>
      {state.status === 'loading' && <p className="animate-pulse text-sm font-semibold text-muted">Asking 11 EVM chains…</p>}
      {state.status === 'error' && <p className="text-sm font-semibold text-redline">Unavailable: {state.error}</p>}
      {state.status === 'ok' && (
        <div className="space-y-3">
          {found.length ? (
            <ul className="flex flex-wrap gap-2">
              {found.map((r) => (
                <li key={r.chain.id}>
                  <Link href={`/tx/${r.chain.id}/${hash}`} className="flex items-center gap-2 rounded-xl border border-accent/60 bg-accent/10 py-2 pl-2 pr-4 text-sm font-extrabold text-accent">
                    <ChainGlyph id={r.chain.id} name={r.chain.name} size="sm" /> Found on {r.chain.name} →
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm font-semibold text-muted">None of the 11 supported EVM chains knows this hash{unavailable.length ? ' (some could not be checked)' : ''}. It may be on another chain: use the explorer links.</p>
          )}
          {unavailable.length > 0 && <p className="text-xs font-semibold text-redline">Couldn't check: {unavailable.map((r) => r.chain.name).join(', ')}.</p>}
        </div>
      )}
    </section>
  );
}
