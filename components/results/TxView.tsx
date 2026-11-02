import Link from 'next/link';
import { Badge } from '@/components/results/ResultHeader';
import { Card, Facts, Note, ResultSection } from '@/components/results/ResultSection';
import { formatAmount, formatCount, formatUsd, formatUtc, shortHash, timeAgo } from '@/lib/format';
import type { EvmTxResult, Section, SolanaTxResult, TxResult, UtxoTxResult } from '@/lib/lookup-types';
import { formatUnits } from '@/lib/tools/units';

const mono = 'font-mono text-[13px] font-medium';

function Addr({ chain, address }: { chain: string; address: string | null }) {
  if (!address) return <span className="text-faint">—</span>;
  return (
    <Link href={`/address/${chain}/${address}`} className={`${mono} break-all text-fg/90 hover:text-accent`}>
      {address}
    </Link>
  );
}

function When({ t }: { t: number | null }) {
  if (!t) return <>—</>;
  return (
    <>
      {formatUtc(t)} <span className="text-faint">({timeAgo(t)})</span>
    </>
  );
}

function usd(amount: string, price: Section<number>) {
  return price.status === 'ok' ? <span className="text-faint"> ≈ {formatUsd(Number(amount) * price.data)}</span> : null;
}

function StatusBadge({ status }: { status: 'success' | 'failed' | 'pending' }) {
  return status === 'success' ? <Badge tone="good">Success</Badge> : status === 'failed' ? <Badge tone="danger">Failed</Badge> : <Badge tone="warn">Pending</Badge>;
}

function NotFound({ chain }: { chain: string }) {
  return (
    <Note tone="warn">
      {chain} doesn't know this transaction. It may be on another chain, not broadcast yet, or dropped from the mempool. Try the cross-chain search below.
    </Note>
  );
}

