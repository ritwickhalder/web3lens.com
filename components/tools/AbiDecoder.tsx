'use client';

import { useId, useState } from 'react';
import { attempt, btnCls, ErrorText, Field, ghostBtnCls, inputCls, Output, Panel, textareaCls } from '@/components/tools/ui';
import { apiGet } from '@/lib/api-client';
import { encodeCall, parseJsonAbi, parseSignature, type AbiFunction, type DecodedValue, type EncodableValue } from '@/lib/evm/abi';
import { decodeCalldata, type DecodedCall } from '@/lib/evm/signatures';

/** ABI text: a JSON ABI, or one signature per line. */
function parseAbiText(text: string): AbiFunction[] {
  const t = text.trim();
  if (!t) return [];
  if (t.startsWith('[') || t.startsWith('{')) return parseJsonAbi(t).functions;
  return t
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map(parseSignature);
}

function Value({ v, depth = 0 }: { v: DecodedValue; depth?: number }) {
  return (
    <li className="min-w-0 py-1.5">
      <span className="text-sm font-bold text-muted">
        {v.name ?? ''} <span className="font-semibold text-faint">{v.type}</span>
      </span>
      {'items' in v ? (
        <ul className="ml-3 border-l border-line pl-3">
          {v.items.map((c, i) => (
            <Value key={i} v={c} depth={depth + 1} />
          ))}
        </ul>
      ) : (
        <span className="block break-all font-mono text-sm text-fg">{v.value}</span>
      )}
    </li>
  );
}

function Decoded({ calls, guess }: { calls: DecodedCall[]; guess: string | null }) {
  return (
    <div className="space-y-4">
      {calls.map((c) => (
        <div key={c.fn.signature} className="rounded-xl border border-line bg-ink p-4">
          <p className="break-all font-mono text-sm text-accent">{c.fn.signature}</p>
          {guess && <p className="mt-1 text-xs font-bold text-redline">{guess}</p>}
          <ul className="mt-2 divide-y divide-line">
            {c.args.map((a, i) => (
              <Value key={i} v={{ ...a, name: a.name ?? c.fn.inputs[i]?.name ?? `arg${i}` }} />
            ))}
          </ul>
        </div>
      ))}
      {calls.length > 1 && <p className="text-sm font-semibold text-redline">Several functions decode this data; the contract's ABI is needed to know which one it is.</p>}
    </div>
  );
}

export function AbiDecoder({ initialData = '' }: { initialData?: string }) {
  const id = useId();
  const [data, setData] = useState(initialData);
  const [abi, setAbi] = useState('');
  const [online, setOnline] = useState<{ status: 'idle' | 'loading' | 'done'; calls: DecodedCall[]; error: string | null; source?: string }>({ status: 'idle', calls: [], error: null });
  const [sig, setSig] = useState('transfer(address to, uint256 amount)');
  const [args, setArgs] = useState('["0x000000000000000000000000000000000000dEaD", "1000000000000000000"]');

  const fns = attempt(() => parseAbiText(abi));
  const cleaned = data.trim();
  const calls = cleaned && fns.value ? decodeCalldata(cleaned, fns.value.length ? fns.value : undefined) : [];
  const badHex = cleaned && !/^0x[0-9a-fA-F]{8,}$/.test(cleaned);
  const encoded = attempt(() => encodeCall(sig, JSON.parse(args) as EncodableValue[]));

  async function lookupOnline() {
    const selector = cleaned.slice(0, 10).toLowerCase();
    setOnline({ status: 'loading', calls: [], error: null });
    try {
      const r = await apiGet<{ signatures: string[]; source: string }>('selector', { q: selector });
      const candidates = r.signatures.flatMap((s) => {
        try {
          return [parseSignature(s)];
        } catch {
          return [];
        }
      });
      setOnline({ status: 'done', calls: decodeCalldata(cleaned, candidates), error: null, source: r.source });
    } catch (e) {
      setOnline({ status: 'done', calls: [], error: (e as Error).message });
    }
  }

  return (
    <div className="space-y-4">
      <Panel title="Decode calldata">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Field label="Calldata (0x…)" htmlFor={`${id}-d`}>
            <textarea
              id={`${id}-d`}
              className={textareaCls}
              value={data}
              onChange={(e) => {
                setData(e.target.value);
                setOnline({ status: 'idle', calls: [], error: null });
              }}
              spellCheck={false}
              placeholder="0xa9059cbb000000000000000000000000…"
            />
          </Field>
          <Field label="ABI (optional)" htmlFor={`${id}-a`} hint="JSON ABI, or one signature per line. Without it, ~60 common functions are tried.">
            <textarea id={`${id}-a`} className={textareaCls} value={abi} onChange={(e) => setAbi(e.target.value)} spellCheck={false} placeholder={'function swap(uint256 amountIn, address to)'} />
          </Field>
        </div>
        <div className="mt-5 space-y-3">
          <ErrorText>{fns.error ? `ABI: ${fns.error}` : badHex ? 'Calldata must be 0x followed by at least a 4-byte selector.' : null}</ErrorText>
          {cleaned && !badHex && !fns.error && calls.length > 0 && <Decoded calls={calls} guess={fns.value?.length ? null : 'Matched a common signature (no ABI given).'} />}
          {cleaned && !badHex && !fns.error && calls.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-muted">
                Selector <code className="font-mono">{cleaned.slice(0, 10)}</code> doesn't match {fns.value?.length ? 'the ABI you gave' : 'any built-in signature'}.
              </p>
              {online.status === 'idle' && (
                <button type="button" className={ghostBtnCls} onClick={lookupOnline}>
                  Look up the selector in public signature databases
                </button>
              )}
              {online.status === 'loading' && <p className="animate-pulse text-sm font-semibold text-muted">Asking openchain.xyz / 4byte.directory…</p>}
              {online.status === 'done' && (
                <>
                  <ErrorText>{online.error}</ErrorText>
                  {online.calls.length ? (
                    <Decoded calls={online.calls} guess={`Community-submitted signature from ${online.source}: anyone can add these, so treat it as a guess.`} />
                  ) : (
                    !online.error && <p className="text-sm font-semibold text-muted">No submitted signature decodes this data.</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </Panel>
      <Panel title="Encode a call">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Field label="Function signature" htmlFor={`${id}-s`}>
            <input id={`${id}-s`} className={inputCls} value={sig} onChange={(e) => setSig(e.target.value)} spellCheck={false} />
          </Field>
          <Field label="Arguments (JSON array)" htmlFor={`${id}-r`} hint="Numbers as strings; tuples and arrays as nested arrays.">
            <input id={`${id}-r`} className={inputCls} value={args} onChange={(e) => setArgs(e.target.value)} spellCheck={false} />
          </Field>
        </div>
        <div className="mt-4 space-y-2">
          <ErrorText>{encoded.error}</ErrorText>
          {encoded.value && (
            <>
              <Output label="Calldata" value={encoded.value} />
              <button type="button" className={btnCls} onClick={() => setData(encoded.value!)}>
                Decode it above
              </button>
            </>
          )}
        </div>
      </Panel>
    </div>
  );
}
