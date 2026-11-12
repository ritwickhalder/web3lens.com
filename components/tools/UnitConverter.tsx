'use client';

import { useId, useState } from 'react';
import { attempt, ErrorText, Field, inputCls, Output, Panel } from '@/components/tools/ui';
import { convertUnits } from '@/lib/tools/units';

const FAMILIES = {
  evm: { label: 'EVM (ETH, BNB, POL…)', units: [['wei', 0], ['gwei', 9], ['ether', 18]] },
  btc: { label: 'Bitcoin / Litecoin', units: [['satoshi', 0], ['BTC', 8]] },
  sol: { label: 'Solana', units: [['lamport', 0], ['SOL', 9]] },
} as const;

type Family = keyof typeof FAMILIES | 'custom';

export function UnitConverter() {
  const id = useId();
  const [family, setFamily] = useState<Family>('evm');
  const [value, setValue] = useState('1');
  const [from, setFrom] = useState(18);
  const [decimals, setDecimals] = useState('6');

  const dec = Math.max(0, Math.min(77, Number(decimals) || 0));
  const units: [string, number][] = family === 'custom' ? [['raw units', 0], [`tokens (${dec} decimals)`, dec]] : FAMILIES[family].units.map(([n, d]) => [n, d]);
  const fromDec = units.some(([, d]) => d === from) ? from : units[units.length - 1][1];
  const results = units.map(([name, d]) => ({ name, d, r: attempt(() => convertUnits(value || '0', fromDec, d)) }));
  const error = results.find((x) => x.r.error)?.r.error ?? null;

  return (
    <Panel>
      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Unit family">
        {(['evm', 'btc', 'sol', 'custom'] as const).map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={family === f}
            type="button"
            onClick={() => {
              setFamily(f);
              setFrom(f === 'evm' ? 18 : f === 'btc' ? 8 : f === 'sol' ? 9 : dec);
            }}
            className="rounded-md border border-line px-3.5 py-1.5 text-sm font-bold text-fg/80 aria-selected:border-accent aria-selected:bg-accent/10 aria-selected:text-accent"
          >
            {f === 'custom' ? 'Any token' : FAMILIES[f].label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,14rem)]">
        <Field label="Amount" htmlFor={`${id}-v`}>
          <input id={`${id}-v`} className={inputCls} value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" spellCheck={false} />
        </Field>
        <Field label="Unit" htmlFor={`${id}-u`}>
          <select id={`${id}-u`} className={inputCls} value={fromDec} onChange={(e) => setFrom(Number(e.target.value))}>
            {units.map(([n, d]) => (
              <option key={n} value={d}>
                {n}
              </option>
            ))}
          </select>
        </Field>
        {family === 'custom' && (
          <Field label="Token decimals" htmlFor={`${id}-d`} hint="USDC and USDT use 6, most ERC-20 tokens 18, WBTC 8.">
            <input
              id={`${id}-d`}
              className={inputCls}
              value={decimals}
              onChange={(e) => {
                setDecimals(e.target.value.replace(/\D/g, '').slice(0, 2));
                setFrom(Math.max(0, Math.min(77, Number(e.target.value) || 0)));
              }}
              inputMode="numeric"
            />
          </Field>
        )}
      </div>
      <div className="mt-6 space-y-2">
        <ErrorText>{error}</ErrorText>
        {!error && results.map(({ name, r }) => <Output key={name} label={name} value={r.value} />)}
      </div>
      <p className="mt-4 text-xs font-semibold text-faint">Exact integer arithmetic: amounts with more decimals than the target unit allows are rejected rather than rounded.</p>
    </Panel>
  );
}