function EvmTx({ r }: { r: EvmTxResult }) {
  const c = r.chain.id;
  return (
    <>
      <ResultSection title="Transaction" section={r.tx}>
        {(t) =>
          !t ? (
            <NotFound chain={r.chain.name} />
          ) : (
            <Facts
              rows={[
                ['Status', <StatusBadge key="s" status={t.status} />],
                ['Block', t.blockNumber === null ? 'pending' : `${formatCount(t.blockNumber)}${t.confirmations !== null ? ` · ${formatCount(t.confirmations)} confirmations` : ''}`],
                ['Time', <When key="w" t={t.timestamp} />],
                ['From', <Addr key="f" chain={c} address={t.from} />],
                [t.to ? 'To' : 'Contract created', <Addr key="t" chain={c} address={t.to ?? t.contractCreated} />],
                [
                  'Value',
                  <>
                    {formatAmount(formatUnits(BigInt(t.valueWei), 18), r.chain.symbol, 18)}
                    {usd(formatUnits(BigInt(t.valueWei), 18), r.priceUsd)}
                  </>,
                ],
                [
                  'Fee',
                  t.feeWei === null ? (
                    'pending'
                  ) : (
                    <>
                      {formatAmount(formatUnits(BigInt(t.feeWei), 18), r.chain.symbol, 9)}
                      {usd(formatUnits(BigInt(t.feeWei), 18), r.priceUsd)}
                      {r.detail.status === 'ok' && r.detail.data.l1Fee ? (
                        <span className="block text-sm text-faint">+ L1 data fee {formatAmount(formatUnits(BigInt(r.detail.data.l1Fee), 18), r.chain.symbol, 9)} (Blockscout)</span>
                      ) : ['optimism', 'base', 'scroll', 'linea', 'arbitrum', 'zksync'].includes(c) ? (
                        <span className="block text-sm text-faint">Execution fee only; rollups also charge an L1 data fee.</span>
                      ) : null}
                    </>
                  ),
                ],
                ['Gas', t.gasUsed === null ? `limit ${formatCount(Number(t.gasLimit))}` : `${formatCount(Number(t.gasUsed))} used of ${formatCount(Number(t.gasLimit))}`],
                ['Gas price', t.effectiveGasPriceWei === null ? '—' : `${formatAmount(formatUnits(BigInt(t.effectiveGasPriceWei), 9), 'gwei', 4)}`],
                ['Nonce · type', `${t.nonce} · type ${t.type}${t.type === 2 ? ' (EIP-1559)' : t.type === 4 ? ' (EIP-7702)' : t.type === 3 ? ' (blob)' : ''}`],
                ['Logs', formatCount(t.logs.length)],
              ]}
            />
          )
        }
      </ResultSection>

      {r.tx.status === 'ok' && r.tx.data && r.tx.data.input !== '0x' && (
        <Card title="Input data">
          {r.decoded.length ? (
            <div className="space-y-4">
              {r.decoded.map((d) => (
                <div key={d.signature} className="space-y-2">
                  <p className="flex flex-wrap items-center gap-2">
                    <code className="break-all font-mono text-sm text-accent">{d.signature}</code>
                    <Badge tone={d.via === 'verified' ? 'good' : 'warn'}>{d.via === 'verified' ? 'verified ABI' : 'guessed from a common signature'}</Badge>
                  </p>
                  {d.params.length > 0 && (
                    <ul className="space-y-1.5">
                      {d.params.map((p, i) => (
                        <li key={i} className="grid grid-cols-1 gap-1 rounded-lg bg-ink px-3 py-2 text-sm sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
                          <span className="font-bold text-muted">
                            {p.name} <span className="font-semibold text-faint">{p.type}</span>
                          </span>
                          <span className={`${mono} break-all`}>{p.value}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
              {r.decoded.length > 1 && <Note tone="warn">Several known functions share this selector; the correct one can't be told apart without the contract's ABI.</Note>}
            </div>
          ) : (
            <p className="text-sm font-semibold text-muted">
              Selector <code className={mono}>{r.tx.data.input.slice(0, 10)}</code> isn't a known signature and the contract has no verified ABI here. Paste the ABI into the{' '}
              <Link href={`/tools/abi-decoder?data=${r.tx.data.input.slice(0, 2000)}`} className="font-bold text-accent">
                calldata decoder
              </Link>
              .
            </p>
          )}
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-bold text-faint">Raw input ({formatCount((r.tx.data.input.length - 2) / 2)} bytes)</summary>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-ink p-3 font-mono text-xs text-muted">{r.tx.data.input}</pre>
          </details>
        </Card>
      )}

      {r.detail.status === 'ok' && r.detail.data.tokenTransfers.length > 0 && (
        <ResultSection title="Token transfers" section={r.detail}>
          {(d) => (
            <ul className="divide-y divide-line">
              {d.tokenTransfers.map((tt, i) => (
                <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                  <span className="font-bold tabular-nums">{tt.amount === null ? (tt.token.type === 'ERC-721' ? '1 NFT' : '—') : formatAmount(tt.amount, null, 6)}</span>
                  <Link href={`/address/${c}/${tt.token.address}`} className="font-bold text-accent">
                    {tt.token.symbol ?? shortHash(tt.token.address)}
                  </Link>
                  <span className="text-faint">from</span>
                  <Link href={`/address/${c}/${tt.from}`} className={`${mono} hover:text-accent`}>
                    {shortHash(tt.from, 6, 4)}
                  </Link>
                  <span className="text-faint">to</span>
                  <Link href={`/address/${c}/${tt.to}`} className={`${mono} hover:text-accent`}>
                    {shortHash(tt.to, 6, 4)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </ResultSection>
      )}
    </>
  );
}

function UtxoTx({ r }: { r: UtxoTxResult }) {
  const sats = (n: number) => formatUnits(BigInt(n), 8);
  return (
    <ResultSection title="Transaction" section={r.tx}>
      {(t) =>
        !t ? (
          <NotFound chain={r.chain.name} />
        ) : (
          <div className="space-y-6">
            <Facts
              rows={[
                ['Status', t.confirmed ? <Badge key="c" tone="good">Confirmed</Badge> : <Badge key="u" tone="warn">Unconfirmed</Badge>],
                ['Block', t.blockHeight === null ? 'in mempool' : `${formatCount(t.blockHeight)}${t.confirmations ? ` · ${formatCount(t.confirmations)} confirmations` : ''}`],
                ['Time', <When key="w" t={t.time} />],
                [
                  'Total output',
                  <>
                    {formatAmount(sats(t.totalOutSat), r.chain.symbol, 8)}
                    {usd(sats(t.totalOutSat), r.priceUsd)}
                  </>,
                ],
                ['Fee', `${formatAmount(sats(t.feeSat), r.chain.symbol, 8)} · ${t.feeRate} sat/vB · ${formatCount(t.vsize)} vB`],
              ]}
            />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {(
                [
                  ['Inputs', t.inputs.map((i) => ({ address: i.address, value: i.valueSat, label: i.coinbase ? 'Coinbase (new coins)' : null }))],
                  ['Outputs', t.outputs.map((o) => ({ address: o.address, value: o.valueSat as number | null, label: o.address ? null : o.type }))],
                ] as const
              ).map(([title, rows]) => (
                <div key={title} className="min-w-0">
                  <h3 className="mb-2 text-sm font-extrabold uppercase tracking-wider text-faint">
                    {title} · {rows.length}
                  </h3>
                  <ul className="divide-y divide-line rounded-lg border border-line">
                    {rows.map((row, i) => (
                      <li key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                        {row.address ? (
                          <Link href={`/address/${r.chain.id}/${row.address}`} className={`${mono} min-w-0 truncate hover:text-accent`} title={row.address}>
                            {row.address}
                          </Link>
                        ) : (
                          <span className="text-faint">{row.label ?? 'unknown'}</span>
                        )}
                        <span className="shrink-0 font-semibold tabular-nums">{row.value === null ? '—' : formatAmount(sats(row.value), null, 8)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )
      }
    </ResultSection>
  );
}

function SolanaTx({ r }: { r: SolanaTxResult }) {
  return (
    <ResultSection title="Transaction" section={r.tx}>
      {(t) =>
        !t ? (
          <NotFound chain="Solana" />
        ) : (
          <div className="space-y-6">
            <Facts
              rows={[
                ['Status', t.failed ? <Badge key="f" tone="danger">Failed</Badge> : <Badge key="s" tone="good">Success</Badge>],
                ['Slot', formatCount(t.slot)],
                ['Time', <When key="w" t={t.time} />],
                ['Fee', `${formatAmount(formatUnits(BigInt(t.feeLamports), 9), 'SOL', 9)}`],
                ['Signer', t.signers.map((s) => <Addr key={s} chain="solana" address={s} />)],
                ['Programs', <span key="p" className="flex flex-col gap-1">{t.programs.map((p) => <span key={p} className={`${mono} break-all`}>{p}</span>)}</span>],
              ]}
            />
            {t.balanceChanges.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-extrabold uppercase tracking-wider text-faint">SOL balance changes</h3>
                <ul className="divide-y divide-line rounded-lg border border-line">
                  {t.balanceChanges.map((b) => (
                    <li key={b.account} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <Link href={`/address/solana/${b.account}`} className={`${mono} min-w-0 truncate hover:text-accent`}>
                        {b.account}
                      </Link>
                      <span className={`shrink-0 font-semibold tabular-nums ${b.deltaLamports < 0 ? 'text-redline' : 'text-accent'}`}>
                        {b.deltaLamports > 0 ? '+' : ''}
                        {formatAmount(formatUnits(BigInt(b.deltaLamports), 9), null, 9)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )
      }
    </ResultSection>
  );
}

export function TxView({ result }: { result: TxResult }) {
  if (result.family === 'evm') return <EvmTx r={result} />;
  if (result.family === 'utxo') return <UtxoTx r={result} />;
  return <SolanaTx r={result} />;
}
