/** Full-page extension app (app.html) and options page (options.html, fixed to settings). */
import { setApiBase } from '@/lib/api-client';
import { EVM_NETWORKS } from '@/lib/networks';
import { clear, h } from './dom';
import { applyLanguage, locale, t, tx, type MessageKey } from './i18n';
import { refreshAlertBadge } from './watches';
import { load, onStorageChange, setSettings, type ExtSettings } from './store';
import { brand, icon, type IconName } from './ui';
import { batchView } from './views/batch';
import { resultView } from './views/results';
import { savedView } from './views/saved';
import { searchView, type Ctx } from './views/search';
import { settingsView } from './views/settings';
import { toolsView } from './views/tools';

const root = document.getElementById('app')!;
const fixed = document.body.dataset.view;

const NAV: [hash: string, label: MessageKey, icon: IconName][] = [
  ['#search', 'common.search', 'search'],
  ['#batch', 'app.batch', 'list'],
  ['#tools', 'common.tools', 'wrench'],
  ['#saved', 'common.saved', 'bookmark'],
  ['#settings', 'common.settings', 'gear'],
];
const THEME_NAME: Record<ExtSettings['theme'], MessageKey> = { dark: 'theme.dark', light: 'theme.light', system: 'theme.system' };
const VIEW_TITLE: Record<string, MessageKey> = {
  search: 'app.view.search',
  result: 'app.view.result',
  batch: 'app.view.batch',
  tools: 'app.view.tools',
  saved: 'app.view.saved',
  settings: 'app.view.settings',
};
const THEME_NEXT: Record<ExtSettings['theme'], ExtSettings['theme']> = { dark: 'light', light: 'system', system: 'dark' };
const THEME_ICON: Record<ExtSettings['theme'], IconName> = { dark: 'moon', light: 'sun', system: 'desktop' };

function nav(hash: string) {
  if (fixed) {
    window.open(`app.html${hash}`, '_blank');
    return;
  }
  if (location.hash === hash) void render();
  else location.hash = hash;
}

function parse(hash: string): { view: string; parts: string[]; params: URLSearchParams } {
  const [path, query = ''] = hash.replace(/^#/, '').split('?');
  const parts = path.split('/').map((p) => {
    try {
      return decodeURIComponent(p);
    } catch {
      return p;
    }
  });
  return { view: parts[0] || 'search', parts, params: new URLSearchParams(query) };
}

let lastView = '';

async function render() {
  const state = await load();
  setApiBase(state.settings.apiBase);
  document.documentElement.dataset.theme = state.settings.theme;
  applyLanguage(state.settings.language);
  const ctx: Ctx = { state, nav, compact: false };
  const { view, parts, params } = fixed ? { view: fixed, parts: [fixed], params: new URLSearchParams() } : parse(location.hash);
  lastView = view;
  let body: HTMLElement;
  switch (view) {
    case 'result':
      body = resultView(parts[1] === 'tx' ? 'tx' : 'address', parts[2] ?? '', parts.slice(3).join('/'), state.settings, nav);
      break;
    case 'batch':
      body = batchView(ctx, params.get('q') ?? '');
      break;
    case 'tools':
      body = toolsView(parts[1], state.settings, nav);
      break;
    case 'saved':
      body = savedView(ctx);
      break;
    case 'settings':
      body = settingsView(ctx);
      break;
    default:
      body = h(
        'div',
        { class: 'stack' },
        h('section', { class: 'hero dot-grid' }, h('p', { class: 'label' }, t('common.search')), h('h1', { class: 'heading' }, ...tx('hero.title', { accent: h('span', { class: 'accent' }, t('hero.titleAccent')) })), h('p', { class: 'lead' }, t('hero.appLead'))),
        searchView(ctx, { query: params.get('q') ?? undefined, chain: params.get('chain') ?? undefined }),
        h(
          'nav',
          { class: 'feature-grid', 'aria-label': t('app.moreTools') },
          (
            [
              ['#batch', 'list', t('app.batchSearch'), t('app.batchSearchBody')],
              ['#tools/gas-tracker', 'gas', t('common.gasTracker'), t('common.liveFees', { count: EVM_NETWORKS.length })],
              ['#tools', 'wrench', t('common.developerTools'), t('app.devToolsBody')],
              ['#saved', 'bookmark', t('common.saved'), t('app.savedBody')],
            ] as [string, IconName, string, string][]
          ).map(([hash, ic, title, body]) => h('a', { href: hash, class: 'feature' }, icon(ic, 'ic feature-ic', true), h('span', { class: 'feature-title' }, title), h('span', { class: 'feature-body' }, body))),
        ),
      );
  }
  const active = view === 'result' ? 'search' : view;
  const sidebar = h(
    'aside',
    { class: 'sidebar' },
    h('a', { href: '#search', class: 'side-brand' }, brand()),
    fixed
      ? h('p', { class: 'side-note' }, t('settings.options'))
      : h(
          'nav',
          { class: 'side-nav', 'aria-label': t('common.sections') },
          NAV.map(([hash, label, ic]) => h('a', { href: hash, class: `side-link${active === hash.slice(1) ? ' active' : ''}`, 'aria-current': active === hash.slice(1) ? 'page' : undefined }, icon(ic), t(label))),
        ),
    h(
      'div',
      { class: 'side-foot' },
      h(
        'button',
        {
          type: 'button',
          class: 'side-link',
          on: {
            click: async () => {
              await setSettings({ ...state.settings, theme: THEME_NEXT[state.settings.theme] });
              void render();
            },
          },
        },
        icon(THEME_ICON[state.settings.theme]),
        t('theme.current', { theme: t(THEME_NAME[state.settings.theme]) }),
      ),
      h('a', { href: 'https://web3lens.com', target: '_blank', rel: 'noopener noreferrer', class: 'side-link' }, icon('external'), 'web3lens.com'),
    ),
  );
  clear(root, h('div', { class: 'app-shell' }, sidebar, h('main', { class: 'page' }, body)));
  document.title = `Web3Lens · ${VIEW_TITLE[view] ? t(VIEW_TITLE[view]) : view}`;
}

window.addEventListener('hashchange', () => void render());
// Re-render list-like views when storage changes elsewhere (popup, another tab); never mid-typing in search.
// A language change from the popup or the options page repaints whatever is open.
onStorageChange(async () => {
  if (lastView === 'saved' || lastView === 'settings') return void render();
  const { settings } = await load();
  const before = locale();
  if (applyLanguage(settings.language) !== before) void render();
});
void render();
void load().then(({ settings }) => {
  if (settings.network) refreshAlertBadge().catch(() => {});
});
