'use client';

import { ShieldWarning, ShieldCheck, Warning } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api-client';
import { formatAmount, formatUtc, shortHash } from '@/lib/format';
import type { ApprovalsResult, SecurityReport, Section } from '@/lib/lookup-types';

type Load<T> = { status: 'loading' } | { status: 'error'; error: string } | { status: 'ok'; data: T };

const mono = 'font-mono text-[13px] font-medium';

function useApi<T>(path: string, params: Record<string, string>, enabled = true): Load<T> {
  const [state, setState] = useState<Load<T>>({ status: 'loading' });
  const key = JSON.stringify(params);
  useEffect(() => {
    if (!enabled) return;
    const ctrl = new AbortController();
    apiGet<T>(path, JSON.parse(key), ctrl.signal)
      .then((data) => setState({ status: 'ok', data }))
      .catch((e: Error) => e.name !== 'AbortError' && setState({ status: 'error', error: e.message }));
    return () => ctrl.abort();
  }, [path, key, enabled]);
  return state;
}

function Row({ label, children, tone = 'neutral' }: { label: string; children: React.ReactNode; tone?: 'neutral' | 'danger' | 'warn' }) {
  return (
    <li className="py-3">
      <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-faint">{label}</p>
      <div className={`mt-1 text-sm font-semibold ${tone === 'danger' ? 'text-danger' : tone === 'warn' ? 'text-redline' : 'text-fg/90'}`}>{children}</div>
    </li>
  );
}

function sec<T>(s: Section<T>, render: (d: T) => React.ReactNode) {
  if (s.status !== 'ok') return <span className="text-faint">Unavailable: {s.reason}</span>;
  return (
    <>
      {render(s.data)}
      {s.stale && <span className="ml-1 text-xs text-redline">(stale)</span>}
    </>
  );
}

function AddressLink({ chain, a }: { chain: string; a: string }) {
  return (
    <Link href={`/address/${chain}/${a}`} className={`${mono} hover:text-accent`} title={a}>
      {shortHash(a, 6, 4)}
    </Link>
  );
}

