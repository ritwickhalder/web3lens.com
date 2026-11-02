/**
 * Toolbar popup (600 × 600): tabs for Lookup (search with detection and compact results, examples,
 * quick tools, tips), Scan page, inline Tools, live Gas and Saved. Theme and online status in the header.
 */
import { TOOLS, type ToolSlug } from '@/config/tools';
import { apiGet, setApiBase } from '@/lib/api-client';
import { CHAINS, getChain } from '@/lib/chains';
import { detectAll, detectQuery, EXAMPLES } from '@/lib/detect';
import { shortHash, timeAgo } from '@/lib/format';
import type { GasResult } from '@/lib/lookup-types';
import { EVM_NETWORKS, NETWORKS } from '@/lib/networks';
import { sanctionsSnapshotAt } from '@/lib/security/sanctions';
import { appUrl, ext, openTab } from './browser';
import { clear, h } from './dom';
import { scanPageForCandidates } from './scan';
import { load, onStorageChange, setSettings, upsertSaved, type ExtSettings } from './store';
import { brand, glyph, heroIllustration, icon, iconButton, spot, TOOL_ICONS, type IconName } from './ui';
import { errorText, loading, note } from './views/common';
import { searchView, type Ctx, type State } from './views/search';
import { toolBody } from './views/tools';

type Tab = 'lookup' | 'scan' | 'tools' | 'gas' | 'saved';

const TABS: [Tab, string, IconName][] = [
  ['lookup', 'Lookup', 'search'],
  ['scan', 'Scan page', 'scan'],
  ['tools', 'Tools', 'wrench'],
  ['gas', 'Gas', 'gas'],
  ['saved', 'Saved', 'bookmark'],
];
const THEMES: [ExtSettings['theme'], string, IconName][] = [
  ['light', 'Light', 'sun'],
  ['dark', 'Dark', 'moon'],
  ['system', 'System', 'desktop'],
];

const root = document.getElementById('app')!;
let state: State;
let active: Tab = 'lookup';
let tool: ToolSlug = TOOLS[0].slug;
const panels = new Map<Tab, HTMLElement>();
const main = h('main', { class: 'popup-main', id: 'popup-panel', role: 'tabpanel' });
const tabButtons = new Map<Tab, HTMLButtonElement>();
const savedCount = h('span', { class: 'count' });
/** Repaints the Saved list in place (keeps the filter text) once it has been built. */
let refreshSaved: (() => void) | null = null;

const ctx = (): Ctx => ({ state, nav: (hash) => void openTab(appUrl(hash)), compact: true });

function show(tab: Tab) {
  active = tab;
  for (const [t, b] of tabButtons) {
    b.setAttribute('aria-selected', String(t === tab));
    b.tabIndex = t === tab ? 0 : -1;
  }
  let panel = panels.get(tab);
  if (!panel) {
    panel = build(tab);
    panels.set(tab, panel);
  }
  main.setAttribute('aria-labelledby', `tab-${tab}`);
  clear(main, panel);
  main.scrollTop = 0;
}

function build(tab: Tab): HTMLElement {
  switch (tab) {
    case 'lookup':
      return lookupPanel();
    case 'scan':
      return scanPanel();
    case 'tools':
      return toolsPanel();
    case 'gas':
      return gasPanel();
    case 'saved':
      return savedPanel();
  }
}

/** Switches to Lookup with a fresh search for `query` (from examples, scan results, saved items). */
function lookup(query?: string, chain?: string) {
  panels.set('lookup', lookupPanel(query, chain));
  show('lookup');
}

function openTool(slug: ToolSlug) {
  tool = slug;
  panels.delete('tools');
  show('tools');
}

// ---------------------------------------------------------------- Lookup

function sectionHead(ic: IconName, title: string, extra?: Node | null) {
  return h('div', { class: 'section-head' }, h('p', { class: 'label' }, icon(ic), title), extra ?? null);
}

