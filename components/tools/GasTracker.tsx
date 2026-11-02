'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChainGlyph } from '@/components/search/ChainGlyph';
import { Panel } from '@/components/tools/ui';
import { apiGet } from '@/lib/api-client';
import { formatUsd, formatUtc, timeAgo } from '@/lib/format';
import type { GasResult } from '@/lib/lookup-types';
import { EVM_NETWORKS } from '@/lib/networks';

const ACTIONS = [
  { label: 'Transfer', gas: 21000 },
  { label: 'Token transfer', gas: 65000 },
  { label: 'Swap', gas: 180000 },
];
const BTC_VBYTES = 141;
const ROLLUPS = new Set(['base', 'arbitrum', 'optimism', 'linea', 'zksync', 'scroll']);

function gwei(v: string | null | undefined) {
  if (v === null || v === undefined) return '—';
  const n = Number(v);
  if (n === 0) return '0';
  if (n < 0.0001) return '<0.0001';
  return n >= 1 ? n.toFixed(2) : Number(n.toPrecision(3)).toString();
}

/** Live gas on the supported EVM chains plus Bitcoin fee rates, refreshed every 30 s while visible. */
export function GasTracker() {
  const [state, setState] = useState<{ data: GasResult | null; error: string | null }>({ data: null, error: null });

  useEffect(() => {
    let ctrl = new AbortController();
    const load = () => {
      ctrl.abort();
      ctrl = new AbortController();
      apiGet<GasResult>('gas', {}, ctrl.signal)
        .then((data) => setState({ data, error: null }))
        .catch((e: Error) => e.name !== 'AbortError' && setState((s) => ({ data: s.data, error: e.message })));
    };
    load();
    const timer = setInterval(() => document.visibilityState === 'visible' && load(), 30_000);
    return () => {
      clearInterval(timer);
      ctrl.abort();
    };
  }, []);

  const { data, error } = state;
  if (!data) {
    return <Panel>{error ? <p className="font-semibold text-redline">Unavailable: {error}</p> : <p className="animate-pulse font-semibold text-muted">Loading live gas prices…</p>}</Panel>;
  }
  const btc = data.bitcoin;
  const btcPrice = data.prices.bitcoin;

  return (
    <div className="space-y-4">
      {error && <p className="rounded-lg border border-redline/40 bg-redline/10 px-4 py-2.5 text-sm font-semibold text-redline">Refresh failed ({error}); showing data from {timeAgo(data.fetchedAt)}.</p>}
      <Panel title="EVM chains" aside={<span className="text-sm font-semibold text-faint">Updated {formatUtc(data.fetchedAt)} · refreshes every 30 s</span>}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs font-bold uppercase tracking-wider text-faint">
              <tr>
                <th className="py-2 pr-3">Chain</th>
                <th className="py-2 pr-3 text-right">Base fee</th>
                <th className="py-2 pr-3 text-right">Tip</th>
                <th className="py-2 pr-3 text-right">Gas price</th>
                {ACTIONS.map((a) => (
                  <th key={a.label} className="py-2 pr-3 text-right">
                    {a.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.evm.map((row) => {
                const net = EVM_NETWORKS.find((n) => n.id === row.chain.id);
                const price = net?.coingecko ? data.prices[net.coingecko] : undefined;
                const effective = row.status === 'ok' ? (row.baseFeeGwei ? Number(row.baseFeeGwei) + Number(row.priorityFeeGwei ?? 0) : Number(row.gasPriceGwei)) : null;
                return (
                  <tr key={row.chain.id}>
                    <td className="py-2.5 pr-3">
                      <span className="flex items-center gap-2.5 font-bold">
                        <ChainGlyph id={row.chain.id} name={row.chain.name} size="sm" />
                        {row.chain.name}
                        {ROLLUPS.has(row.chain.id) && <span className="text-xs font-semibold text-faint">+ L1 fee</span>}
                        {row.status === 'ok' && row.stale && <span className="text-xs font-bold text-redline">stale</span>}
                      </span>
                    </td>
                    {row.status !== 'ok' ? (
                      <td colSpan={3 + ACTIONS.length} className="py-2.5 text-right font-semibold text-redline">
                        Unavailable: {row.reason}
                      </td>
                    ) : (
                      <>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{gwei(row.baseFeeGwei)}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{gwei(row.priorityFeeGwei)}</td>
                        <td className="py-2.5 pr-3 text-right font-bold tabular-nums">{gwei(row.gasPriceGwei)}</td>
                        {ACTIONS.map((a) => (
                          <td key={a.label} className="py-2.5 pr-3 text-right tabular-nums text-muted">
                            {price !== undefined && effective !== null ? formatUsd(effective * 1e-9 * a.gas * price) || '$0' : '—'}
                          </td>
                        ))}
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs font-semibold text-faint">
          Fees in gwei from each chain's public RPC; dollar costs use CoinGecko prices and typical gas limits (21k, 65k, 180k). Rollups also charge an L1 data fee that isn't
          included. For exact numbers use the <Link href="/tools/gas-calculator" className="text-accent">gas calculator</Link>.
        </p>
      </Panel>
      <Panel title="Bitcoin">
        {btc.status !== 'ok' ? (
          <p className="font-semibold text-redline">Unavailable: {btc.reason}</p>
        ) : (
          <>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  ['Next block', btc.data.fastest],
                  ['~30 minutes', btc.data.halfHour],
                  ['~1 hour', btc.data.hour],
                  ['Economy', btc.data.economy],
                ] as const
              ).map(([label, rate]) => (
                <li key={label} className="rounded-xl border border-line bg-ink p-4">
                  <p className="text-sm font-bold text-faint">{label}</p>
                  <p className="mt-1 text-2xl font-extrabold tabular-nums">
                    {rate} <span className="text-sm font-bold text-muted">sat/vB</span>
                  </p>
                  {btcPrice !== undefined && <p className="text-sm font-semibold text-muted">≈ {formatUsd(((rate * BTC_VBYTES) / 1e8) * btcPrice) || '$0'} for a typical payment</p>}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs font-semibold text-faint">
              Source: {btc.source.name} · fetched {timeAgo(btc.fetchedAt)}
              {btc.stale ? ' · stale' : ''}. A typical payment is one input and two outputs ({BTC_VBYTES} vB).
            </p>
          </>
        )}
      </Panel>
    </div>
  );
}
