'use client';

import Link from 'next/link';
import { useMemo, useState, useSyncExternalStore } from 'react';
import { ProNote } from '@/components/account/ProNote';
import { ChainGlyph } from '@/components/search/ChainGlyph';
import { btnCls, ErrorText, Panel } from '@/components/tools/ui';
import { accountStore, planOfState } from '@/lib/client/account';
import { detectQuery } from '@/lib/detect';
import { canUse, LIMITS } from '@/lib/entitlements';
import { formatAmount, formatUsd, shortHash } from '@/lib/format';
import type { MultichainResult } from '@/lib/lookup-types';
import { savedStore } from '@/lib/saved';

type Row = { address: string; label: string; result: MultichainResult | null; error: string | null };

/**
 * Combined native-coin value of saved EVM addresses across the 11 EVM chains. Uses the batch balances endpoint
 * (counts toward the daily cross-chain lookups). Native coins only: tokens aren't included, and any chain that
 * couldn't be read is listed instead of counted as zero.
 */
export function Portfolio() {
  const account = useSyncExternalStore(accountStore.subscribe, accountStore.getSnapshot, accountStore.getServerSnapshot);
  const saved = useSyncExternalStore(savedStore.subscribe, savedStore.getSnapshot, savedStore.getServerSnapshot);
  const { plan, limits, signedIn, launched } = planOfState(account);
  const pro = canUse('portfolio', plan);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addresses = useMemo(() => {
    const seen = new Set<string>();
    const out: { address: string; label: string }[] = [];
    for (const s of saved) {
      const d = detectQuery(s.query);
      if (d?.format !== 'evm-address' || d.checksum === 'invalid') continue;
      const key = d.normalized.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ address: d.normalized, label: s.label });
    }
    return out;
  }, [saved]);
  const targets = addresses.slice(0, limits.batchBalances);

  async function load() {
    setBusy(true);
    setError(null);
    const out: Row[] = [];
    for (let i = 0; i < targets.length; i += 50) {
      const part = targets.slice(i, i + 50);
      const r = await fetch('/api/batch/balances', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ addresses: part.map((x) => x.address) }) });
      const body = (await r.json().catch(() => null)) as { results?: { address: string; result: MultichainResult | null; error: string | null }[]; error?: string } | null;
      if (!r.ok || !body?.results) {
        setError(body?.error ?? `Balances are unavailable right now (HTTP ${r.status}).`);
        break;
      }
      for (const x of body.results) out.push({ address: x.address, label: part.find((p) => p.address.toLowerCase() === x.address.toLowerCase())?.label ?? '', result: x.result, error: x.error });
    }
    setRows(out);
    setBusy(false);
  }

  const totals = useMemo(() => {
    if (!rows) return null;
    const chains = new Map<string, { id: string; name: string; symbol: string; amount: number; usd: number; unavailable: number; ok: number }>();
    let usd = 0;
    let priceMissing = false;
    let fetchedAt = '';
    let priceSource = '';
    for (const r of rows) {
      if (!r.result) continue;
      if (r.result.fetchedAt > fetchedAt) fetchedAt = r.result.fetchedAt;
      priceSource ||= r.result.priceSource?.name ?? '';
      for (const c of r.result.rows) {
        const entry = chains.get(c.chain.id) ?? { ...c.chain, amount: 0, usd: 0, unavailable: 0, ok: 0 };
        if (c.status !== 'ok') entry.unavailable++;
        else {
          entry.ok++;
          entry.amount += Number(c.balance ?? 0);
          if (c.usd === null || c.usd === undefined) {
            if (Number(c.balance ?? 0) > 0) priceMissing = true;
          } else {
            entry.usd += c.usd;
            usd += c.usd;
          }
        }
        chains.set(c.chain.id, entry);
      }
    }
    return { usd, priceMissing, fetchedAt, priceSource, chains: [...chains.values()].sort((a, b) => b.usd - a.usd) };
  }, [rows]);

  if (!signedIn || !pro) {
    return (
      <Panel title="Portfolio is part of Pro">
        {launched ? (
          <ProNote>See the combined native balance of your saved addresses across 11 EVM chains in one view.</ProNote>
        ) : (
          <p className="text-sm font-medium text-muted">The portfolio view is part of Pro, which opens soon.</p>
        )}
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <Panel
        title="Saved EVM addresses"
        aside={
          <button type="button" className={btnCls} disabled={busy || !targets.length} onClick={() => void load()}>
            {busy ? 'Fetching…' : rows ? 'Refresh' : `Fetch balances (${targets.length})`}
          </button>
        }
      >
        <p className="text-sm font-medium text-muted">
          {addresses.length === 0 ? (
            <>
              No EVM addresses saved yet. Save addresses from result pages or <Link href="/batch" className="text-accent underline underline-offset-2">batch search</Link>.
            </>
          ) : (
            <>
              {addresses.length} saved EVM address{addresses.length === 1 ? '' : 'es'}
              {addresses.length > targets.length ? `, the first ${targets.length} are included` : ''}. Each fetch counts toward your {LIMITS.pro.crossChainPerDay} daily cross-chain lookups. Native coins only; tokens aren't included.
            </>
          )}
        </p>
        {error && <div className="mt-3"><ErrorText>{error}</ErrorText></div>}
      </Panel>

      {totals && rows && (
        <>
          <Panel title="Total">
            <p className="text-4xl font-extrabold tracking-tight">{formatUsd(totals.usd) || '$0'}</p>
            <p className="mt-1 text-sm font-semibold text-muted">
              Native coins across {totals.chains.filter((c) => c.ok).length} EVM chains · prices {totals.priceSource || 'unavailable'} · fetched {totals.fetchedAt ? new Date(totals.fetchedAt).toLocaleString() : '—'}
            </p>
            {totals.priceMissing && <p className="mt-2 text-sm font-semibold text-redline">Some balances have no price, so they aren't in the total.</p>}
          </Panel>
          <Panel title="By chain">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs font-bold uppercase tracking-wider text-faint">
                  <tr>
                    <th className="py-2 pr-3">Chain</th>
                    <th className="py-2 pr-3 text-right">Balance</th>
                    <th className="py-2 text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {totals.chains.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2.5 pr-3">
                        <span className="flex items-center gap-2 font-bold">
                          <ChainGlyph id={c.id} name={c.name} size="xs" /> {c.name}
                        </span>
                        {c.unavailable > 0 && <span className="text-xs font-semibold text-redline">{c.unavailable} address{c.unavailable === 1 ? '' : 'es'} unavailable</span>}
                      </td>
                      <td className="py-2.5 pr-3 text-right font-semibold">{c.ok ? formatAmount(c.amount.toFixed(8), c.symbol, 6) : <span className="text-redline">Unavailable</span>}</td>
                      <td className="py-2.5 text-right font-bold">{c.ok ? formatUsd(c.usd) || '—' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel title="By address">
            <ul className="divide-y divide-line">
              {rows.map((r) => {
                const usd = r.result?.rows.reduce((n, x) => n + (x.usd ?? 0), 0) ?? 0;
                const active = r.result?.rows.filter((x) => x.status === 'ok' && (x.balanceWei !== '0' || (x.nonce ?? 0) > 0)).length ?? 0;
                return (
                  <li key={r.address} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="min-w-0">
                      <Link href={`/address/ethereum/${r.address}`} className="block font-bold hover:text-accent">
                        {r.label || shortHash(r.address, 10, 8)}
                      </Link>
                      <span className="font-mono text-[13px] text-muted">{shortHash(r.address, 10, 8)}</span>
                    </span>
                    <span className="text-right text-sm">
                      {r.result ? (
                        <>
                          <span className="block font-bold">{formatUsd(usd) || '$0'}</span>
                          <span className="font-semibold text-faint">{active} chains active</span>
                        </>
                      ) : (
                        <span className="font-semibold text-redline">{r.error ?? 'Unavailable'}</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </>
      )}
    </div>
  );
}
