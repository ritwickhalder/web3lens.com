/** Full-page extension app (app.html) and options page (options.html, fixed to settings). */
import { setApiBase } from '@/lib/api-client';
import { clear, h } from './dom';
import { load, onStorageChange } from './store';
import { batchView } from './views/batch';
import { resultView } from './views/results';
import { savedView } from './views/saved';
import { searchView, type Ctx } from './views/search';
import { settingsView } from './views/settings';
import { toolsView } from './views/tools';

const root = document.getElementById('app')!;
const fixed = document.body.dataset.view;

const TABS = [
  ['#search', 'Search'],
  ['#batch', 'Batch'],
  ['#tools', 'Tools'],
  ['#saved', 'Saved'],
  ['#settings', 'Settings'],
] as const;

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
      body = searchView(ctx, { query: params.get('q') ?? undefined, chain: params.get('chain') ?? undefined });
  }
  const header = h(
    'header',
    { class: 'topbar' },
    h('a', { href: '#search', class: 'brand' }, h('span', { class: 'mark' }, '◎'), 'Web3', h('span', { class: 'accent' }, 'Lens')),
    fixed ? null : h('nav', { class: 'tabs' }, TABS.map(([hash, label]) => h('a', { href: hash, class: `tab${view === hash.slice(1) || (view === 'result' && hash === '#search') ? ' active' : ''}` }, label))),
    h('a', { href: 'https://web3lens.com', target: '_blank', rel: 'noopener noreferrer', class: 'muted small' }, 'web3lens.com ↗'),
  );
  clear(root, header, h('main', { class: 'page' }, body));
  document.title = `Web3Lens · ${view[0].toUpperCase()}${view.slice(1)}`;
}

window.addEventListener('hashchange', () => void render());
// Re-render list-like views when storage changes elsewhere (popup, another tab); never mid-typing in search.
onStorageChange(() => {
  if (lastView === 'saved' || lastView === 'settings') void render();
});
void render();