function lookupPanel(query?: string, chain?: string): HTMLElement {
  const hero = h(
    'section',
    { class: 'p-hero dot-grid' },
    h(
      'div',
      { class: 'p-hero-text' },
      h('h1', null, 'Look up anything, on ', h('span', { class: 'accent' }, 'any chain.')),
      h('p', null, 'Paste an address, transaction, block or name. Web3Lens recognises the format, picks the chain and checks it.'),
    ),
    heroIllustration(),
  );

  const examples = h(
    'section',
    null,
    sectionHead('sparkle', 'Try an example'),
    h(
      'div',
      { class: 'examples' },
      EXAMPLES.map((ex) =>
        h(
          'button',
          { type: 'button', class: 'example', title: ex.query, on: { click: () => lookup(ex.query) } },
          glyph(ex.icon, ex.note, 'md'),
          h('span', { class: 'example-text' }, h('span', { class: 'example-title' }, ex.note), h('span', { class: 'example-q' }, shortHash(ex.query, 12, 6))),
        ),
      ),
    ),
  );

  const quick: [IconName, string, string, () => void][] = [
    ['scan', 'Scan page', 'Find addresses on this tab', () => show('scan')],
    ['list', 'Batch check', 'Up to 50 at once, CSV', () => void openTab(appUrl('#batch'))],
    ['gas', 'Gas tracker', `${EVM_NETWORKS.length} chains + Bitcoin`, () => show('gas')],
    [TOOL_ICONS['unit-converter'], 'Units', 'wei · gwei · ETH, sats', () => openTool('unit-converter')],
    [TOOL_ICONS['address-validator'], 'Validator', 'Checksums, OFAC list', () => openTool('address-validator')],
    [TOOL_ICONS['hex-converter'], 'Hex & hashes', 'keccak256, SHA-256', () => openTool('hex-converter')],
    [TOOL_ICONS['timestamp-converter'], 'Timestamps', 'Unix ↔ date', () => openTool('timestamp-converter')],
    [TOOL_ICONS['abi-decoder'], 'Calldata', 'Decode function calls', () => openTool('abi-decoder')],
  ];
  const tools = h(
    'section',
    null,
    sectionHead('wrench', 'Quick tools', h('button', { type: 'button', class: 'linkish small', on: { click: () => show('tools') } }, 'All tools', icon('arrowRight', 'ic xs'))),
    h(
      'nav',
      { class: 'qtools', 'aria-label': 'Quick tools' },
      quick.map(([ic, title, sub, go]) => h('button', { type: 'button', class: 'qtool', on: { click: go } }, spot(ic), h('span', { class: 'qtool-title' }, title), h('span', { class: 'qtool-sub' }, sub))),
    ),
  );

  const stats = h(
    'div',
    { class: 'stats' },
    h('div', { class: 'stat' }, h('b', null, String(CHAINS.length)), h('span', null, 'blockchains detected and routed')),
    h('div', { class: 'stat' }, h('b', null, String(NETWORKS.length)), h('span', null, 'with live balances and risk checks')),
    h('div', { class: 'stat' }, h('b', null, new Date(sanctionsSnapshotAt()).toISOString().slice(0, 10)), h('span', null, 'OFAC list snapshot, checked locally')),
  );

  const tips = h(
    'section',
    { class: 'card tips-card' },
    sectionHead('lightbulb', 'Faster ways in'),
    h(
      'ul',
      { class: 'tips' },
      h('li', { class: 'tip' }, spot('cursor'), h('span', null, h('b', null, 'Right-click'), ' any selected address or hash and choose ', h('i', null, 'Look up on Web3Lens'), '.')),
      h('li', { class: 'tip' }, spot('keyboard'), h('span', null, 'Type ', h('kbd', { class: 'kbd' }, 'w3'), ' then a space in the address bar, and paste.')),
      h('li', { class: 'tip' }, spot('sparkle'), h('span', null, 'Open this popup with ', h('kbd', { class: 'kbd' }, 'Alt'), ' ', h('kbd', { class: 'kbd' }, 'Shift'), ' ', h('kbd', { class: 'kbd' }, 'W'), '.')),
    ),
    stats,
  );

  return h('div', { class: 'stack loose' }, hero, searchView(ctx(), { query, chain }), examples, tools, tips);
}

