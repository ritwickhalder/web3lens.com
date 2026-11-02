import Link from 'next/link';
import { Badge } from '@/components/results/ResultHeader';
import { Facts, Note, ResultSection } from '@/components/results/ResultSection';
import { formatAmount, formatCount, formatUsd, formatUtc, shortHash, timeAgo } from '@/lib/format';
import type { AddressResult, EvmAddressResult, Section, SolanaAddressResult, UtxoAddressResult } from '@/lib/lookup-types';
import { formatUnits } from '@/lib/tools/units';

const mono = 'font-mono text-[13px] font-medium';

function AddrLink({ chain, address, self }: { chain: string; address: string | null; self?: string }) {
  if (!address) return <span className="text-faint">—</span>;
  if (self && address.toLowerCase() === self.toLowerCase()) return <span className={`${mono} text-muted`}>this address</span>;
  return (
    <Link href={`/address/${chain}/${address}`} className={`${mono} text-fg/90 hover:text-accent`} title={address}>
      {shortHash(address, 6, 4)}
    </Link>
  );
}

function TxLink({ chain, hash }: { chain: string; hash: string }) {
  return (
    <Link href={`/tx/${chain}/${hash}`} className={`${mono} text-accent hover:underline`} title={hash}>
      {shortHash(hash, 10, 6)}
    </Link>
  );
}

function UsdLine({ amount, price }: { amount: string; price: Section<number> }) {
  if (price.status !== 'ok') return <p className="mt-1 text-sm font-semibold text-faint">USD value unavailable ({price.reason})</p>;
  return (
    <p className="mt-1 text-sm font-semibold text-muted">
      ≈ {formatUsd(Number(amount) * price.data)} <span className="text-faint">at {formatUsd(price.data)} (CoinGecko{price.stale ? ', stale' : ''})</span>
    </p>
  );
}

function Balance({ amount, symbol, price }: { amount: string; symbol: string; price: Section<number> }) {
  return (
    <div>
      <p className="text-3xl font-extrabold tracking-tight sm:text-4xl">{formatAmount(amount, symbol, 8)}</p>
      <UsdLine amount={amount} price={price} />
    </div>
  );
}

