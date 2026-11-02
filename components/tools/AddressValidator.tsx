'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { ChainGlyph } from '@/components/search/ChainGlyph';
import { Field, inputCls, Output, Panel } from '@/components/tools/ui';
import { getChain } from '@/lib/chains';
import { detectAll, extractQuery } from '@/lib/detect';
import { checkSanctions } from '@/lib/security/sanctions';
import { searchUrl } from '@/lib/search-url';

const CHECKSUM_TEXT = {
  valid: { text: 'Checksum valid', cls: 'text-accent' },
  invalid: { text: 'Checksum does NOT match: probably a typo', cls: 'text-danger' },
  none: { text: 'No checksum in this spelling', cls: 'text-muted' },
  unverified: { text: 'Format matches (checksum not verified by Web3Lens)', cls: 'text-muted' },
} as const;

export function AddressValidator() {
  const id = useId();
  const [input, setInput] = useState('');
  const { query } = extractQuery(input);
  const all = query ? detectAll(query) : [];

  return (
    <Panel>
      <Field label="Address, hash or name" htmlFor={id} hint="Payment links (bitcoin:…, ethereum:…) and explorer URLs are unwrapped automatically.">
        <input id={id} className={inputCls} value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} autoComplete="off" placeholder="0x…, bc1…, T…, cosmos1…" />
      </Field>
      <div className="mt-6 space-y-4">
        {query && all.length === 0 && <p className="text-sm font-semibold text-danger">Not a valid address or hash in any format Web3Lens knows.</p>}
        {all.map((d) => {
          const sanctions = d.kind === 'address' ? checkSanctions(d.normalized) : null;
          return (
            <div key={d.format} className="space-y-3 rounded-xl border border-line bg-ink p-4">
              <p className="text-base font-extrabold">
                {d.label}
                {d.network === 'testnet' && <span className="ml-2 text-sm text-redline">testnet</span>}
              </p>
              {d.kind === 'secret' ? (
                <p className="text-sm font-bold text-danger">{d.note}</p>
              ) : (
                <>
                  <p className={`text-sm font-bold ${CHECKSUM_TEXT[d.checksum].cls}`}>{CHECKSUM_TEXT[d.checksum].text}</p>
                  {d.note && d.checksum !== 'invalid' && <p className="text-sm font-semibold text-redline">{d.note}</p>}
                  <Output label="Normalised" value={d.normalized} />
                  {d.format === 'evm-address' && d.checksum !== 'invalid' && <Output label="Lowercase" value={d.normalized.toLowerCase()} />}
                  {sanctions && (
                    <p className={`text-sm font-semibold ${sanctions.listed ? 'text-danger' : 'text-muted'}`}>
                      {sanctions.listed
                        ? `On the OFAC SDN list (${sanctions.lists.join(', ')})`
                        : `Not on the OFAC SDN snapshot of ${sanctions.snapshotAt.slice(0, 10)} (that alone doesn't make it safe)`}
                    </p>
                  )}
                  {d.chains.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      {d.chains.slice(0, 14).map((c) => {
                        const chain = getChain(c);
                        return chain ? (
                          <Link key={c} href={searchUrl(d.normalized, c)} className="flex items-center gap-1.5 rounded-full border border-line py-1 pl-1 pr-3 text-sm font-semibold hover:border-accent">
                            <ChainGlyph id={c} name={chain.name} size="xs" /> {chain.name}
                          </Link>
                        ) : null;
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs font-semibold text-faint">Runs entirely in your browser. A valid checksum means the address was copied correctly, not that it is trustworthy.</p>
    </Panel>
  );
}
