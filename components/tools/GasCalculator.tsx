'use client';

import { useEffect, useId, useState } from 'react';
import { attempt, ErrorText, Field, ghostBtnCls, inputCls, Output, Panel } from '@/components/tools/ui';
import { apiGet } from '@/lib/api-client';
import { formatUsd } from '@/lib/format';
import type { GasResult } from '@/lib/lookup-types';
import { EVM_NETWORKS } from '@/lib/networks';
import { bitcoinFee, calculateFee, GAS_PRESETS } from '@/lib/tools/gas';
import { formatUnits } from '@/lib/tools/units';

export function GasCalculator() {
  const id = useId();
  const [gasLimit, setGasLimit] = useState('21000');
  const [base, setBase] = useState('');
  const [tip, setTip] = useState('');
  const [maxFee, setMaxFee] = useState('');
  const [chain, setChain] = useState('ethereum');
  const [gas, setGas] = useState<{ data: GasResult | null; error: string | null }>({ data: null, error: null });
  const [vbytes, setVbytes] = useState('141');
  const [satVb, setSatVb] = useState('');

  useEffect(() => {
    const ctrl = new AbortController();
    apiGet<GasResult>('gas', {}, ctrl.signal)
      .then((data) => setGas({ data, error: null }))
      .catch((e: Error) => e.name !== 'AbortError' && setGas({ data: null, error: e.message }));
    return () => ctrl.abort();
  }, []);

  const net = EVM_NETWORKS.find((n) => n.id === chain)!;
  const row = gas.data?.evm.find((r) => r.chain.id === chain);
  const price = net.coingecko ? (gas.data?.prices[net.coingecko] ?? null) : null;

  function applyLive() {
    if (!row || row.status !== 'ok') return;
    if (row.baseFeeGwei) {
      setBase(row.baseFeeGwei);
      setTip(row.priorityFeeGwei ?? '0');
      setMaxFee('');
    } else {
      setBase(row.gasPriceGwei ?? '');
      setTip('');
    }
  }

  const fee = base ? attempt(() => calculateFee({ gasLimit, baseFeeGwei: base, priorityFeeGwei: tip || undefined, maxFeeGwei: maxFee || undefined, priceUsd: price })) : null;
  const btcRates = gas.data?.bitcoin.status === 'ok' ? gas.data.bitcoin.data : null;
  const btc = satVb && vbytes ? attempt(() => bitcoinFee(Number(vbytes), Number(satVb))) : null;

  return (
    <div className="space-y-4">
      <Panel title="EVM transaction fee">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Chain" htmlFor={`${id}-c`}>
            <select id={`${id}-c`} className={inputCls} value={chain} onChange={(e) => setChain(e.target.value)}>
              {EVM_NETWORKS.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Gas limit" htmlFor={`${id}-g`}>
            <input id={`${id}-g`} className={inputCls} value={gasLimit} onChange={(e) => setGasLimit(e.target.value)} inputMode="numeric" />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {GAS_PRESETS.map((p) => (
            <button key={p.label} type="button" onClick={() => setGasLimit(p.gas)} className="rounded-full border border-line px-3 py-1 text-xs font-bold text-muted hover:border-accent hover:text-accent">
              {p.label} · {Number(p.gas).toLocaleString('en-US')}
            </button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Base fee / gas price (gwei)" htmlFor={`${id}-b`}>
            <input id={`${id}-b`} className={inputCls} value={base} onChange={(e) => setBase(e.target.value)} inputMode="decimal" placeholder="e.g. 12" />
          </Field>
          <Field label="Priority fee (gwei)" htmlFor={`${id}-t`} hint="Leave empty for legacy pricing.">
            <input id={`${id}-t`} className={inputCls} value={tip} onChange={(e) => setTip(e.target.value)} inputMode="decimal" />
          </Field>
          <Field label="Max fee (gwei)" htmlFor={`${id}-m`} hint="Optional cap (EIP-1559).">
            <input id={`${id}-m`} className={inputCls} value={maxFee} onChange={(e) => setMaxFee(e.target.value)} inputMode="decimal" />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm font-semibold text-muted">
          {row?.status === 'ok' ? (
            <>
              <span>
                Live on {net.name}: {row.baseFeeGwei ? `base ${Number(row.baseFeeGwei).toPrecision(4)} + tip ${Number(row.priorityFeeGwei ?? 0).toPrecision(3)}` : `${Number(row.gasPriceGwei).toPrecision(4)}`} gwei
                {row.stale ? ' (stale)' : ''}
              </span>
              <button type="button" className={ghostBtnCls} onClick={applyLive}>
                Use live prices
              </button>
            </>
          ) : row?.status === 'unavailable' ? (
            <span className="text-redline">Live gas for {net.name} unavailable: {row.reason}</span>
          ) : gas.error ? (
            <span className="text-redline">Live gas unavailable: {gas.error}</span>
          ) : (
            <span className="animate-pulse">Loading live gas prices…</span>
          )}
        </div>
        <div className="mt-5 space-y-2">
          <ErrorText>{fee?.error}</ErrorText>
          {fee?.value && (
            <>
              <Output label="Effective gas price" value={`${fee.value.effectiveGasPriceGwei} gwei`} />
              <Output label={`Fee (${net.symbol})`} value={fee.value.fee} />
              <Output label="Fee (wei)" value={fee.value.feeWei} />
              {fee.value.feeUsd !== null && <Output label="Fee (USD, approx.)" value={formatUsd(fee.value.feeUsd)} mono={false} />}
              {fee.value.maxFee && <Output label={`Max you must hold (${net.symbol})`} value={fee.value.maxFee} />}
              {fee.value.burnedWei && <Output label="Burned / to validator" value={`${formatUnits(BigInt(fee.value.burnedWei), 18)} / ${formatUnits(BigInt(fee.value.tipWei!), 18)} ${net.symbol}`} />}
            </>
          )}
        </div>
        <p className="mt-4 text-xs font-semibold text-faint">On rollups (Base, OP, Arbitrum, Scroll, Linea, zkSync) the total also includes an L1 data fee that this calculation doesn't cover.</p>
      </Panel>
      <Panel title="Bitcoin fee">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Transaction size (vbytes)" htmlFor={`${id}-vb`} hint="1 input + 2 outputs native SegWit ≈ 141 vB.">
            <input id={`${id}-vb`} className={inputCls} value={vbytes} onChange={(e) => setVbytes(e.target.value)} inputMode="numeric" />
          </Field>
          <Field label="Fee rate (sat/vB)" htmlFor={`${id}-sv`}>
            <input id={`${id}-sv`} className={inputCls} value={satVb} onChange={(e) => setSatVb(e.target.value)} inputMode="decimal" />
          </Field>
        </div>
        {btcRates && (
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                ['Next block', btcRates.fastest],
                ['~30 min', btcRates.halfHour],
                ['~1 hour', btcRates.hour],
                ['Economy', btcRates.economy],
              ] as const
            ).map(([l, v]) => (
              <button key={l} type="button" onClick={() => setSatVb(String(v))} className="rounded-full border border-line px-3 py-1 text-xs font-bold text-muted hover:border-accent hover:text-accent">
                {l}: {v} sat/vB
              </button>
            ))}
            <span className="self-center text-xs font-semibold text-faint">mempool.space</span>
          </div>
        )}
        <div className="mt-5 space-y-2">
          <ErrorText>{btc?.error}</ErrorText>
          {btc?.value && (
            <>
              <Output label="Fee (sats)" value={String(btc.value.sats)} />
              <Output label="Fee (BTC)" value={btc.value.btc} />
              {gas.data?.prices.bitcoin && <Output label="Fee (USD, approx.)" value={formatUsd(Number(btc.value.btc) * gas.data.prices.bitcoin)} mono={false} />}
            </>
          )}
        </div>
      </Panel>
    </div>
  );
}