function Approvals({ chainId, address }: { chainId: string; address: string }) {
  const state = useApi<ApprovalsResult>('approvals', { chain: chainId, q: address });
  if (state.status === 'loading') return <p className="animate-pulse py-2 text-sm font-semibold text-muted">Scanning approval events and reading current allowances…</p>;
  if (state.status === 'error') return <p className="py-2 text-sm font-semibold text-redline">Unavailable: {state.error}</p>;
  const { approvals, revokeUrl } = state.data;
  return (
    <div className="space-y-3 py-2">
      {approvals.status !== 'ok' ? (
        <p className="text-sm font-semibold text-faint">Unavailable: {approvals.reason}</p>
      ) : (
        <>
          {approvals.data.erc20.length === 0 && approvals.data.nft.length === 0 ? (
            <p className="text-sm font-semibold text-muted">No active token approvals found in the events scanned.</p>
          ) : (
            <ul className="space-y-2">
              {approvals.data.erc20.map((a) => (
                <li key={`${a.token}-${a.spender}`} className="rounded-lg border border-line bg-ink p-3 text-sm">
                  <p className="font-bold">
                    <AddressLink chain={chainId} a={a.token} /> <span className="text-fg">{a.symbol ?? 'token'}</span>:{' '}
                    {a.unlimited ? <span className="text-redline">unlimited</span> : a.allowance !== null ? formatAmount(a.allowance, a.symbol, 4) : a.allowanceRaw}
                  </p>
                  <p className="mt-1 text-faint">
                    to {a.spenderLabel ? <span className="text-fg/90">{a.spenderLabel}</span> : <AddressLink chain={chainId} a={a.spender} />}
                    {a.spenderIsContract === false && <span className="ml-1 font-bold text-danger">· a wallet, not a contract (common in phishing)</span>}
                  </p>
                </li>
              ))}
              {approvals.data.nft.map((n) => (
                <li key={`${n.collection}-${n.operator}`} className="rounded-lg border border-line bg-ink p-3 text-sm">
                  <p className="font-bold">
                    NFT collection <AddressLink chain={chainId} a={n.collection} />: <span className="text-redline">all items</span>
                  </p>
                  <p className="mt-1 text-faint">
                    operator {n.operatorLabel ?? <AddressLink chain={chainId} a={n.operator} />}
                    {n.operatorIsContract === false && <span className="ml-1 font-bold text-danger">· a wallet, not a contract</span>}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs font-semibold text-faint">
            Allowances read live from the chain for approvals found in {approvals.data.logsScanned} event logs
            {approvals.data.capped ? ' (the log search hit its limit, so older approvals may be missing)' : ''}
            {approvals.data.nftChecked ? '' : '; NFT approvals could not be checked this time'}. Fetched {formatUtc(approvals.fetchedAt)}.
          </p>
        </>
      )}
      <a href={revokeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex text-sm font-bold text-accent hover:underline">
        Review or revoke on revoke.cash →
      </a>
    </div>
  );
}

/** Risk signals for an address on a natively supported chain. Never says "safe". */
export function SecurityPanel({ chainId, address }: { chainId: string; address: string }) {
  const state = useApi<SecurityReport>('security', { chain: chainId, q: address }, !/\.eth$/i.test(address));
  const [showApprovals, setShowApprovals] = useState(false);
  const isEvm = /^0x[0-9a-f]{40}$/i.test(address);

  return (
    <section className="min-w-0 rounded-2xl border border-line bg-ink-2 p-5 sm:p-6">
      <h2 className="mb-3 text-lg font-extrabold tracking-tight">Risk checks</h2>
      {state.status === 'loading' && <p className="animate-pulse text-sm font-semibold text-muted">Checking sanctions lists, reports and contract details…</p>}
      {state.status === 'error' && <p className="text-sm font-semibold text-redline">Unavailable: {state.error}</p>}
      {state.status === 'ok' && (
        <>
          {state.data.flagCount > 0 ? (
            <p className="flex items-start gap-2.5 rounded-lg border border-danger/50 bg-danger/10 px-4 py-3 text-sm font-bold text-danger">
              <ShieldWarning aria-hidden weight="duotone" className="size-6 shrink-0" />
              {state.data.flagCount} risk signal{state.data.flagCount > 1 ? 's' : ''} found. Do not send funds or sign anything for this address without checking.
            </p>
          ) : (
            <p className="flex items-start gap-2.5 rounded-lg border border-line bg-ink px-4 py-3 text-sm font-semibold text-muted">
              <ShieldCheck aria-hidden weight="duotone" className="size-6 shrink-0 text-faint" />
              No reports found in the sources below. That does not mean it is safe: most scams are never reported, and new ones appear daily.
            </p>
          )}
          <ul className="mt-2 divide-y divide-line">
            <Row label={`OFAC sanctions (snapshot ${formatUtc(state.data.sanctions.snapshotAt).slice(0, 10)})`} tone={state.data.sanctions.listed ? 'danger' : 'neutral'}>
              {state.data.sanctions.listed ? `Listed on the OFAC SDN list (${state.data.sanctions.lists.join(', ')})` : 'Not on the SDN list snapshot'}
            </Row>
            <Row
              label="Blockscout reputation"
              tone={state.data.reputation.status === 'ok' && (state.data.reputation.data.isScam || (state.data.reputation.data.reputation ?? 'ok') !== 'ok') ? 'danger' : 'neutral'}
            >
              {sec(state.data.reputation, (r) => (r.isScam ? 'Marked as a scam' : r.reputation && r.reputation !== 'ok' ? `Reputation: ${r.reputation}` : 'Not flagged'))}
            </Row>
            <Row label="GoPlus reports" tone={state.data.goplus.status === 'ok' && state.data.goplus.data.flags.length ? 'danger' : 'neutral'}>
              {sec(state.data.goplus, (g) => (g.flags.length ? `${g.flags.join(', ')}${g.dataSource ? ` (reported by ${g.dataSource})` : ''}` : 'No reports'))}
            </Row>
            {state.data.contract && (
              <>
                <Row
                  label="Source code"
                  tone={
                    state.data.contract.verification.blockscout.status === 'ok' &&
                    !state.data.contract.verification.blockscout.data.verified &&
                    state.data.contract.verification.sourcify.status === 'ok' &&
                    !state.data.contract.verification.sourcify.data.match
                      ? 'warn'
                      : 'neutral'
                  }
                >
                  <span className="block">Blockscout: {sec(state.data.contract.verification.blockscout, (b) => (b.verified ? `verified${b.name ? ` (${b.name})` : ''}` : 'not verified'))}</span>
                  <span className="block">Sourcify: {sec(state.data.contract.verification.sourcify, (s) => (s.match ? `${s.match.replace('_', ' ')}` : 'not verified'))}</span>
                </Row>
                <Row label="Upgradeability" tone={state.data.contract.proxy.status === 'ok' && state.data.contract.proxy.data.implementation ? 'warn' : 'neutral'}>
                  {sec(state.data.contract.proxy, (p) =>
                    p.implementation ? (
                      <>
                        Upgradeable proxy{p.detectedBy ? ` (detected by ${p.detectedBy})` : ''}: implementation <AddressLink chain={chainId} a={p.implementation} />
                        {p.admin && (
                          <>
                            , admin <AddressLink chain={chainId} a={p.admin} />
                          </>
                        )}
                        . The code can be changed by its admin.
                      </>
                    ) : (
                      'No EIP-1967 proxy slots set'
                    ),
                  )}
                </Row>
                <Row label="Owner">
                  {sec(state.data.contract.owner, (o) =>
                    o === null ? (
                      'No owner() function'
                    ) : o.renounced ? (
                      'Ownership renounced (owner is the zero address)'
                    ) : (
                      <>
                        <AddressLink chain={chainId} a={o.owner!} /> ({o.ownerIsContract === null ? 'unknown type' : o.ownerIsContract ? 'a contract, e.g. a multisig or timelock' : 'a single wallet'})
                      </>
                    ),
                  )}
                </Row>
                {state.data.contract.privileged && state.data.contract.privileged.length > 0 && (
                  <Row label="Privileged functions in the verified ABI" tone="warn">
                    <details>
                      <summary className="cursor-pointer">{state.data.contract.privileged.length} admin-style functions (mint, pause, blacklist, upgrade…)</summary>
                      <ul className="mt-2 space-y-1">
                        {state.data.contract.privileged.map((f) => (
                          <li key={f} className={`${mono} break-all text-muted`}>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </Row>
                )}
                {state.data.goplusToken.status === 'ok' && state.data.goplusToken.data && (
                  <Row label="Token risk (GoPlus)" tone={state.data.goplusToken.data.flags.length ? 'warn' : 'neutral'}>
                    {state.data.goplusToken.data.flags.length ? state.data.goplusToken.data.flags.join(', ') : 'No token risk flags'}
                    {(state.data.goplusToken.data.buyTax || state.data.goplusToken.data.sellTax) && (
                      <span className="block text-faint">
                        Buy tax {state.data.goplusToken.data.buyTax ?? '?'} · sell tax {state.data.goplusToken.data.sellTax ?? '?'}
                      </span>
                    )}
                  </Row>
                )}
              </>
            )}
          </ul>
        </>
      )}
      {isEvm && (
        <div className="mt-2 border-t border-line pt-3">
          {showApprovals ? (
            <Approvals chainId={chainId} address={address} />
          ) : (
            <button type="button" onClick={() => setShowApprovals(true)} className="flex items-center gap-2 text-sm font-bold text-accent hover:underline">
              <Warning aria-hidden weight="bold" className="size-4" /> Check token approvals this address has granted
            </button>
          )}
        </div>
      )}
    </section>
  );
}
