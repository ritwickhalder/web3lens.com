/**
 * Background (Chrome/Edge service worker, Firefox event page): right-click menu and the `w3`
 * omnibox keyword. No host permissions, no network requests of its own. Firefox for Android has
 * neither API, so each part only registers where its API exists.
 */
import { getChain } from '@/lib/chains';
import { detectAll, extractQuery } from '@/lib/detect';
import { detectionFor, resolveExplorer, toQueryKind } from '@/lib/explorer';
import { hasNativeSupport } from '@/lib/networks';
import { appUrl, ext, omniboxText } from './browser';
import { load } from './store';

const MENU_LOOKUP = 'w3l-lookup';
const MENU_EXPLORER = 'w3l-explorer';
const menus = ext.contextMenus;
const omnibox = ext.omnibox;

ext.runtime.onInstalled.addListener(() => {
  if (!menus) return;
  void menus.removeAll().then(() => {
    menus.create({ id: MENU_LOOKUP, title: 'Look up “%s” on Web3Lens', contexts: ['selection'] });
    menus.create({ id: MENU_EXPLORER, title: 'Open “%s” in its block explorer', contexts: ['selection'] });
  });
});

/** Where a query should go: the extension's result page, an explorer URL, or the search page. */
async function destination(text: string, mode: 'lookup' | 'explorer', chainId?: string): Promise<string> {
  const { query } = extractQuery(text.trim().slice(0, 300));
  const best = detectAll(query)[0];
  if (!best || best.kind === 'secret') return appUrl(`#search?q=${encodeURIComponent(query)}`);
  const chain = getChain(chainId ?? best.chains[0] ?? '');
  if (!chain) return appUrl(`#search?q=${encodeURIComponent(query)}`);
  const { prefs, settings } = await load();
  const d = detectionFor(chain, query);
  const kind = toQueryKind(d);
  if (mode === 'lookup' && settings.network && prefs.searchAction === 'results' && d && hasNativeSupport(chain.id, kind) && d.checksum !== 'invalid') {
    const evmNoChain = !chainId && (d.format === 'evm-address' || d.format === 'evm-tx');
    if (evmNoChain) return appUrl(`#search?q=${encodeURIComponent(d.normalized)}`);
    return appUrl(`#result/${kind === 'tx' ? 'tx' : 'address'}/${chain.id}/${encodeURIComponent(d.normalized)}`);
  }
  if (mode === 'lookup' && prefs.searchAction === 'results') return appUrl(`#search?q=${encodeURIComponent(query)}&chain=${chain.id}`);
  const r = resolveExplorer(chain, query, { explorer: prefs.explorers[chain.id] });
  // Form-based explorers need a page to submit from; the search page does that.
  return r.action.kind === 'url' && !r.unreachable ? r.action.href : appUrl(`#search?q=${encodeURIComponent(query)}&chain=${chain.id}`);
}

menus?.onClicked.addListener((info) => {
  const text = info.selectionText ?? '';
  if (!text.trim()) return;
  void destination(text, info.menuItemId === MENU_EXPLORER ? 'explorer' : 'lookup').then((url) => ext.tabs.create({ url }));
});

omnibox?.setDefaultSuggestion({ description: omniboxText('Web3Lens: paste an address, transaction hash, block or ENS name') });

omnibox?.onInputChanged.addListener((text, suggest) => {
  const { query } = extractQuery(text);
  const all = detectAll(query);
  const out: { content: string; description: string }[] = [];
  for (const d of all) {
    if (d.kind === 'secret') {
      omnibox.setDefaultSuggestion({ description: omniboxText(`⚠ ${d.label}: never paste secrets anywhere. Not searched.`) });
      return suggest([]);
    }
    for (const id of d.chains.slice(0, 5)) {
      const chain = getChain(id);
      if (chain) out.push({ content: `w3l:${id}:${d.normalized}`, description: omniboxText(`${d.label} on ${chain.name}${d.checksum === 'invalid' ? ' (checksum does not match!)' : ''}`) });
    }
  }
  omnibox.setDefaultSuggestion({ description: omniboxText(all[0] ? `${all[0].label}: look up on Web3Lens` : 'Web3Lens: search') });
  suggest(out.slice(0, 6));
});

omnibox?.onInputEntered.addListener((text, disposition) => {
  const m = /^w3l:([a-z0-9-]+):(.+)$/.exec(text);
  void destination(m ? m[2] : text, 'lookup', m?.[1]).then((url) => (disposition === 'currentTab' ? ext.tabs.update({ url }) : ext.tabs.create({ url })));
});
