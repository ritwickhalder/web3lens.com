'use client';

import { useState } from 'react';
import { ChainCombobox } from '@/components/search/ChainCombobox';
import { CHAINS } from '@/lib/chains';
import { fallbackNotice, openExplorer, resolveExplorer } from '@/lib/explorer';

/** Chain picker + query box + SEARCH button. Opens the chain's explorer in a new tab. */
export function ChainSearch() {
  const [chain, setChain] = useState(CHAINS[0]);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState<{ tone: 'error' | 'info'; text: string } | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!query.trim()) {
      setNotice({ tone: 'error', text: 'Oops.. You forgot to enter something in the text box. Try again.' });
      return;
    }
    setNotice(chain.fallback ? { tone: 'info', text: fallbackNotice(chain) } : null);
    openExplorer(resolveExplorer(chain, query));
  }

  return (
    <form onSubmit={onSubmit} className="relative z-10 mx-auto w-full" noValidate>
      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <ChainCombobox
            chains={CHAINS}
            value={chain}
            onChange={(c) => {
              setChain(c);
              setNotice(null);
            }}
          />
        </div>
        <div className="lg:col-span-7">
          <input
            type="text"
            maxLength={250}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for Account Address, Tx Hash, Block or Data"
            aria-label="Address, transaction hash, block or data"
            className="h-12 w-full rounded-[0.3rem] border border-[#ced4da] bg-white px-4 text-base text-[#495057] sm:text-xl outline-none placeholder:text-center placeholder:text-[#6c757d] focus:border-[#80bdff] focus:shadow-[0_0_0_0.2rem_rgba(0,123,255,0.25)]"
          />
        </div>
        <div className="lg:col-span-2">
          <button
            type="submit"
            className="h-12 w-full rounded-[0.3rem] border border-[#ffc107] bg-[#ffc107] px-2 text-lg text-[#212529] transition-colors hover:border-[#d39e00] hover:bg-[#e0a800]"
          >
            SEARCH
          </button>
        </div>
      </div>
      {notice && (
        <p
          role={notice.tone === 'error' ? 'alert' : 'status'}
          className={`mt-3 rounded px-4 py-2 text-left text-sm ${
            notice.tone === 'error' ? 'bg-[#f8d7da] text-[#721c24]' : 'bg-[#fff3cd] text-[#856404]'
          }`}
        >
          {notice.text}
        </p>
      )}
    </form>
  );
}
