'use client';

import { useId, useState } from 'react';
import { attempt, ErrorText, Field, inputCls, Output, Panel, textareaCls } from '@/components/tools/ui';
import { decimalToHex, hashes, hexToDecimal, hexToSignedInt256, hexToText, textToHex } from '@/lib/tools/convert';

export function HexConverter() {
  const id = useId();
  const [num, setNum] = useState('0xde0b6b3a7640000');
  const [text, setText] = useState('Hello, Web3Lens');
  const [hexText, setHexText] = useState('');
  const [hashInput, setHashInput] = useState('transfer(address,uint256)');
  const [hashKind, setHashKind] = useState<'text' | 'hex'>('text');

  const isHex = /^-?0x/i.test(num.trim()) || /[a-f]/i.test(num);
  const dec = isHex ? attempt(() => hexToDecimal(num)) : attempt(() => num.trim().replace(/[_,\s]/g, ''));
  const hex = isHex ? attempt(() => `0x${num.trim().replace(/^-?0x/i, '').toLowerCase()}`) : attempt(() => decimalToHex(num));
  const signed = attempt(() => hexToSignedInt256(hex.value ?? ''));
  const textHex = attempt(() => textToHex(text));
  const hexAsText = hexText.trim() ? attempt(() => hexToText(hexText)) : { value: null, error: null };
  const h = hashInput ? attempt(() => hashes({ kind: hashKind, value: hashInput })) : { value: null, error: null };

  return (
    <div className="space-y-4">
      <Panel title="Number">
        <Field label="Hex (0x…) or decimal" htmlFor={`${id}-n`} hint="Scientific notation like 1e18 works for decimals.">
          <input id={`${id}-n`} className={inputCls} value={num} onChange={(e) => setNum(e.target.value)} spellCheck={false} />
        </Field>
        <div className="mt-4 space-y-2">
          <ErrorText>{dec.error ?? hex.error}</ErrorText>
          {!dec.error && !hex.error && (
            <>
              <Output label="Decimal" value={dec.value} />
              <Output label="Hex" value={hex.value} />
              {signed.value !== null && signed.value !== dec.value && <Output label="As int256" value={signed.value} />}
            </>
          )}
        </div>
      </Panel>
      <Panel title="Text ↔ hex (UTF-8)">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Field label="Text" htmlFor={`${id}-t`}>
              <textarea id={`${id}-t`} className={textareaCls} value={text} onChange={(e) => setText(e.target.value)} />
            </Field>
            <Output label="Hex" value={textHex.value} />
          </div>
          <div className="space-y-2">
            <Field label="Hex" htmlFor={`${id}-h`}>
              <textarea id={`${id}-h`} className={textareaCls} value={hexText} onChange={(e) => setHexText(e.target.value)} placeholder="0x48656c6c6f" spellCheck={false} />
            </Field>
            <ErrorText>{hexAsText.error}</ErrorText>
            <Output label="Text" value={hexAsText.value} mono={false} />
          </div>
        </div>
      </Panel>
      <Panel
        title="Hashes"
        aside={
          <div className="flex gap-1.5" role="radiogroup" aria-label="Input type">
            {(['text', 'hex'] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={hashKind === k}
                onClick={() => setHashKind(k)}
                className="rounded-md border border-line px-3 py-1 text-sm font-bold aria-checked:border-accent aria-checked:text-accent"
              >
                {k === 'text' ? 'Text' : 'Hex bytes'}
              </button>
            ))}
          </div>
        }
      >
        <Field label="Input" htmlFor={`${id}-k`} hint="A function signature like transfer(address,uint256) also gives its 4-byte selector.">
          <input id={`${id}-k`} className={inputCls} value={hashInput} onChange={(e) => setHashInput(e.target.value)} spellCheck={false} />
        </Field>
        <div className="mt-4 space-y-2">
          <ErrorText>{h.error}</ErrorText>
          {h.value && (
            <>
              <Output label="keccak256" value={h.value.keccak256} />
              <Output label="SHA-256" value={h.value.sha256} />
              {h.value.selector && <Output label="Function selector" value={h.value.selector} />}
            </>
          )}
        </div>
      </Panel>
    </div>
  );
}