// ---------------------------------------------------------------- Scan page

function scanPanel(): HTMLElement {
  const host = h('span', { class: 'mono small faint' }, '…');
  const out = h('div', { class: 'stack' });
  const run = async () => {
    clear(out, loading('Reading this page…'));
    try {
      const [tab] = await ext.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('No active tab');
      try {
        host.textContent = tab.url ? new URL(tab.url).host || tab.url : tab.title ?? 'this tab';
      } catch {
        host.textContent = tab.title ?? 'this tab';
      }
      const [res] = await ext.scripting.executeScript({ target: { tabId: tab.id }, func: scanPageForCandidates });
      const found = (res?.result ?? [])
        .map((s) => ({ s, d: detectAll(s)[0] }))
        .filter((x) => x.d && x.d.kind !== 'secret' && x.d.kind !== 'block' && x.d.format !== 'hex64')
        .slice(0, 40);
      if (!found.length) {
        return clear(out, h('div', { class: 'empty' }, spot('scan', 'lg'), h('h2', null, 'Nothing found'), h('p', null, 'No addresses, transaction hashes or names on this page. Select text and right-click to look it up instead.')));
      }
      const all = found.map((f) => f.d!.normalized);
      clear(
        out,
        h(
          'div',
          { class: 'section-head' },
          h('p', { class: 'label' }, icon('checkCircle'), `${found.length} found`),
          h(
            'div',
            { class: 'row' },
            h(
              'button',
              {
                type: 'button',
                class: 'btn-ghost sm',
                on: {
                  click: async (e: Event) => {
                    const btn = e.currentTarget as HTMLElement;
                    await navigator.clipboard.writeText(all.join('\n')).catch(() => {});
                    btn.replaceChildren(icon('check'), 'Copied');
                  },
                },
              },
              icon('copy'),
              'Copy all',
            ),
            h('button', { type: 'button', class: 'btn-ghost sm', on: { click: () => void openTab(appUrl(`#batch?q=${encodeURIComponent(all.join('\n'))}`)) } }, icon('list'), 'Check all in batch'),
          ),
        ),
        h(
          'ul',
          { class: 'scan-list' },
          found.map(({ s, d }) => {
            const c = d!.chains[0] ? getChain(d!.chains[0]) : undefined;
            return h(
              'li',
              null,
              h(
                'button',
                { type: 'button', class: 'recent-item boxed', title: d!.normalized, on: { click: () => lookup(s) } },
                c ? glyph(c.id, c.name, 'sm') : spot('hash'),
                h('span', { class: 'item-text' }, h('span', { class: 'mono' }, shortHash(d!.normalized, 10, 6)), h('span', { class: 'muted small' }, `${d!.label}${c ? ` · ${c.name}` : ''}`)),
                icon('arrowRight', 'ic xs faint'),
              ),
            );
          }),
        ),
      );
    } catch (e) {
      clear(out, h('div', { class: 'empty' }, spot('shieldWarning', 'lg'), h('h2', null, 'Can’t read this page'), h('p', null, `${(e as Error).message}. Browser pages (settings, extension stores, new tabs) can’t be scanned.`)));
    }
  };
  void run();
  return h(
    'div',
    { class: 'stack loose' },
    h(
      'section',
      { class: 'p-banner' },
      spot('scan', 'lg'),
      h('div', { class: 'p-banner-text' }, h('h2', null, 'Addresses on this page'), h('p', null, 'Reads the visible text of the current tab once, only when you open this tab. Nothing is sent anywhere.'), host),
      h('button', { type: 'button', class: 'btn-ghost', on: { click: () => void run() } }, icon('refresh'), 'Rescan'),
    ),
    out,
  );
}

// ---------------------------------------------------------------- Tools

