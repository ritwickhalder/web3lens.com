'use client';

import { MagnifyingGlass } from '@phosphor-icons/react/dist/ssr';
import { ChainGlyph } from '@/components/search/ChainGlyph';
import { CHAIN_EVENT } from '@/components/search/SmartSearch';
import { chainMeta, POPULAR_CHAIN_IDS } from '@/lib/chain-meta';
import { CHAINS, countLabel, getChain, type Chain } from '@/lib/chains';

const POPULAR = POPULAR_CHAIN_IDS.map((id) => getChain(id)).filter((c): c is Chain => Boolean(c));

/** Tiles for the most-used chains; clicking one selects it in the search bar. */
export function PopularChains() {
  const select = (id: string) => window.dispatchEvent(new CustomEvent(CHAIN_EVENT, { detail: id }));
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
      {POPULAR.map((chain) => (
        <button
          key={chain.id}
          type="button"
          onClick={() => select(chain.id)}
          className="group flex items-center gap-2.5 rounded-xl border border-line bg-ink-2/80 p-2 text-left transition-colors hover:border-accent/60 hover:bg-ink-3"
        >
          <ChainGlyph id={chain.id} name={chain.name} size="lg" />
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-extrabold text-fg">{chain.name}</span>
            <span className="block text-xs font-bold text-faint group-hover:text-accent">{chainMeta(chain.id, chain.name).symbol}</span>
          </span>
        </button>
      ))}
      <button
        type="button"
        onClick={() => select(CHAINS[0].id)}
        className="flex items-center gap-3 rounded-xl border border-dashed border-line-strong p-2.5 text-left text-muted transition-colors hover:border-accent hover:text-accent"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-ink-3">
          <MagnifyingGlass weight="bold" className="size-5" />
        </span>
        <span>
          <span className="block text-[15px] font-extrabold">{countLabel(CHAINS.length - POPULAR.length)} more</span>
          <span className="block text-xs font-bold">all chains</span>
        </span>
      </button>
    </div>
  );
}