function EvmView({ r }: { r: EvmAddressResult }) {
  const c = r.chain.id;
  return (
    <>
      <ResultSection title="Balance" section={r.account}>
        {(a) => (
          <div className="space-y-5">
            <Balance amount={a.balance} symbol={r.chain.symbol} price={r.priceUsd} />
            <Facts
              rows={[
                [
                  'Account type',
                  a.delegatedTo ? (
                    <>
                      Account with EIP-7702 delegation to <AddrLink chain={c} address={a.delegatedTo} />
                    </>
                  ) : a.isContract ? (
                    `Contract (${formatCount(a.codeSize)} bytes of code)`
                  ) : (
                    'Externally owned account (no code)'
                  ),
                ],
                ['Nonce (sent txs)', formatCount(a.nonce)],
                ['At block', formatCount(a.block)],
                ...(r.ensName.status === 'ok' && r.ensName.data ? ([['ENS name', r.ensName.data]] as [string, React.ReactNode][]) : []),
                ...(r.resolvedFrom ? ([['Resolved from', `${r.resolvedFrom} (on-chain ENS)`]] as [string, React.ReactNode][]) : []),
              ]}
            />
          </div>
        )}
      </ResultSection>

      <ResultSection
        title="Token holdings"
        section={r.tokens}
        aside={r.tokens.status === 'ok' ? <span className="text-sm font-bold text-faint">ERC-20 · {r.tokens.data.items.length}{r.tokens.data.more ? '+' : ''}</span> : null}
      >
        {(t) => {
          const shown = t.items.filter((i) => !i.flagged);
          const flagged = t.items.filter((i) => i.flagged);
          if (!t.items.length) return <p className="text-sm font-semibold text-muted">No ERC-20 tokens held.</p>;
          return (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="text-xs font-bold uppercase tracking-wider text-faint">
                    <tr>
                      <th className="py-2 pr-3">Token</th>
                      <th className="py-2 pr-3 text-right">Balance</th>
                      <th className="py-2 text-right">Value (approx.)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {shown.slice(0, 50).map((tk) => (
                      <tr key={tk.contract}>
                        <td className="py-2 pr-3">
                          <Link href={`/address/${c}/${tk.contract}`} className="font-bold text-fg hover:text-accent">
                            {tk.symbol || shortHash(tk.contract)}
                          </Link>
                          <span className="ml-2 text-faint">{tk.name}</span>
                        </td>
                        <td className="py-2 pr-3 text-right font-semibold tabular-nums">{tk.balance === null ? tk.balanceRaw : formatAmount(tk.balance, null, 4)}</td>
                        <td className="py-2 text-right font-semibold text-muted tabular-nums">
                          {tk.priceUsd !== null && tk.balance !== null ? formatUsd(Number(tk.balance) * tk.priceUsd) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {flagged.length > 0 && (
                <details className="rounded-lg border border-redline/40 px-4 py-2">
                  <summary className="cursor-pointer text-sm font-bold text-redline">
                    {flagged.length} token{flagged.length > 1 ? 's' : ''} flagged by Blockscout as spam or scam (hidden)
                  </summary>
                  <ul className="mt-2 space-y-1 text-sm text-muted">
                    {flagged.map((tk) => (
                      <li key={tk.contract} className="break-all">
                        {tk.symbol ?? '?'} · <span className={mono}>{tk.contract}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs font-semibold text-faint">Don't interact with tokens you didn't expect to receive; many are phishing lures.</p>
                </details>
              )}
              <p className="text-xs font-semibold text-faint">Values use Blockscout's token prices where it has one; they are estimates, not quotes.</p>
            </div>
          );
        }}
      </ResultSection>

      <ResultSection title="Activity" section={r.activity}>
        {(a) => (
          <div className="space-y-4">
            <Facts
              rows={[
                ['Transactions', formatCount(a.txCount)],
                ['Token transfers', formatCount(a.transfers)],
              ]}
            />
            {a.recent.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="text-xs font-bold uppercase tracking-wider text-faint">
                    <tr>
                      <th className="py-2 pr-3">Transaction</th>
                      <th className="py-2 pr-3">Method</th>
                      <th className="py-2 pr-3">From → To</th>
                      <th className="py-2 pr-3 text-right">Value</th>
                      <th className="py-2 text-right">When</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {a.recent.map((t) => (
                      <tr key={t.hash}>
                        <td className="py-2 pr-3">
                          <TxLink chain={c} hash={t.hash} />
                          {t.status === 'failed' && <span className="ml-2 text-xs font-bold text-danger">failed</span>}
                        </td>
                        <td className="max-w-[10rem] truncate py-2 pr-3 font-semibold text-muted">{t.method ?? '—'}</td>
                        <td className="py-2 pr-3">
                          <AddrLink chain={c} address={t.from} self={r.address} /> → <AddrLink chain={c} address={t.to} self={r.address} />
                        </td>
                        <td className="py-2 pr-3 text-right font-semibold tabular-nums">{formatAmount(formatUnits(BigInt(t.valueWei), 18), r.chain.symbol, 4)}</td>
                        <td className="py-2 text-right text-faint" title={formatUtc(t.timestamp)}>
                          {t.timestamp ? timeAgo(t.timestamp) : t.status === 'pending' ? 'pending' : 'just now'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm font-semibold text-muted">No transactions found.</p>
            )}
          </div>
        )}
      </ResultSection>

      <ResultSection title="Labels and contract" section={r.info}>
        {(i) => (
          <div className="space-y-4">
            {(i.isScam || (i.reputation && i.reputation !== 'ok')) && <Note tone="danger">Blockscout flags this address ({i.isScam ? 'scam' : i.reputation}).</Note>}
            <Facts
              rows={[
                ['Name', i.name ?? '—'],
                ['Public tags', i.tags.length ? <span className="flex flex-wrap gap-1.5">{i.tags.map((t) => <Badge key={t}>{t}</Badge>)}</span> : '—'],
                ...(i.isContract
                  ? ([
                      ['Source verified', i.isVerified ? 'Yes (Blockscout)' : 'No verified source'],
                      ['Proxy', i.proxyType ?? 'Not a known proxy pattern'],
                      [
                        'Implementation',
                        i.implementations.length
                          ? i.implementations.map((im) => (
                              <span key={im.address} className="mr-3 inline-block">
                                <AddrLink chain={c} address={im.address} /> {im.name && <span className="text-faint">{im.name}</span>}
                              </span>
                            ))
                          : '—',
                      ],
                      ['Creator', i.creator ? <AddrLink chain={c} address={i.creator} /> : '—'],
                      ['Created in', i.creationTx ? <TxLink chain={c} hash={i.creationTx} /> : '—'],
                    ] as [string, React.ReactNode][])
                  : []),
                ...(i.token ? ([['Token', `${i.token.name ?? '?'} (${i.token.symbol ?? '?'}) · ${i.token.type}${i.token.holders ? ` · ${Number(i.token.holders).toLocaleString('en-US')} holders` : ''}`]] as [string, React.ReactNode][]) : []),
              ]}
            />
          </div>
        )}
      </ResultSection>
    </>
  );
}

function UtxoView({ r }: { r: UtxoAddressResult }) {
  const sats = (n: number) => formatUnits(BigInt(n), 8);
  return (
    <>
      <ResultSection title="Balance" section={r.account}>
        {(a) => (
          <div className="space-y-5">
            <Balance amount={a.balance} symbol={r.chain.symbol} price={r.priceUsd} />
            {a.mempoolTxCount > 0 && (
              <Note tone="warn">
                {a.mempoolTxCount} unconfirmed transaction{a.mempoolTxCount > 1 ? 's' : ''} pending ({a.mempoolDeltaSat >= 0 ? '+' : ''}
                {formatAmount(sats(a.mempoolDeltaSat), r.chain.symbol, 8)}), not included above.
              </Note>
            )}
            <Facts
              rows={[
                ['Total received', formatAmount(sats(a.receivedSat), r.chain.symbol, 8)],
                ['Total sent', formatAmount(sats(a.sentSat), r.chain.symbol, 8)],
                ['Transactions', formatCount(a.txCount)],
              ]}
            />
          </div>
        )}
      </ResultSection>
      <ResultSection title="Recent transactions" section={r.recent}>
        {(list) =>
          list.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="text-xs font-bold uppercase tracking-wider text-faint">
                  <tr>
                    <th className="py-2 pr-3">Transaction</th>
                    <th className="py-2 pr-3 text-right">Effect on this address</th>
                    <th className="py-2 text-right">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {list.map((t) => (
                    <tr key={t.txid}>
                      <td className="py-2 pr-3">
                        <TxLink chain={r.chain.id} hash={t.txid} />
                        {!t.confirmed && <span className="ml-2 text-xs font-bold text-redline">unconfirmed</span>}
                      </td>
                      <td className={`py-2 pr-3 text-right font-semibold tabular-nums ${t.netSat !== null && t.netSat < 0 ? 'text-redline' : 'text-accent'}`}>
                        {t.netSat === null ? '—' : `${t.netSat > 0 ? '+' : ''}${formatAmount(sats(t.netSat), r.chain.symbol, 8)}`}
                      </td>
                      <td className="py-2 text-right text-faint" title={formatUtc(t.time)}>
                        {t.time ? timeAgo(t.time) : 'pending'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm font-semibold text-muted">No transactions found.</p>
          )
        }
      </ResultSection>
    </>
  );
}

function SolanaView({ r }: { r: SolanaAddressResult }) {
  return (
    <>
      <ResultSection title="Balance" section={r.account}>
        {(a) => (
          <div className="space-y-5">
            <Balance amount={a.balance} symbol="SOL" price={r.priceUsd} />
            <Facts
              rows={[
                ['Account', a.exists ? (a.executable ? 'Executable program' : 'Account') : 'Not found on-chain (never funded, or closed)'],
                ['Owner program', a.owner ? <span className={`${mono} break-all`}>{a.owner}</span> : '—'],
                ['Data size', a.space === null ? '—' : `${formatCount(a.space)} bytes`],
              ]}
            />
          </div>
        )}
      </ResultSection>
      <ResultSection title="SPL token holdings" section={r.tokens}>
        {(t) => (
          <div className="space-y-3">
            {t.items.length ? (
              <ul className="divide-y divide-line">
                {t.items.slice(0, 50).map((h) => (
                  <li key={`${h.mint}-${h.program}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <Link href={`/address/solana/${h.mint}`} className={`${mono} min-w-0 truncate text-fg/90 hover:text-accent`} title={h.mint}>
                      {shortHash(h.mint, 8, 6)}
                    </Link>
                    <span className="font-semibold tabular-nums">{formatAmount(h.amount, null, 4)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm font-semibold text-muted">No SPL token balances.</p>
            )}
            <p className="text-xs font-semibold text-faint">
              Mints are shown by address: Web3Lens doesn't use an unverified token list for names.{t.partial ? ' Token-2022 balances could not be read from the public RPC.' : ''}
            </p>
          </div>
        )}
      </ResultSection>
      <ResultSection title="Recent signatures" section={r.recent}>
        {(list) =>
          list.length ? (
            <ul className="divide-y divide-line">
              {list.map((s) => (
                <li key={s.signature} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span>
                    <TxLink chain="solana" hash={s.signature} />
                    {s.failed && <span className="ml-2 text-xs font-bold text-danger">failed</span>}
                  </span>
                  <span className="text-faint" title={formatUtc(s.time)}>
                    {timeAgo(s.time)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm font-semibold text-muted">No transactions found.</p>
          )
        }
      </ResultSection>
    </>
  );
}

export function AddressView({ result }: { result: AddressResult }) {
  if (result.family === 'evm') return <EvmView r={result} />;
  if (result.family === 'utxo') return <UtxoView r={result} />;
  return <SolanaView r={result} />;
}