function toolsPanel(): HTMLElement {
  const current = TOOLS.find((t) => t.slug === tool) ?? TOOLS[0];
  const nav = h(
    'nav',
    { class: 'tool-nav', 'aria-label': 'Tools' },
    TOOLS.map((t) => h('button', { type: 'button', class: 'tool-link', 'aria-current': String(t.slug === current.slug), on: { click: () => openTool(t.slug) } }, icon(TOOL_ICONS[t.slug] ?? 'hash', 'ic', true), t.title)),
    h('button', { type: 'button', class: 'tool-link', on: { click: () => show('gas') } }, icon('gas', 'ic', true), 'Gas tracker'),
    h('button', { type: 'button', class: 'tool-link', on: { click: () => void openTab(appUrl('#batch')) } }, icon('list', 'ic', true), 'Batch check', icon('external', 'ic xs faint')),
  );
  return h(
    'div',
    { class: 'tools-layout' },
    nav,
    h(
      'section',
      { class: 'tool-pane' },
      h(
        'div',
        { class: 'tool-head' },
        spot(TOOL_ICONS[current.slug] ?? 'hash'),
        h('div', null, h('h2', null, current.title), h('p', { class: 'muted small' }, current.description)),
      ),
      ...toolBody(current.slug, state.settings),
      h('button', { type: 'button', class: 'linkish small', on: { click: () => void openTab(appUrl(`#tools/${current.slug}`)) } }, icon('external', 'ic xs'), 'Open in a full tab'),
    ),
  );
}

// ---------------------------------------------------------------- Gas

function gwei(v: number): string {
  return v < 0.0001 ? '<0.0001' : Number(v.toPrecision(3)).toString();
}

function gasPanel(): HTMLElement {
  const out = h('div', { class: 'stack' });
  const refresh = h('button', { type: 'button', class: 'btn-ghost sm', on: { click: () => void run() } }, icon('refresh'), 'Refresh');
  const run = async () => {
    if (!state.settings.network) {
      return clear(out, h('div', { class: 'empty' }, spot('cloudSlash', 'lg'), h('h2', null, 'Offline mode'), h('p', null, 'Live gas needs an online lookup. Turn on online lookups in settings, or use the gas calculator with your own numbers.'), h('button', { type: 'button', class: 'btn-ghost sm', on: { click: () => openTool('gas-calculator') } }, icon('gas'), 'Gas calculator')));
    }
    clear(out, loading('Loading live gas prices…'));
    try {
      const g = await apiGet<GasResult>('gas', {});
      const btc = g.bitcoin;
      clear(
        out,
        h('p', { class: 'label' }, glyph('bitcoin', 'Bitcoin', 'xs'), 'Bitcoin fee rates'),
        btc.status === 'ok'
          ? h(
              'div',
              { class: 'fee-grid' },
              (
                [
                  ['Next block', btc.data.fastest],
                  ['~30 min', btc.data.halfHour],
                  ['~1 hour', btc.data.hour],
                  ['Economy', btc.data.economy],
                ] as [string, number][]
              ).map(([label, v], i) => h('div', { class: `fee${i === 0 ? ' hot' : ''}` }, h('span', { class: 'fee-label' }, label), h('span', { class: 'fee-value' }, String(v), h('span', { class: 'fee-unit' }, ' sat/vB')))),
            )
          : note(`Bitcoin fees unavailable: ${btc.reason}`, 'warn'),
        h('p', { class: 'label' }, icon('gas'), 'EVM gas price · cost of a transfer'),
        h(
          'ul',
          { class: 'gas-list' },
          g.evm.map((r) => {
            const net = EVM_NETWORKS.find((n) => n.id === r.chain.id);
            const price = net?.coingecko ? g.prices[net.coingecko] : undefined;
            const eff = r.status === 'ok' ? (r.baseFeeGwei ? Number(r.baseFeeGwei) + Number(r.priorityFeeGwei ?? 0) : Number(r.gasPriceGwei)) : null;
            return h(
              'li',
              { class: 'gas-row' },
              glyph(r.chain.id, r.chain.name, 'sm'),
              h('span', { class: 'item-text' }, h('span', { class: 'gas-name' }, r.chain.name), h('span', { class: 'gas-sub' }, eff !== null && price !== undefined ? `$${(eff * 1e-9 * 21000 * price).toFixed(4)} transfer` : r.status === 'ok' ? 'no USD price' : (r.reason ?? 'unavailable'))),
              r.status === 'ok' ? h('span', { class: 'gas-gwei' }, gwei(Number(r.gasPriceGwei)), h('small', null, r.stale ? 'gwei · stale' : 'gwei')) : h('span', { class: 'badge warn' }, 'n/a'),
            );
          }),
        ),
        h('p', { class: 'source' }, `Public RPCs, mempool.space, CoinGecko · fetched ${timeAgo(g.fetchedAt)}. Rollups add an L1 data fee.`),
      );
    } catch (e) {
      clear(out, errorText((e as Error).message));
    }
  };
  void run();
  return h(
    'div',
    { class: 'stack loose' },
    h(
      'section',
      { class: 'p-banner' },
      spot('gas', 'lg'),
      h('div', { class: 'p-banner-text' }, h('h2', null, 'Live network fees'), h('p', null, `Gas on ${EVM_NETWORKS.length} EVM chains and Bitcoin fee rates, with the dollar cost of a plain transfer.`)),
      refresh,
    ),
    out,
    h('div', { class: 'row wrap' }, h('button', { type: 'button', class: 'btn-ghost sm', on: { click: () => openTool('gas-calculator') } }, icon('gas'), 'Fee calculator'), h('button', { type: 'button', class: 'btn-ghost sm', on: { click: () => void openTab(appUrl('#tools/gas-tracker')) } }, icon('external'), 'Open full tracker')),
  );
}

