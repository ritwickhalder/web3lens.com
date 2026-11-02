'use client';

import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';
import { Badge } from '@/components/results/ResultHeader';
import { btnCls, ghostBtnCls, Panel, textareaCls } from '@/components/tools/ui';
import { apiGet } from '@/lib/api-client';
import { parseBatch, type BatchRow, BATCH_MAX } from '@/lib/batch';
import { getChain } from '@/lib/chains';
import { downloadText, toCsv } from '@/lib/csv';
import { explorerLinks, toQueryKind } from '@/lib/explorer';
import { formatUsd, shortHash } from '@/lib/format';
import { investigationUrl } from '@/lib/investigation';
import type { MultichainResult } from '@/lib/lookup-types';
import { hasNativeSupport } from '@/lib/networks';
import { labelFor, savedStore, upsertSaved } from '@/lib/saved';
import { nativeResultUrl, searchUrl } from '@/lib/search-url';

type Balance = { status: 'loading' } | { status: 'error'; error: string } | { status: 'ok'; active: number; usd: number; unavailable: number };

function resultHref(row: BatchRow): string {
  const d = row.detection!;
  const chain = d.chains[0];
  const kind = toQueryKind(d);
  if (chain && d.chains.length === 1 && hasNativeSupport(chain, kind) && d.checksum !== 'invalid') return nativeResultUrl(chain, kind, d.normalized)!;
  return searchUrl(d.normalized);
}

