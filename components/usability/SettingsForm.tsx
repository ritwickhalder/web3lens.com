'use client';

import { useSyncExternalStore } from 'react';
import { ThemePicker } from '@/components/layout/ThemeToggle';
import { ChainGlyph } from '@/components/search/ChainGlyph';
import { ghostBtnCls, Panel } from '@/components/tools/ui';
import { allExplorerRoutes, getChain } from '@/lib/chains';
import { prefsStore, setPreferredExplorer, toggleFavouriteChain } from '@/lib/prefs';
import { recentStore } from '@/lib/recent';
import { savedStore } from '@/lib/saved';

const MULTI = Object.entries(allExplorerRoutes()).filter(([, routes]) => routes.length > 1);

export function SettingsForm() {
  const prefs = useSyncExternalStore(prefsStore.subscribe, prefsStore.getSnapshot, prefsStore.getServerSnapshot);
  const saved = useSyncExternalStore(savedStore.subscribe, savedStore.getSnapshot, savedStore.getServerSnapshot);

  return (
    <div className="space-y-4">
      <Panel title="Appearance">
        <ThemePicker />
      </Panel>

      <Panel title="When I press Search">
        <div className="space-y-3" role="radiogroup" aria-label="Search action">
          {(
            [
              ['results', 'Show Web3Lens results first', 'For chains with native data (11 EVM chains, Bitcoin, Litecoin, Solana): balances, tokens, risk checks and explorer links on one page. Other chains open their explorer.'],
              ['explorer', 'Always open the block explorer', 'Skip the results page and go straight to the explorer in a new tab, like the original Web3Lens.'],
            ] as const
          ).map(([value, title, body]) => (
            <label key={value} className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-4 has-[:checked]:border-accent has-[:checked]:bg-accent/5">
              <input type="radio" name="searchAction" className="mt-1 accent-[var(--color-accent)]" checked={prefs.searchAction === value} onChange={() => prefsStore.set((p) => ({ ...p, searchAction: value }))} />
              <span>
                <span className="block font-extrabold">{title}</span>
                <span className="block text-sm font-medium text-muted">{body}</span>
              </span>
            </label>
          ))}
        </div>
      </Panel>

      <Panel title="Preferred explorers">
        <p className="mb-4 text-sm font-medium text-muted">Used for the Search button and listed first on result pages.</p>
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {MULTI.map(([id, routes]) => {
            const chain = getChain(id);
            if (!chain) return null;
            return (
              <li key={id} className="flex items-center gap-3 rounded-xl border border-line p-3">
                <ChainGlyph id={id} name={chain.name} size="sm" />
                <label htmlFor={`ex-${id}`} className="min-w-0 flex-1 truncate text-sm font-bold">
                  {chain.name}
                </label>
                <select
                  id={`ex-${id}`}
                  value={prefs.explorers[id] ?? routes[0].name}
                  onChange={(e) => setPreferredExplorer(id, e.target.value === routes[0].name ? null : e.target.value)}
                  className="h-9 rounded-lg border border-line-strong bg-ink px-2 text-sm font-semibold"
                >
                  {routes.map((r) => (
                    <option key={r.name}>{r.name}</option>
                  ))}
                </select>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel title="Favourite chains">
        {prefs.favouriteChains.length === 0 ? (
          <p className="text-sm font-medium text-muted">Pin chains with the star in the chain picker; they appear at the top.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {prefs.favouriteChains.map((id) => {
              const chain = getChain(id);
              return chain ? (
                <li key={id}>
                  <button type="button" onClick={() => toggleFavouriteChain(id)} className="flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3 text-sm font-semibold hover:border-danger" aria-label={`Unpin ${chain.name}`}>
                    <ChainGlyph id={id} name={chain.name} size="sm" /> {chain.name} ×
                  </button>
                </li>
              ) : null;
            })}
          </ul>
        )}
      </Panel>

      <Panel title="Data in this browser">
        <p className="mb-4 text-sm font-medium text-muted">
          Recent searches, {saved.length} saved item{saved.length === 1 ? '' : 's'} and these settings live in this browser's local storage. Web3Lens has no account system and never receives them.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={ghostBtnCls} onClick={() => recentStore.clear()}>
            Clear recent searches
          </button>
          <button
            type="button"
            className={ghostBtnCls}
            onClick={() => window.confirm(`Delete all ${saved.length} saved items? Export them first if you want a copy.`) && savedStore.set([])}
          >
            Delete saved items
          </button>
          <button type="button" className={ghostBtnCls} onClick={() => prefsStore.set({ explorers: {}, favouriteChains: [], searchAction: 'results' })}>
            Reset settings
          </button>
        </div>
      </Panel>
    </div>
  );
}
