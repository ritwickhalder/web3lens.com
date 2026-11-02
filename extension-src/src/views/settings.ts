/** Extension settings: search behaviour, explorers, favourite chains, privacy, data. */
import { allExplorerRoutes, getChain } from '@/lib/chains';
import { DEFAULT_PREFS } from '@/lib/prefs';
import { h } from '../dom';
import { clearRecent, setPrefs, setSaved, setSettings } from '../store';
import { card, note } from './common';
import type { Ctx } from './search';

export function settingsView(ctx: Ctx): HTMLElement {
  const { prefs, settings } = ctx.state;
  const radio = (value: 'results' | 'explorer', title: string, body: string) =>
    h(
      'label',
      { class: 'choice' },
      h('input', { type: 'radio', name: 'action', checked: prefs.searchAction === value ? true : undefined, on: { change: () => void setPrefs({ ...prefs, searchAction: value }) } }),
      h('span', null, h('b', null, title), h('small', null, body)),
    );
  const network = h('input', { type: 'checkbox', checked: settings.network ? true : undefined });
  network.addEventListener('change', () => void setSettings({ ...settings, network: network.checked }));
  const multi = Object.entries(allExplorerRoutes()).filter(([, r]) => r.length > 1);

  return h(
    'div',
    { class: 'stack' },
    h('p', { class: 'label' }, 'Settings'),
    h('h1', { class: 'heading' }, 'Search your way'),
    card(
      'Appearance',
      h(
        'div',
        { class: 'chips', role: 'radiogroup', 'aria-label': 'Theme' },
        (['light', 'dark', 'system'] as const).map((t) =>
          h(
            'button',
            {
              type: 'button',
              role: 'radio',
              'aria-checked': String(settings.theme === t),
              class: `chip${settings.theme === t ? ' primary' : ''}`,
              on: { click: () => void setSettings({ ...settings, theme: t }) },
            },
            t === 'light' ? 'Light (default)' : t === 'dark' ? 'Dark' : 'System',
          ),
        ),
      ),
    ),
    card('When I press Search', radio('results', 'Show Web3Lens results first', 'Balances, tokens and risk checks for 14 major chains; other chains open their explorer.'), radio('explorer', 'Always open the block explorer', 'Go straight to the explorer in a new tab.')),
    card(
      'Privacy',
      h('label', { class: 'choice' }, network, h('span', null, h('b', null, 'Online lookups'), h('small', null, `Balances, transactions, risk checks and live gas are fetched from ${settings.apiBase} when you ask. Turn off to keep everything in the browser: detection, checksums, explorer links, tools and the bundled OFAC snapshot still work.`))),
      note('The extension has no host permissions and never reads pages unless you click “Find addresses on this page”.', 'info'),
    ),
    card(
      'Preferred explorers',
      h(
        'div',
        { class: 'grid2' },
        multi.map(([id, routes]) => {
          const sel = h('select', { class: 'select', 'aria-label': getChain(id)?.name }, routes.map((r) => h('option', { selected: (prefs.explorers[id] ?? routes[0].name) === r.name ? true : undefined }, r.name)));
          sel.addEventListener('change', () => {
            const explorers = { ...prefs.explorers };
            if (sel.value === routes[0].name) delete explorers[id];
            else explorers[id] = sel.value;
            void setPrefs({ ...prefs, explorers });
          });
          return h('label', { class: 'field' }, h('span', null, getChain(id)?.name ?? id), sel);
        }),
      ),
    ),
    card(
      'Favourite chains',
      prefs.favouriteChains.length
        ? h('div', { class: 'chips' }, prefs.favouriteChains.map((id) => h('button', { type: 'button', class: 'chip', on: { click: () => void setPrefs({ ...prefs, favouriteChains: prefs.favouriteChains.filter((x) => x !== id) }) } }, `${getChain(id)?.name ?? id} ×`)))
        : h('p', { class: 'muted' }, 'None yet.'),
      (() => {
        const add = h('input', { class: 'input', placeholder: 'Add a chain by name', list: 'chain-names' });
        add.addEventListener('change', () => {
          const id = Object.keys(allExplorerRoutes()).find((k) => getChain(k)?.name.toLowerCase() === add.value.trim().toLowerCase());
          if (id && !prefs.favouriteChains.includes(id)) void setPrefs({ ...prefs, favouriteChains: [...prefs.favouriteChains, id] });
        });
        return h('div', null, add, h('datalist', { id: 'chain-names' }, Object.keys(allExplorerRoutes()).map((id) => h('option', { value: getChain(id)?.name ?? id }))));
      })(),
    ),
    card(
      'Data',
      h('p', { class: 'muted' }, 'Everything is in this browser’s extension storage.'),
      h(
        'div',
        { class: 'row wrap' },
        h('button', { type: 'button', class: 'btn-ghost sm', on: { click: () => void clearRecent() } }, 'Clear recent searches'),
        h('button', { type: 'button', class: 'btn-ghost sm', on: { click: () => confirm('Delete all saved items?') && void setSaved([]) } }, 'Delete saved items'),
        h('button', { type: 'button', class: 'btn-ghost sm', on: { click: () => void setPrefs(DEFAULT_PREFS) } }, 'Reset preferences'),
      ),
    ),
  );
}
