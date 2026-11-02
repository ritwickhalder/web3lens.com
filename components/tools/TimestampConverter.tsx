'use client';

import { useId, useState } from 'react';
import { attempt, ErrorText, Field, ghostBtnCls, inputCls, Output, Panel } from '@/components/tools/ui';
import { parseTime } from '@/lib/tools/time';

export function TimestampConverter() {
  const id = useId();
  const [input, setInput] = useState('');
  const r = input.trim() ? attempt(() => parseTime(input)) : { value: null, error: null };

  return (
    <Panel>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <Field label="Timestamp or date" htmlFor={id} hint="Seconds, milliseconds, hex (0x…) or a date like 2024-04-20 00:09 UTC.">
            <input id={id} className={inputCls} value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} placeholder="1231006505" />
          </Field>
        </div>
        <button type="button" className={`${ghostBtnCls} mb-[22px]`} onClick={() => setInput(String(Math.floor(Date.now() / 1000)))}>
          Now
        </button>
      </div>
      <div className="mt-6 space-y-2">
        <ErrorText>{r.error}</ErrorText>
        {r.value && (
          <>
            <p className="text-sm font-semibold text-faint">Read as {r.value.interpretedAs}.</p>
            <Output label="Unix seconds" value={String(r.value.seconds)} />
            <Output label="Milliseconds" value={String(r.value.ms)} />
            <Output label="Hex seconds" value={`0x${r.value.seconds.toString(16)}`} />
            <Output label="ISO 8601 (UTC)" value={r.value.iso} />
            <Output label="Your time zone" value={r.value.local} mono={false} />
            <Output label="Relative" value={r.value.relative} mono={false} />
          </>
        )}
      </div>
    </Panel>
  );
}
