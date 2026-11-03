/** Extension settings: search behaviour, explorers, favourite chains, privacy, data. */
import { allExplorerRoutes, getChain } from '@/lib/chains';
import { NETWORKS } from '@/lib/networks';
import { DEFAULT_PREFS } from '@/lib/prefs';
import { h } from '../dom';
import { t } from '../i18n';
import { browserLanguages, LOCALES, localeName, matchLocale, type LanguagePref } from '../locales';
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
  const language = h(
    'select',
    { class: 'select lang-select', 'aria-label': t('language.label') },
    h('option', { value: 'auto', selected: settings.language === 'auto' ? true : undefined }, t('language.auto', { language: localeName(matchLocale(browserLanguages())) })),
    LOCALES.map((l) => h('option', { value: l.code, lang: l.code, selected: settings.language === l.code ? true : undefined }, l.name)),
  );
  language.addEventListener('change', () => void setSettings({ ...settings, language: language.value as LanguagePref }));
  const network = h('input', { type: 'checkbox', checked: settings.network ? true : undefined });
  network.addEventListener('change', () => void setSettings({ ...settings, network: network.checked }));
  const multi = Object.entries(allExplorerRoutes()).filter(([, r]) => r.length > 1);

  return h(
    'div',
    { class: 'stack' },
    h('p', { class: 'label' }, t('common.settings')),
    h('h1', { class: 'heading' }, t('settings.pageTitle')),
    card(
      t('settings.appearance'),
      h(
        'div',
        { class: 'chips', role: 'radiogroup', 'aria-label': t('theme.label') },
        (['light', 'dark', 'system'] as const).map((th) =>
          h(
            'button',
            {
              type: 'button',
              role: 'radio',
              'aria-checked': String(settings.theme === th),
              class: `chip${settings.theme === th ? ' primary' : ''}`,
              on: { click: () => void setSettings({ ...settings, theme: th }) },
            },
            th === 'light' ? t('theme.lightDefault') : th === 'dark' ? t('theme.dark') : t('theme.system'),
          ),
        ),
      ),
    ),
    card(t('language.label'), h('label', { class: 'field' }, language, h('small', null, `${t('language.hint')} ${t('language.fallbackNote')}`))),
    card(t('settings.whenSearch'), radio('results', t('settings.resultsFirst'), t('settings.resultsFirstHint', { count: NETWORKS.length })), radio('explorer', t('settings.alwaysExplorer'), t('settings.alwaysExplorerHint'))),
    card(
      t('settings.privacy'),
      h('label', { class: 'choice' }, network, h('span', null, h('b', null, t('common.onlineLookups')), h('small', null, t('settings.privacyBody', { host: settings.apiBase })))),
      note(t('settings.privacyNote'), 'info'),
    ),
    card(
      t('settings.preferredExplorers'),
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
      t('settings.favouriteChains'),
      prefs.favouriteChains.length
        ? h('div', { class: 'chips' }, prefs.favouriteChains.map((id) => h('button', { type: 'button', class: 'chip', on: { click: () => void setPrefs({ ...prefs, favouriteChains: prefs.favouriteChains.filter((x) => x !== id) }) } }, `${getChain(id)?.name ?? id} ×`)))
        : h('p', { class: 'muted' }, t('settings.noneYet')),
      (() => {
        const add = h('input', { class: 'input', placeholder: t('settings.addChain'), list: 'chain-names' });
        add.addEventListener('change', () => {
          const id = Object.keys(allExplorerRoutes()).find((k) => getChain(k)?.name.toLowerCase() === add.value.trim().toLowerCase());
          if (id && !prefs.favouriteChains.includes(id)) void setPrefs({ ...prefs, favouriteChains: [...prefs.favouriteChains, id] });
        });
        return h('div', null, add, h('datalist', { id: 'chain-names' }, Object.keys(allExplorerRoutes()).map((id) => h('option', { value: getChain(id)?.name ?? id }))));
      })(),
    ),
    card(
      t('settings.data'),
      h('p', { class: 'muted' }, t('settings.dataBody')),
      h(
        'div',
        { class: 'row wrap' },
        h('button', { type: 'button', class: 'btn-ghost sm', on: { click: () => void clearRecent() } }, t('settings.clearRecent')),
        h('button', { type: 'button', class: 'btn-ghost sm', on: { click: () => confirm(t('settings.confirmDelete')) && void setSaved([]) } }, t('settings.deleteSaved')),
        h('button', { type: 'button', class: 'btn-ghost sm', on: { click: () => void setPrefs(DEFAULT_PREFS) } }, t('settings.resetPrefs')),
      ),
    ),
  );
}
