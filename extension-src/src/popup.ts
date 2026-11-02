/**
 * Toolbar popup (780 × 600): tabs for Lookup (search with detection and compact results, recents,
 * examples), Scan page, inline Tools, live Gas and Saved, each laid out to fit without scrolling.
 * Settings and Info (shortcuts, links, the developer's other tools) open as dialogs over the popup.
 */
import { TOOLS, type ToolSlug } from '@/config/tools';
import { apiGet, setApiBase } from '@/lib/api-client';
import { CHAINS, getChain } from '@/lib/chains';
import { detectAll, detectQuery, EXAMPLES } from '@/lib/detect';
import { shortHash } from '@/lib/format';
import type { GasResult } from '@/lib/lookup-types';
import { EVM_NETWORKS, NETWORKS } from '@/lib/networks';
import { sanctionsSnapshotAt } from '@/lib/security/sanctions';
import { appUrl, ext, openTab } from './browser';
import { clear, ext_link, h } from './dom';
import { scanPageForCandidates } from './scan';
import { clearRecent, load, onStorageChange, setPrefs, setSettings, upsertSaved, type ExtSettings } from './store';
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
/** The developer's other products, shown in the Info dialog. */
const OTHER_TOOLS: [name: string, about: string, url: string, icon: IconName][] = [
  ['SummaryTube', 'YouTube video summaries', 'https://summarytube.com', 'play'],
  ['CentPage', 'The best internet startpage', 'https://centpage.com', 'layout'],
  ['Super Session Manager', 'Save and restore tabs', 'https://sessionmanager.net', 'stack'],
  ['Web Developer Tools', 'Tools for web developers', 'https://webdevelopertools.dev', 'code'],
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
const apiHost = () => new URL(state.settings.apiBase).host;

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

function sectionHead(ic: IconName, title: string, extra?: Node | null) {
  return h('div', { class: 'section-head' }, h('p', { class: 'label' }, icon(ic), title), extra ?? null);
}

// ---------------------------------------------------------------- Lookup

function lookupPanel(query?: string, chain?: string): HTMLElement {
  const hero = h(
    'section',
    { class: 'p-hero dot-grid' },
    h(
      'div',
      { class: 'p-hero-text' },
      h('h1', null, 'Look up anything, on ', h('span', { class: 'accent' }, 'any chain.')),
      h('p', null, `Paste an address, transaction, block or name. Web3Lens finds its chain among ${CHAINS.length}.`),
    ),
    heroIllustration(),
  );
  const recent = h('div', { class: 'idle-col' });
  const examples = h(
    'section',
    { class: 'idle-col' },
    sectionHead('sparkle', 'Try an example'),
    h(
      'div',
      { class: 'examples' },
      EXAMPLES.map((ex) =>
        h(
          'button',
          { type: 'button', class: 'example', title: ex.query, on: { click: () => lookup(ex.query) } },
          glyph(ex.icon, ex.note, 'sm'),
          h('span', { class: 'example-title' }, ex.note), h('span', { class: 'example-q' }, shortHash(ex.query, 8, 6)),
        ),
      ),
    ),
  );
  const idle = h('div', { class: 'idle-grid' }, recent, examples);
  return h('div', { class: 'stack' }, hero, searchView(ctx(), { query, chain, recentInto: recent, idle }), idle);
}

// ---------------------------------------------------------------- Scan page

function scanPanel(): HTMLElement {
  const host = h('span', { class: 'banner-host' }, '…');
  const out = h('div', { class: 'stack' });
  const run = async () => {
    clear(out, loading('Reading this page…'));
    try {
      const [tab] = await ext.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('No active tab');
      try {
        host.textContent = tab.url ? new URL(tab.url).host || tab.url : (tab.title ?? 'this tab');
      } catch {
        host.textContent = tab.title ?? 'this tab';
      }
      const [res] = await ext.scripting.executeScript({ target: { tabId: tab.id }, func: scanPageForCandidates });
      const found = (res?.result ?? [])
        .map((s) => ({ s, d: detectAll(s)[0] }))
        .filter((x) => x.d && x.d.kind !== 'secret' && x.d.kind !== 'block' && x.d.format !== 'hex64')
        .slice(0, 30);
      if (!found.length) {
        return clear(out, h('div', { class: 'empty' }, spot('scan', 'lg'), h('h2', null, 'Nothing found'), h('p', null, 'No addresses, transaction hashes or names on this page. Select text and right-click to look it up instead.')));
      }
      const all = found.map((f) => f.d!.normalized);
      clear(
        out,
        sectionHead(
          'checkCircle',
          `${found.length} found`,
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
    { class: 'stack' },
    h(
      'section',
      { class: 'p-banner' },
      spot('scan'),
      h('div', { class: 'p-banner-text' }, h('h2', null, 'Addresses on ', host), h('p', null, 'Reads the visible text of this tab once, when you open this tab. Nothing is sent anywhere.')),
      h('button', { type: 'button', class: 'btn-ghost sm', on: { click: () => void run() } }, icon('refresh'), 'Rescan'),
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
    h('p', { class: 'nav-title' }, 'Developer tools'),
    TOOLS.map((t) => h('button', { type: 'button', class: 'tool-link', 'aria-current': String(t.slug === current.slug), on: { click: () => openTool(t.slug) } }, icon(TOOL_ICONS[t.slug] ?? 'hash', 'ic', true), t.title)),
    h('p', { class: 'nav-title' }, 'More'),
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
        h('div', { class: 'tool-head-text' }, h('h2', null, current.title), h('p', { title: current.description }, current.short)),
        iconButton('external', 'Open in a full tab', () => void openTab(appUrl(`#tools/${current.slug}`))),
      ),
      h('div', { class: 'tool-body' }, ...toolBody(current.slug, state.settings)),
    ),
  );
}

// ---------------------------------------------------------------- Gas

function gwei(v: number): string {
  return v < 0.0001 ? '<0.0001' : Number(v.toPrecision(3)).toString();
}

function gasPanel(): HTMLElement {
  const out = h('div', { class: 'stack' });
  const run = async () => {
    if (!state.settings.network) {
      return clear(out, h('div', { class: 'empty' }, spot('cloudSlash', 'lg'), h('h2', null, 'Offline mode'), h('p', null, 'Live gas needs an online lookup. Turn on online lookups in settings, or use the fee calculator with your own numbers.'), h('button', { type: 'button', class: 'btn-ghost sm', on: { click: () => openTool('gas-calculator') } }, icon('gas'), 'Fee calculator')));
    }
    clear(out, loading('Loading live gas prices…'));
    try {
      const g = await apiGet<GasResult>('gas', {});
      const btc = g.bitcoin;
      clear(
        out,
        btc.status === 'ok'
          ? h(
              'div',
              { class: 'fee-grid' },
              h('div', { class: 'fee-head' }, glyph('bitcoin', 'Bitcoin', 'md'), h('span', null, h('b', null, 'Bitcoin'), h('small', null, 'fee rate, sat/vB'))),
              (
                [
                  ['Next block', btc.data.fastest],
                  ['~30 min', btc.data.halfHour],
                  ['~1 hour', btc.data.hour],
                  ['Economy', btc.data.economy],
                ] as [string, number][]
              ).map(([label, v], i) => h('div', { class: `fee${i === 0 ? ' hot' : ''}` }, h('span', { class: 'fee-label' }, label), h('span', { class: 'fee-value' }, String(v)))),
            )
          : note(`Bitcoin fees unavailable: ${btc.reason}`, 'warn'),
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
        h('p', { class: 'source' }, `Public RPCs, mempool.space, CoinGecko · fetched ${new Date(g.fetchedAt).toISOString().slice(11, 19)} UTC. Rollups add an L1 data fee.`),
      );
    } catch (e) {
      clear(out, errorText((e as Error).message));
    }
  };
  void run();
  return h(
    'div',
    { class: 'stack' },
    sectionHead(
      'gas',
      `Live fees · ${EVM_NETWORKS.length} EVM chains and Bitcoin`,
      h(
        'div',
        { class: 'row' },
        h('button', { type: 'button', class: 'btn-ghost sm', on: { click: () => openTool('gas-calculator') } }, icon('gas'), 'Fee calculator'),
        h('button', { type: 'button', class: 'btn-ghost sm', on: { click: () => void run() } }, icon('refresh'), 'Refresh'),
      ),
    ),
    out,
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
    list.classList.toggle('is-empty', !items.length);
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
          c ? glyph(c.id, c.name, 'sm') : spot('hash'),
          h(
            'button',
            { type: 'button', class: 'saved-main', title: item.query, on: { click: () => lookup(item.query, item.chainId ?? undefined) } },
            h('span', { class: 'saved-title' }, item.label || shortHash(item.query, 12, 8)),
            h('span', { class: 'saved-sub' }, item.label ? h('span', { class: 'mono' }, shortHash(item.query, 8, 6)) : null, `${item.label ? ' · ' : ''}${d?.label ?? 'unrecognised'}${c ? ` · ${c.name}` : ''}`),
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
    h(
      'div',
      { class: 'row' },
      h('div', { class: 'input-icon' }, icon('search'), filter),
      h('button', { type: 'button', class: 'btn-ghost', title: 'Edit labels and notes, export, import or share', on: { click: () => void openTab(appUrl('#saved')) } }, icon('external'), 'Manage'),
    ),
    list,
  );
}

// ---------------------------------------------------------------- Dialogs

function dialog(title: string, ic: IconName, body: Node, cls = ''): HTMLDialogElement {
  const dlg = h(
    'dialog',
    { class: `modal ${cls}`, 'aria-label': title },
    h('div', { class: 'modal-card' }, h('header', { class: 'modal-head' }, h('h2', null, spot(ic), title), iconButton('x', 'Close', () => dlg.close())), h('div', { class: 'modal-body' }, body)),
  );
  dlg.addEventListener('close', () => dlg.remove());
  // A click on the backdrop lands on the <dialog> itself, outside the card.
  dlg.addEventListener('click', (e) => e.target === dlg && dlg.close());
  document.body.append(dlg);
  dlg.showModal();
  return dlg;
}

function themeSeg(labels = false): HTMLElement {
  return h(
    'div',
    { class: `seg${labels ? ' labelled' : ''}`, role: 'radiogroup', 'aria-label': 'Theme' },
    THEMES.map(([t, label, ic]) =>
      h(
        'button',
        {
          type: 'button',
          role: 'radio',
          'data-theme-opt': t,
          'aria-checked': String(state.settings.theme === t),
          'aria-label': `${label} theme`,
          title: `${label} theme`,
          on: {
            click: async () => {
              state.settings.theme = t;
              applyTheme(t);
              document.querySelectorAll('[data-theme-opt]').forEach((b) => b.setAttribute('aria-checked', String(b.getAttribute('data-theme-opt') === t)));
              await setSettings(state.settings);
            },
          },
        },
        icon(ic),
        labels ? label : null,
      ),
    ),
  );
}

function settingRow(title: string, text: string, control: Node) {
  return h('div', { class: 'set-row' }, h('div', { class: 'set-text' }, h('b', null, title), h('small', null, text)), control);
}

function openSettings() {
  const body = h('div', { class: 'modal-stack' });
  const paint = () => {
    const choice = (value: 'results' | 'explorer', title: string, text: string) =>
      h(
        'label',
        { class: 'choice' },
        h('input', {
          type: 'radio',
          name: 'search-action',
          checked: state.prefs.searchAction === value ? true : undefined,
          on: {
            change: async () => {
              state.prefs.searchAction = value;
              await setPrefs(state.prefs);
            },
          },
        }),
        h('span', null, h('b', null, title), h('small', null, text)),
      );
    const network = h('input', { type: 'checkbox', class: 'switch', role: 'switch', 'aria-label': 'Online lookups', checked: state.settings.network ? true : undefined });
    network.addEventListener('change', async () => {
      state.settings.network = network.checked;
      await setSettings(state.settings);
      panels.delete('gas');
      paintShell();
    });
    clear(
      body,
      settingRow('Appearance', 'Light is the default. System follows your browser.', themeSeg(true)),
      h(
        'div',
        { class: 'set-block' },
        h('div', { class: 'set-text' }, h('b', null, 'When I press Search'), h('small', null, 'Right-click lookups and the w3 keyword follow this too.')),
        h(
          'div',
          { class: 'choices' },
          choice('results', 'Show Web3Lens results first', `Balances, tokens and risk checks on ${NETWORKS.length} chains; other chains open their explorer.`),
          choice('explorer', 'Always open the block explorer', 'Go straight to the explorer in a new tab.'),
        ),
      ),
      settingRow('Online lookups', state.settings.network ? `On: balances, transactions, risk checks and gas come from ${apiHost()} when you ask.` : 'Off: detection, checksums, explorer links, tools and the OFAC snapshot still work locally.', network),
      settingRow(
        'Recent searches',
        `${state.recent.length} kept in this browser.`,
        h(
          'button',
          {
            type: 'button',
            class: 'btn-ghost sm',
            disabled: state.recent.length ? undefined : true,
            on: {
              click: async () => {
                await clearRecent();
                state.recent = [];
                panels.delete('lookup');
                if (active === 'lookup') show('lookup');
                paint();
              },
            },
          },
          icon('trash'),
          'Clear',
        ),
      ),
      h('button', { type: 'button', class: 'link-row', on: { click: () => void openTab(appUrl('#settings')) } }, icon('sliders'), h('span', null, h('b', null, 'More settings'), h('small', null, 'Preferred explorers, favourite chains, data and reset')), icon('caretRight', 'ic faint')),
    );
  };
  paint();
  dialog('Settings', 'gear', body, 'modal-settings');
}

function linkCard(ic: IconName, title: string, sub: string, href: string, cls = '') {
  return ext_link(href, [spot(ic), h('span', { class: 'item-text' }, h('b', null, title), h('small', null, sub)), icon('arrowRight', 'ic xs faint')], `link-card ${cls}`);
}

function openInfo() {
  const version = ext.runtime.getManifest().version;
  const kbd = (...keys: string[]) => keys.flatMap((k, i) => [i ? ' + ' : '', h('kbd', { class: 'kbd' }, k)]);
  const body = h(
    'div',
    { class: 'modal-stack' },
    h('p', { class: 'label' }, icon('lightbulb'), 'Faster ways in'),
    h(
      'div',
      { class: 'how-grid' },
      h('div', { class: 'how' }, spot('keyboard'), h('b', null, 'Keyboard shortcut'), h('span', null, 'Open this popup with ', ...kbd('Alt', 'Shift', 'W'), '.')),
      h('div', { class: 'how' }, spot('cursor'), h('b', null, 'Right-click'), h('span', null, 'Select an address or hash on any page and choose ', h('i', null, 'Look up on Web3Lens'), '.')),
      h('div', { class: 'how' }, spot('search'), h('b', null, 'Address bar'), h('span', null, 'Type ', h('kbd', { class: 'kbd' }, 'w3'), ', a space, then paste to search.')),
    ),
    h(
      'div',
      { class: 'stats' },
      h('div', { class: 'stat' }, h('b', null, String(CHAINS.length)), h('span', null, 'blockchains detected and routed')),
      h('div', { class: 'stat' }, h('b', null, String(NETWORKS.length)), h('span', null, 'with live balances and risk checks')),
      h('div', { class: 'stat' }, h('b', null, new Date(sanctionsSnapshotAt()).toISOString().slice(0, 10)), h('span', null, 'OFAC list snapshot, checked locally')),
    ),
    h(
      'div',
      { class: 'link-grid' },
      linkCard('globe', 'Website', 'web3lens.com', 'https://web3lens.com'),
      linkCard('envelope', 'Contact us', 'Send feedback', 'https://web3lens.com/contact'),
      linkCard('shield', 'Privacy policy', 'Data stored and sent', 'https://web3lens.com/privacy-policy'),
    ),
    h('p', { class: 'divider-label' }, h('span', null, 'More from the same developer')),
    h(
      'div',
      { class: 'link-grid four' },
      OTHER_TOOLS.map(([name, about, url, ic]) => linkCard(ic, name, about, url, 'other')),
    ),
    h('p', { class: 'modal-foot' }, `Web3Lens extension v${version} · no account needed, saved data stays in this browser`),
  );
  dialog('About Web3Lens', 'info', body, 'modal-info');
}

// ---------------------------------------------------------------- Shell

function applyTheme(theme: ExtSettings['theme']) {
  document.documentElement.dataset.theme = theme;
}

function header(): HTMLElement {
  const online = state.settings.network;
  return h(
    'header',
    { class: 'popup-head' },
    h('div', { class: 'head-brand' }, brand(), h('span', { class: 'tagline' }, 'Blockchain search for ', h('b', null, 'every chain'))),
    h(
      'div',
      { class: 'row' },
      h(
        'button',
        { type: 'button', class: `status-pill${online ? '' : ' off'}`, title: online ? `Lookups go to ${apiHost()}. Change in settings` : 'Nothing leaves your browser. Change in settings', on: { click: openSettings } },
        h('span', { class: 'status-dot', 'aria-hidden': 'true' }),
        online ? 'Online' : 'Offline mode',
      ),
      themeSeg(),
      iconButton('info', 'About, shortcuts and more tools', openInfo),
      iconButton('gear', 'Settings', openSettings),
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

/** Header, tabs and footer; the cached panels keep their state. */
function paintShell() {
  paintSavedCount();
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
          state.settings.network ? `Lookups you run go to ${apiHost()}. Nothing else leaves your browser.` : 'Offline mode: nothing leaves your browser.',
        ),
        h('button', { type: 'button', class: 'linkish small', on: { click: openInfo } }, 'Shortcuts and more tools', icon('arrowRight', 'ic xs')),
      ),
    ),
  );
  show(active);
}

async function render() {
  state = await load();
  setApiBase(state.settings.apiBase);
  applyTheme(state.settings.theme);
  paintShell();
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
