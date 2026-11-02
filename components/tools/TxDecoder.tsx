'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { attempt, ErrorText, Field, Output, Panel, textareaCls } from '@/components/tools/ui';
import { formatDecoded } from '@/lib/evm/abi';
import { decodeRawTransaction } from '@/lib/evm/tx-decode';
import { EVM_NETWORKS } from '@/lib/networks';
import { formatUnits } from '@/lib/tools/units';

const gwei = (w?: string) => (w === undefined ? null : `${formatUnits(BigInt(w), 9)} gwei`);

export function TxDecoder() {
  const id = useId();
  const [raw, setRaw] = useState('');
  const r = raw.trim() ? attempt(() => decodeRawTransaction(raw)) : null;
  const d = r?.value;
  const net = d?.chainId ? EVM_NETWORKS.find((n) => n.chainId === d.chainId) : undefined;

  return (
    <div className="space-y-4">
      <Panel>
        <Field label="Signed raw transaction (0x…)" htmlFor={id} hint="Decoded in your browser. Nothing is broadcast or sent anywhere.">
          <textarea id={id} className={`${textareaCls} min-h-36`} value={raw} onChange={(e) => setRaw(e.target.value)} spellCheck={false} placeholder="0x02f8…" />
        </Field>
        <div className="mt-3">
          <ErrorText>{r?.error}</ErrorText>
        </div>
      </Panel>
      {d && (
        <>
          {d.warnings.length > 0 && (
            <ul className="space-y-2">
              {d.warnings.map((w) => (
                <li key={w} className="rounded-lg border border-redline/40 bg-redline/10 px-4 py-3 text-sm font-semibold text-redline">
                  {w}
                </li>
              ))}
            </ul>
          )}
          <Panel title={`${d.typeName} transaction`}>
            <div className="space-y-2">
              <Output label="Transaction hash" value={d.hash} />
              <Output label="From (recovered)" value={d.from} />
              <Output label="To" value={d.to ?? '(contract creation)'} />
              <Output label="Chain id" value={d.chainId === null ? 'none (replayable)' : `${d.chainId}${net ? ` · ${net.name}` : ''}`} />
              <Output label="Value" value={`${d.value} (${d.valueWei} wei)`} />
              <Output label="Nonce" value={d.nonce} />
              <Output label="Gas limit" value={d.gasLimit} />
              {d.gasPriceWei && <Output label="Gas price" value={gwei(d.gasPriceWei)} />}
              {d.maxFeePerGasWei && <Output label="Max fee per gas" value={gwei(d.maxFeePerGasWei)} />}
              {d.maxPriorityFeePerGasWei && <Output label="Max priority fee" value={gwei(d.maxPriorityFeePerGasWei)} />}
              {d.maxFeePerBlobGasWei && <Output label="Max fee per blob gas" value={gwei(d.maxFeePerBlobGasWei)} />}
              <Output label="Max total fee" value={`${formatUnits(BigInt(d.maxFeeWei), 18)} (native token)`} />
              <Output label="Signature v / r / s" value={`${d.signature.v} / ${d.signature.r} / ${d.signature.s}`} />
            </div>
            {net && (
              <p className="mt-4 text-sm font-semibold">
                <Link href={`/tx/${net.id}/${d.hash}`} className="text-accent hover:underline">
                  Check whether it is on {net.name} →
                </Link>
              </p>
            )}
          </Panel>
          {d.data !== '0x' && (
            <Panel title="Call data">
              {d.call.length ? (
                d.call.map((c) => (
                  <div key={c.fn.signature} className="mb-3 rounded-xl border border-line bg-ink p-4">
                    <p className="break-all font-mono text-sm text-accent">{c.fn.signature}</p>
                    <p className="text-xs font-bold text-redline">Matched a common signature; without the contract's ABI this is a best guess.</p>
                    <ul className="mt-2 space-y-1.5">
                      {c.args.map((a, i) => (
                        <li key={i} className="text-sm">
                          <span className="font-bold text-muted">{a.name ?? c.fn.inputs[i]?.name ?? `arg${i}`}</span>{' '}
                          <span className="block break-all font-mono text-fg">{formatDecoded(a)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <p className="text-sm font-semibold text-muted">
                  Unknown selector {d.data.slice(0, 10)}.{' '}
                  <Link href={`/tools/abi-decoder?data=${d.data.slice(0, 4000)}`} className="font-bold text-accent">
                    Open in the calldata decoder
                  </Link>
                </p>
              )}
              <Output label="Raw data" value={d.data} />
            </Panel>
          )}
          {d.authorizations && d.authorizations.length > 0 && (
            <Panel title="EIP-7702 authorizations">
              <div className="space-y-3">
                {d.authorizations.map((a, i) => (
                  <div key={i} className="space-y-2 rounded-xl border border-redline/40 bg-ink p-4">
                    <Output label="Signer (account)" value={a.signer} />
                    <Output label="Delegates to code at" value={a.address} />
                    <Output label="Chain id / nonce" value={`${a.chainId === '0' ? '0 (any chain!)' : a.chainId} / ${a.nonce}`} />
                  </div>
                ))}
              </div>
            </Panel>
          )}
          {d.accessList && d.accessList.length > 0 && (
            <Panel title="Access list">
              <ul className="space-y-1 font-mono text-xs text-muted">
                {d.accessList.map((e) => (
                  <li key={e.address} className="break-all">
                    {e.address} ({e.storageKeys.length} keys)
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
