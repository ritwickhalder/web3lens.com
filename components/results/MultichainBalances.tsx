'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChainGlyph } from '@/components/search/ChainGlyph';
import { apiGet } from '@/lib/api-client';
import { formatAmount, formatUsd } from '@/lib/format';
import type { MultichainResult } from '@/lib/lookup-types';

type State = { status: 'loading' } | { status: 'error'; error: string } | { status: 'ok'; data: MultichainResult };

/** The same 0x address on every supported EVM chain. Loads after the page so the page itself stays fast. */
export function MultichainBalances({ address, current }: { address: string; current?: string }) {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    const ctrl = new AbortController();
    apiGet<MultichainResult>('multichain', { q: address }, ctrl.signal)
      .then((data) => setState({ status: 'ok', data }))
      .catch((e: Error) => e.name !== 'AbortError' && setState({ status: 'error', error: e.message }));
    return () => ctrl.abort();
  }, [address]);

  return (
    <section className="min-w-0 rounded-2xl border border-line bg-ink-2 p-5 sm:p-6">
      <h2 className="mb-4 text-lg font-extrabold tracking-tight">Same address on other EVM chains</h2>
      {state.status === 'loading' && <p className="animate-pulse text-sm font-semibold text-muted">Checking 11 chains…</p>}
      {state.status === 'error' && <p className="text-sm font-semibold text-redline">Unavailable: {state.error}</p>}
      {state.status === 'ok' && (
        <>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {state.data.rows.map((row) => {
              const active = row.status === 'ok' && (row.balanceWei !== '0' || (row.nonce ?? 0) > 0 || row.isContract);
              return (
                <li key={row.chain.id}>
                  <Link
                    href={`/address/${row.chain.id}/${address}`}
                    aria-current={row.chain.id === current ? 'page' : undefined}
                    className={`flex items-center gap-3 rounded-xl border p-3 transition-colors hover:border-accent/60 aria-[current=page]:border-accent ${active ? 'border-line-strong bg-ink-3' : 'border-line bg-ink'}`}
                  >
                    <ChainGlyph id={row.chain.id} name={row.chain.name} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-extrabold">{row.chain.name}</span>
                      {row.status === 'ok' ? (
                        <span className="block truncate text-sm font-semibold text-muted tabular-nums">
                          {formatAmount(row.balance, row.chain.symbol, 4)}
                          {row.usd ? <span className="text-faint"> · {formatUsd(row.usd)}</span> : null}
                        </span>
                      ) : (
                        <span className="block truncate text-xs font-semibold text-redline">unavailable: {row.reason}</span>
                      )}
                    </span>
                    {row.status === 'ok' && (
                      <span className="shrink-0 text-right text-xs font-bold text-faint">
                        {row.isContract ? 'code' : `${row.nonce} tx`}
                        {row.stale && <span className="block text-redline">stale</span>}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 border-t border-line pt-3 text-xs font-semibold text-faint">
            Balances from each chain's public RPC; USD estimates from {state.data.priceSource?.name ?? 'no price source (unavailable)'}. &ldquo;tx&rdquo; is
            the number of transactions sent (nonce).
          </p>
        </>
      )}
    </section>
  );
}
