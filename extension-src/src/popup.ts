/** Toolbar popup: search with detection, compact results, quick actions, recent searches, page scan. */
import { setApiBase } from '@/lib/api-client';
import { detectAll } from '@/lib/detect';
import { shortHash } from '@/lib/format';
import { appUrl, ext, openTab } from './browser';
import { clear, h } from './dom';
import { scanPageForCandidates } from './scan';
import { load, setSettings, type ExtSettings } from './store';
import { brand, glyph, icon, iconButton, type IconName } from './ui';
import { errorText, loading } from './views/common';
import { searchView, type Ctx } from './views/search';
import { getChain } from '@/lib/chains';

const root = document.getElementById('app')!;
const THEME_NEXT: Record<ExtSettings['theme'], ExtSettings['theme']> = { dark: 'light', light: 'system', system: 'dark' };
const THEME_ICON: Record<ExtSettings['theme'], IconName> = { dark: 'moon', light: 'sun', system: 'desktop' };

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
    if (!found.length) return clear(out, h('p', { class: 'hint' }, 'No addresses or hashes found on this page.'));
    clear(
      out,
      h(
        'section',
        { class: 'card' },
        h('div', { class: 'section-head' }, h('p', { class: 'label' }, icon('scan'), `${found.length} found on this page`)),
        h(
          'ul',
          { class: 'recent-list' },
          found.map(({ s, d }) => {
            const c = d!.chains[0] ? getChain(d!.chains[0]) : undefined;
            return h(
              'li',
              null,
              h('button', { type: 'button', class: 'recent-item', on: { click: () => void render(s) } }, c ? glyph(c.id, c.name, 'sm') : null, h('span', { class: 'mono' }, shortHash(d!.normalized, 10, 6)), h('span', { class: 'muted small' }, d!.label)),
            );
          }),
        ),
        h('button', { type: 'button', class: 'btn-ghost sm', on: { click: () => void openTab(appUrl(`#batch?q=${encodeURIComponent(found.map((f) => f.d!.normalized).join('\n'))}`)) } }, icon('list'), 'Check all in batch'),
      ),
    );
  } catch (e) {
    clear(out, errorText(`Can't read this page: ${(e as Error).message}. Browser pages (settings, stores) can't be scanned.`));
  }
}

function tile(name: IconName, label: string, onClick: () => void) {
  return h('button', { type: 'button', class: 'tile', on: { click: onClick } }, icon(name, 'ic tile-ic', true), h('span', null, label));
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
      { class: 'popup-head' },
      brand(),
      h(
        'div',
        { class: 'row tight' },
        iconButton(THEME_ICON[state.settings.theme], `Theme: ${state.settings.theme}. Change`, async () => {
          await setSettings({ ...state.settings, theme: THEME_NEXT[state.settings.theme] });
          void render(query);
        }),
        iconButton('gear', 'Settings', () => void openTab(appUrl('#settings'))),
        iconButton('external', 'Open the full app', () => void openTab(appUrl('#search'))),
      ),
    ),
    h(
      'main',
      { class: 'popup-main' },
      searchView(ctx, query ? { query } : {}),
      scanOut,
      h(
        'nav',
        { class: 'tiles', 'aria-label': 'More' },
        tile('scan', 'Scan page', () => void scan(scanOut)),
        tile('list', 'Batch', () => void openTab(appUrl('#batch'))),
        tile('wrench', 'Tools', () => void openTab(appUrl('#tools'))),
        tile('bookmark', 'Saved', () => void openTab(appUrl('#saved'))),
      ),
    ),
    h(
      'footer',
      { class: 'popup-foot' },
      icon(state.settings.network ? 'shield' : 'cloudSlash'),
      h('span', null, state.settings.network ? `Lookups you run go to ${new URL(state.settings.apiBase).host}. Nothing else leaves your browser.` : 'Offline mode: nothing leaves your browser.'),
    ),
  );
}

void render();