// ---------------------------------------------------------------- Saved

function savedPanel(): HTMLElement {
  const filter = h('input', { class: 'input', placeholder: 'Filter by label, address or note', 'aria-label': 'Filter saved items' });
  const list = h('ul', { class: 'saved-list' });
  const render = () => {
    const f = filter.value.trim().toLowerCase();
    const items = [...state.saved]
      .filter((x) => !f || x.label.toLowerCase().includes(f) || x.query.toLowerCase().includes(f) || x.note.toLowerCase().includes(f))
      .sort((a, b) => Number(b.favourite) - Number(a.favourite) || b.addedAt - a.addedAt);
    if (!state.saved.length) {
      return clear(list, h('li', { class: 'empty' }, spot('bookmark', 'lg'), h('h2', null, 'Nothing saved yet'), h('p', null, 'Press Save after a search to keep an address or transaction here with a label and notes. Saved items stay in this browser.')));
    }
    if (!items.length) return clear(list, h('li', { class: 'hint' }, `Nothing matches “${filter.value}”.`));
    clear(
      list,
      items.map((item) => {
        const d = detectQuery(item.query);
        const c = item.chainId ? getChain(item.chainId) : undefined;
        return h(
          'li',
          { class: 'saved-row' },
          c ? glyph(c.id, c.name, 'md') : spot('hash'),
          h(
            'button',
            { type: 'button', class: 'saved-main', title: item.query, on: { click: () => lookup(item.query, item.chainId ?? undefined) } },
            h('span', { class: 'saved-title' }, item.label || shortHash(item.query, 12, 8)),
            h('span', { class: 'saved-sub' }, item.label ? h('span', { class: 'mono' }, shortHash(item.query, 10, 6)) : null, `${item.label ? ' · ' : ''}${d?.label ?? 'unrecognised'}${c ? ` · ${c.name}` : ''}`),
            item.note ? h('span', { class: 'saved-note' }, item.note) : null,
          ),
          h(
            'button',
            {
              type: 'button',
              class: `star${item.favourite ? ' on' : ''}`,
              'aria-pressed': String(item.favourite),
              'aria-label': item.favourite ? 'Unpin' : 'Pin to the top',
              title: item.favourite ? 'Unpin' : 'Pin to the top',
              on: { click: () => void upsertSaved({ query: item.query, chainId: item.chainId, favourite: !item.favourite }) },
            },
            icon('star'),
          ),
        );
      }),
    );
  };
  filter.addEventListener('input', render);
  render();
  refreshSaved = render;
  return h(
    'div',
    { class: 'stack' },
    h('div', { class: 'row' }, h('div', { class: 'input-icon' }, icon('search'), filter), h('button', { type: 'button', class: 'btn-ghost', on: { click: () => void openTab(appUrl('#saved')) } }, icon('external'), 'Manage')),
    list,
    state.saved.length ? h('p', { class: 'hint row' }, icon('info'), 'Click an item to look it up. Edit labels and notes, export, import or share them under Manage.') : null,
  );
}