export function BatchSearch() {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<{ rows: BatchRow[]; truncated: number } | null>(null);
  const [balances, setBalances] = useState<Record<string, Balance>>({});
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const saved = useSyncExternalStore(savedStore.subscribe, savedStore.getSnapshot, savedStore.getServerSnapshot);

  const rows = parsed?.rows ?? [];
  const evm = rows.filter((r) => r.detection?.format === 'evm-address' && r.detection.checksum !== 'invalid');

  async function fetchBalances() {
    setRunning(true);
    const queue = [...evm];
    const worker = async () => {
      while (queue.length) {
        const row = queue.shift()!;
        const q = row.detection!.normalized;
        setBalances((b) => ({ ...b, [q]: { status: 'loading' } }));
        try {
          const r = await apiGet<MultichainResult>('multichain', { q });
          const ok = r.rows.filter((x) => x.status === 'ok');
          setBalances((b) => ({
            ...b,
            [q]: {
              status: 'ok',
              active: ok.filter((x) => x.balanceWei !== '0' || (x.nonce ?? 0) > 0).length,
              usd: ok.reduce((n, x) => n + (x.usd ?? 0), 0),
              unavailable: r.rows.length - ok.length,
            },
          }));
        } catch (e) {
          setBalances((b) => ({ ...b, [q]: { status: 'error', error: (e as Error).message } }));
        }
      }
    };
    await Promise.all([worker(), worker()]);
    setRunning(false);
  }

  function exportCsv() {
    const header = ['input', 'normalized', 'type', 'checksum', 'chains', 'ofac_listed', 'label', 'evm_chains_active', 'evm_native_usd_approx'];
    const data = rows.map((r) => {
      const d = r.detection;
      const b = d ? balances[d.normalized] : undefined;
      return [
        r.input,
        d?.normalized ?? '',
        d?.label ?? 'unrecognised',
        d?.checksum ?? '',
        d?.chains.join(' ') ?? '',
        r.sanctions ? (r.sanctions.listed ? 'yes' : 'no') : '',
        d ? (labelFor(saved, d.normalized, null)?.label ?? '') : '',
        b?.status === 'ok' ? b.active : '',
        b?.status === 'ok' ? b.usd.toFixed(2) : '',
      ];
    });
    downloadText(`web3lens-batch-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(header, data));
  }

  async function share() {
    const items = rows.filter((r) => r.detection && r.detection.kind !== 'secret').map((r) => ({ q: r.detection!.normalized, l: labelFor(saved, r.detection!.normalized, null)?.label }));
    try {
      const url = investigationUrl({ v: 1, t: `Batch of ${items.length}`, items }, window.location.origin);
      await navigator.clipboard.writeText(url);
      setNotice('Share link copied. The list is inside the link itself; anyone with it can read it.');
    } catch (e) {
      setNotice((e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <Panel>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setParsed(parseBatch(text));
            setBalances({});
            setNotice(null);
          }}
        >
          <label htmlFor="batch-input" className="mb-1.5 block text-sm font-bold text-muted">
            Addresses, hashes or names: one per line, or separated by commas or spaces (up to {BATCH_MAX})
          </label>
          <textarea id="batch-input" className={`${textareaCls} min-h-44`} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} placeholder={'0x…\nbc1…\nvitalik.eth'} />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="submit" className={btnCls}>
              Check all
            </button>
            {rows.length > 0 && (
              <>
                {evm.length > 0 && (
                  <button type="button" className={ghostBtnCls} onClick={fetchBalances} disabled={running}>
                    {running ? 'Fetching…' : `Fetch EVM balances (${evm.length})`}
                  </button>
                )}
                <button type="button" className={ghostBtnCls} onClick={exportCsv}>
                  Export CSV
                </button>
                <button
                  type="button"
                  className={ghostBtnCls}
                  onClick={() => {
                    for (const r of rows) if (r.detection && r.detection.kind !== 'secret') upsertSaved({ query: r.detection.normalized, chainId: null });
                    setNotice(`Saved ${rows.filter((r) => r.detection && r.detection.kind !== 'secret').length} items to this browser.`);
                  }}
                >
                  Save all
                </button>
                <button type="button" className={ghostBtnCls} onClick={share}>
                  Copy share link
                </button>
              </>
            )}
          </div>
          {notice && <p className="mt-3 text-sm font-semibold text-accent">{notice}</p>}
          {parsed && parsed.truncated > 0 && <p className="mt-3 text-sm font-semibold text-redline">{parsed.truncated} more were left out (limit {BATCH_MAX}).</p>}
        </form>
      </Panel>

      {rows.length > 0 && (
        <Panel title={`${rows.length} checked`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs font-bold uppercase tracking-wider text-faint">
                <tr>
                  <th className="py-2 pr-3">Value</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Checks</th>
                  <th className="py-2 pr-3">EVM balances</th>
                  <th className="py-2 text-right">Open</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => {
                  const d = r.detection;
                  const label = d ? labelFor(saved, d.normalized, null) : undefined;
                  const b = d ? balances[d.normalized] : undefined;
                  const chain = d?.chains[0] ? getChain(d.chains[0]) : undefined;
                  const link = d && chain && d.kind !== 'secret' ? explorerLinks(chain, d.normalized, d)[0] : undefined;
                  return (
                    <tr key={r.input} className="align-top">
                      <td className="py-2.5 pr-3">
                        <span className="block font-mono text-[13px]" title={d?.normalized ?? r.input}>
                          {shortHash(d?.normalized ?? r.input, 10, 8)}
                        </span>
                        {label?.label && <span className="text-xs font-bold text-accent">{label.label}</span>}
                      </td>
                      <td className="py-2.5 pr-3 font-semibold">
                        {d ? d.label : <span className="text-faint">Not recognised</span>}
                        {r.alternatives.length > 0 && <span className="block text-xs text-faint">or {r.alternatives.map((a) => a.label).join(', ')}</span>}
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className="flex flex-wrap gap-1">
                          {d?.kind === 'secret' && <Badge tone="danger">Secret: never share</Badge>}
                          {d?.checksum === 'valid' && <Badge tone="good">Checksum ok</Badge>}
                          {d?.checksum === 'invalid' && <Badge tone="danger">Bad checksum</Badge>}
                          {r.sanctions?.listed && <Badge tone="danger">OFAC listed</Badge>}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-muted">
                        {!b ? (
                          d?.format === 'evm-address' ? '—' : ''
                        ) : b.status === 'loading' ? (
                          <span className="animate-pulse">checking…</span>
                        ) : b.status === 'error' ? (
                          <span className="text-redline">{b.error}</span>
                        ) : (
                          <>
                            {b.active} of 11 chains active · {formatUsd(b.usd) || '$0'}
                            {b.unavailable > 0 && <span className="block text-xs text-redline">{b.unavailable} chains unavailable</span>}
                          </>
                        )}
                      </td>
                      <td className="py-2.5 text-right">
                        {d && d.kind !== 'secret' && (
                          <span className="flex justify-end gap-3 font-bold">
                            <Link href={resultHref(r)} className="text-accent hover:underline">
                              Web3Lens
                            </Link>
                            {link && (
                              <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-fg/80 hover:text-accent">
                                {link.name}
                              </a>
                            )}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs font-semibold text-faint">
            Detection, checksums and the OFAC snapshot run in your browser. EVM balances are fetched only when you ask, from each chain's public RPC via Web3Lens; USD values are
            CoinGecko estimates.
          </p>
        </Panel>
      )}
    </div>
  );
}
