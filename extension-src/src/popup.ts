/** Toolbar popup: search with detection, compact results, recent searches, page scan. */
import { setApiBase } from '@/lib/api-client';
import { detectAll } from '@/lib/detect';
import { shortHash } from '@/lib/format';
import { appUrl, ext, openTab } from './browser';
import { clear, h } from './dom';
import { scanPageForCandidates } from './scan';
import { load } from './store';
import { errorText, loading } from './views/common';
import { searchView, type Ctx } from './views/search';

const root = document.getElementById('app')!;

async function scan(out: HTMLElement) {
  clear(out, loading('Reading this page…'));
  try {
    const [tab] = await ext.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('No active tab');
    const [res] = await ext.scripting.executeScript({ target: { tabId: tab.id }, func: scanPageForCandidates });
    const found = (res?.result ?? [])
      .map((s) => ({ s, d: detectAll(s)[0] }))
      .filter((x) => x.d && x.d.kind !== 'secret' && x.d.kind !== 'block' && x.d.format !== 'hex64')
      .slice(0, 40);
    if (!found.length) return clear(out, h('p', { class: 'muted' }, 'No addresses or hashes found on this page.'));
    clear(
      out,
      h('p', { class: 'label' }, `${found.length} found on this page`),
      h(
        'ul',
        { class: 'list' },
        found.map(({ s, d }) =>
          h('li', null, h('button', { type: 'button', class: 'linkish mono', on: { click: () => void render(s) } }, shortHash(d!.normalized, 10, 6)), h('span', { class: 'muted small' }, d!.label)),
        ),
      ),
      h('button', { type: 'button', class: 'btn-ghost sm', on: { click: () => void openTab(appUrl(`#batch?q=${encodeURIComponent(found.map((f) => f.d!.normalized).join('\n'))}`)) } }, 'Check all in batch ↗'),
    );
  } catch (e) {
    clear(out, errorText(`Can't read this page: ${(e as Error).message}. Browser pages (settings, stores) can't be scanned.`));
  }
}

async function render(query?: string) {
  const state = await load();
  setApiBase(state.settings.apiBase);
  document.documentElement.dataset.theme = state.settings.theme;
  const ctx: Ctx = { state, nav: (hash) => void openTab(appUrl(hash)), compact: true };
  const scanOut = h('div');
  clear(
    root,
    h(
      'header',
      { class: 'topbar' },
      h('span', { class: 'brand' }, h('span', { class: 'mark' }, '◎'), 'Web3', h('span', { class: 'accent' }, 'Lens')),
      h('button', { type: 'button', class: 'linkish small', on: { click: () => void openTab(appUrl('#search')) } }, 'Full app ↗'),
    ),
    h('main', { class: 'page' }, searchView(ctx, query ? { query } : {}), h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn-ghost sm', on: { click: () => void scan(scanOut) } }, 'Find addresses on this page')), scanOut),
    h(
      'footer',
      { class: 'footer' },
      ...(
        [
          ['#batch', 'Batch'],
          ['#tools', 'Tools'],
          ['#saved', 'Saved'],
          ['#settings', 'Settings'],
        ] as const
      ).map(([hash, label]) => h('button', { type: 'button', class: 'linkish', on: { click: () => void openTab(appUrl(hash)) } }, label)),
      h('p', { class: 'muted small' }, state.settings.network ? `Lookups you run are sent to ${new URL(state.settings.apiBase).host}.` : 'Offline mode: nothing leaves your browser.'),
    ),
  );
}

void render();