// ---------------------------------------------------------------- Shell

function applyTheme(theme: ExtSettings['theme']) {
  document.documentElement.dataset.theme = theme;
}

function header(): HTMLElement {
  const seg = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Theme' });
  const paintSeg = () =>
    clear(
      seg,
      THEMES.map(([t, label, ic]) =>
        h(
          'button',
          {
            type: 'button',
            role: 'radio',
            'aria-checked': String(state.settings.theme === t),
            'aria-label': `${label} theme`,
            title: `${label} theme`,
            on: {
              click: async () => {
                state.settings = { ...state.settings, theme: t };
                applyTheme(t);
                paintSeg();
                await setSettings(state.settings);
              },
            },
          },
          icon(ic),
        ),
      ),
    );
  paintSeg();
  const online = state.settings.network;
  return h(
    'header',
    { class: 'popup-head' },
    brand(),
    h(
      'div',
      { class: 'row' },
      h(
        'button',
        { type: 'button', class: `status-pill${online ? '' : ' off'}`, title: online ? `Lookups go to ${new URL(state.settings.apiBase).host}` : 'Nothing leaves your browser', on: { click: () => void openTab(appUrl('#settings')) } },
        h('span', { class: 'status-dot', 'aria-hidden': 'true' }),
        online ? 'Online' : 'Offline mode',
      ),
      seg,
      iconButton('gear', 'Settings', () => void openTab(appUrl('#settings'))),
      iconButton('external', 'Open the full app in a tab', () => void openTab(appUrl('#search'))),
    ),
  );
}

function tabBar(): HTMLElement {
  tabButtons.clear();
  const bar = h(
    'nav',
    { class: 'popup-tabs', role: 'tablist', 'aria-label': 'Sections' },
    TABS.map(([t, label, ic]) => {
      const b = h('button', { type: 'button', class: 'ptab', role: 'tab', id: `tab-${t}`, 'aria-controls': 'popup-panel', on: { click: () => show(t) } }, icon(ic), label, t === 'saved' ? savedCount : null);
      tabButtons.set(t, b);
      return b;
    }),
  );
  bar.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = TABS.findIndex(([t]) => t === active);
    const next = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length][0];
    show(next);
    tabButtons.get(next)?.focus();
  });
  return bar;
}

function paintSavedCount() {
  savedCount.textContent = String(state.saved.length);
  savedCount.hidden = !state.saved.length;
}

async function render() {
  state = await load();
  setApiBase(state.settings.apiBase);
  applyTheme(state.settings.theme);
  paintSavedCount();
  const version = ext.runtime.getManifest().version;
  clear(
    root,
    h(
      'div',
      { class: 'popup-shell' },
      header(),
      tabBar(),
      main,
      h(
        'footer',
        { class: 'popup-foot' },
        h(
          'span',
          { class: 'row' },
          icon(state.settings.network ? 'shield' : 'cloudSlash'),
          state.settings.network ? `Lookups you run go to ${new URL(state.settings.apiBase).host}. Nothing else leaves your browser.` : 'Offline mode: nothing leaves your browser.',
        ),
        h('span', { class: 'faint' }, `v${version}`),
      ),
    ),
  );
  show(active);
}

// Saved items and stars change from this popup and from the app: keep the count and the Saved tab fresh.
onStorageChange(async () => {
  const next = await load();
  state.saved = next.saved;
  state.recent = next.recent;
  paintSavedCount();
  refreshSaved?.();
});

void render();
