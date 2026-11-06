/**
 * Toolbar popup (720 × 600): tabs for Lookup (search with detection and compact results, recents,
 * examples), Scan page, inline Tools, live Gas and Saved, each laid out to fit without scrolling.
 * Settings and Info (shortcuts, links, the developer's other tools) open as dialogs over the popup.
 */
import { TOOLS, type ToolSlug } from '@/config/tools';
import { apiGet, setApiBase } from '@/lib/api-client';
import { CHAIN_COUNT_LABEL, getChain } from '@/lib/chains';
import { detectAll, detectQuery, EXAMPLES } from '@/lib/detect';
import { shortHash } from '@/lib/format';
import type { GasResult } from '@/lib/lookup-types';
import { EVM_NETWORKS, NETWORKS } from '@/lib/networks';
import { sanctionsSnapshotAt } from '@/lib/security/sanctions';
import { appUrl, ext, openTab } from './browser';
import { clear, ext_link, h } from './dom';
import { applyLanguage, detectLabel, t, tx, type MessageKey } from './i18n';
import { browserLanguages, LOCALES, localeName, matchLocale, type LanguagePref } from './locales';
import { scanPageForCandidates } from './scan';
import { clearRecent, load, onStorageChange, setPrefs, setSettings, upsertSaved, type ExtSettings } from './store';
import { brand, glyph, heroIllustration, icon, iconButton, spot, TOOL_ICONS, type IconName } from './ui';
import { errorText, failMessage, loading, note } from './views/common';
import { searchView, type Ctx, type State } from './views/search';
import { toolBody } from './views/tools';

type Tab = 'lookup' | 'scan' | 'tools' | 'gas' | 'saved';

const TABS: [Tab, MessageKey, IconName][] = [
  ['lookup', 'popup.tab.lookup', 'search'],
  ['scan', 'popup.tab.scan', 'scan'],
  ['tools', 'popup.tab.tools', 'wrench'],
  ['gas', 'popup.tab.gas', 'gas'],
  ['saved', 'popup.tab.saved', 'bookmark'],
];
const THEMES: [ExtSettings['theme'], label: MessageKey, aria: MessageKey, IconName][] = [
  ['light', 'theme.light', 'theme.lightTheme', 'sun'],
  ['dark', 'theme.dark', 'theme.darkTheme', 'moon'],
  ['system', 'theme.system', 'theme.systemTheme', 'desktop'],
];
/** The developer's other products, shown in the Info dialog (product names stay as they are). */
const OTHER_TOOLS: [name: string, about: MessageKey, url: string, icon: IconName][] = [
  ['SummaryTube', 'info.summarytube', 'https://summarytube.com', 'play'],
  ['CentPage', 'info.centpage', 'https://www.centpage.com', 'layout'],
  ['Super Session Manager', 'info.sessionmanager', 'https://sessionmanager.net', 'stack'],
  ['Web Developer Tools', 'info.webdevtools', 'https://webdevelopertools.dev', 'code'],
];
/** lib/detect's EXAMPLES notes, by query. */
const EXAMPLE_NOTES: Record<string, MessageKey> = {
  'vitalik.eth': 'examples.vitalik',
  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': 'examples.usdc',
  '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa': 'examples.genesis',
  TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t: 'examples.usdtTron',
};

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
      h('h1', null, ...tx('hero.title', { accent: h('span', { class: 'accent' }, t('hero.titleAccent')) })),
      h('p', null, t('hero.popupLead', { count: CHAIN_COUNT_LABEL })),
    ),
    heroIllustration(),
  );
  const recent = h('div', { class: 'idle-col' });
  const examples = h(
    'section',
    { class: 'idle-col' },
    sectionHead('sparkle', t('examples.title')),
    h(
      'div',
      { class: 'examples' },
      EXAMPLES.map((ex) => {
        const label = EXAMPLE_NOTES[ex.query] ? t(EXAMPLE_NOTES[ex.query]) : ex.note;
        return h(
          'button',
          { type: 'button', class: 'example', title: ex.query, on: { click: () => lookup(ex.query) } },
          glyph(ex.icon, label, 'sm'),
          h('span', { class: 'example-title' }, label), h('span', { class: 'example-q' }, shortHash(ex.query, 8, 6)),
        );
      }),
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
    clear(out, loading(t('scan.reading')));
    try {
      const [tab] = await ext.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error(t('scan.noTab'));
      try {
        host.textContent = tab.url ? new URL(tab.url).host || tab.url : (tab.title ?? t('scan.thisTab'));
      } catch {
        host.textContent = tab.title ?? t('scan.thisTab');
      }
      const [res] = await ext.scripting.executeScript({ target: { tabId: tab.id }, func: scanPageForCandidates });
      const found = (res?.result ?? [])
        .map((s) => ({ s, d: detectAll(s)[0] }))
        .filter((x) => x.d && x.d.kind !== 'secret' && x.d.kind !== 'block' && x.d.format !== 'hex64')
        .slice(0, 30);
      if (!found.length) {
        return clear(out, h('div', { class: 'empty' }, spot('scan', 'lg'), h('h2', null, t('scan.nothingTitle')), h('p', null, t('scan.nothingBody'))));
      }
      const all = found.map((f) => f.d!.normalized);
      clear(
        out,
        sectionHead(
          'checkCircle',
          t('scan.found', { count: found.length }),
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
                    btn.replaceChildren(icon('check'), t('common.copied'));
                  },
                },
              },
              icon('copy'),
              t('scan.copyAll'),
            ),
            h('button', { type: 'button', class: 'btn-ghost sm', on: { click: () => void openTab(appUrl(`#batch?q=${encodeURIComponent(all.join('\n'))}`)) } }, icon('list'), t('scan.checkAll')),
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
                h('span', { class: 'item-text' }, h('span', { class: 'mono' }, shortHash(d!.normalized, 10, 6)), h('span', { class: 'muted small' }, `${detectLabel(d!.label)}${c ? ` · ${c.name}` : ''}`)),
              ),
            );
          }),
        ),
      );
    } catch (e) {
      clear(out, h('div', { class: 'empty' }, spot('shieldWarning', 'lg'), h('h2', null, t('scan.cantReadTitle')), h('p', null, t('scan.cantReadBody', { error: (e as Error).message }))));
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
      h('div', { class: 'p-banner-text' }, h('h2', null, ...tx('scan.bannerTitle', { host })), h('p', null, t('scan.bannerBody'))),
      h('button', { type: 'button', class: 'btn-ghost sm', on: { click: () => void run() } }, icon('refresh'), t('scan.rescan')),
    ),
    out,
  );
}

// ---------------------------------------------------------------- Tools

function toolsPanel(): HTMLElement {
  const current = TOOLS.find((x) => x.slug === tool) ?? TOOLS[0];
  const nav = h(
    'nav',
    { class: 'tool-nav', 'aria-label': t('common.tools') },
    h('p', { class: 'nav-title' }, t('common.developerTools')),
    TOOLS.map((x) => h('button', { type: 'button', class: 'tool-link', 'aria-current': String(x.slug === current.slug), on: { click: () => openTool(x.slug) } }, icon(TOOL_ICONS[x.slug] ?? 'hash', 'ic', true), t(`tool.${x.slug}.title`))),
    h('p', { class: 'nav-title' }, t('toolsNav.more')),
    h('button', { type: 'button', class: 'tool-link', on: { click: () => show('gas') } }, icon('gas', 'ic', true), t('common.gasTracker')),
    h('button', { type: 'button', class: 'tool-link', on: { click: () => void openTab(appUrl('#batch')) } }, icon('list', 'ic', true), t('toolsNav.batchCheck'), icon('external', 'ic xs faint')),
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
        h('div', { class: 'tool-head-text' }, h('h2', null, t(`tool.${current.slug}.title`)), h('p', { title: t(`tool.${current.slug}.description`) }, t(`tool.${current.slug}.short`))),
        iconButton('external', t('common.openInFullTab'), () => void openTab(appUrl(`#tools/${current.slug}`))),
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
      return clear(out, h('div', { class: 'empty' }, spot('cloudSlash', 'lg'), h('h2', null, t('common.offlineMode')), h('p', null, t('gas.offlineBody')), h('button', { type: 'button', class: 'btn-ghost sm', on: { click: () => openTool('gas-calculator') } }, icon('gas'), t('common.feeCalculator'))));
    }
    clear(out, loading(t('gas.loading')));
    try {
      const g = await apiGet<GasResult>('gas', {});
      const btc = g.bitcoin;
      clear(
        out,
        btc.status === 'ok'
          ? h(
              'div',
              { class: 'fee-grid' },
              h('div', { class: 'fee-head' }, glyph('bitcoin', 'Bitcoin', 'md'), h('span', null, h('b', null, 'Bitcoin'), h('small', null, t('gas.btcRate')))),
              (
                [
                  [t('gas.nextBlock'), btc.data.fastest],
                  [t('gas.halfHour'), btc.data.halfHour],
                  [t('gas.hour'), btc.data.hour],
                  [t('gas.economy'), btc.data.economy],
                ] as [string, number][]
              ).map(([label, v], i) => h('div', { class: `fee${i === 0 ? ' hot' : ''}` }, h('span', { class: 'fee-label' }, label), h('span', { class: 'fee-value' }, String(v)))),
            )
          : note(t('gas.btcUnavailable', { reason: btc.reason }), 'warn'),
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
              h('span', { class: 'item-text' }, h('span', { class: 'gas-name' }, r.chain.name), h('span', { class: 'gas-sub' }, eff !== null && price !== undefined ? t('gas.transfer', { usd: `$${(eff * 1e-9 * 21000 * price).toFixed(4)}` }) : r.status === 'ok' ? t('gas.noUsd') : (r.reason ?? t('common.unavailable')))),
              r.status === 'ok' ? h('span', { class: 'gas-gwei' }, gwei(Number(r.gasPriceGwei)), h('small', null, r.stale ? t('gas.gweiStale') : 'gwei')) : h('span', { class: 'badge warn' }, t('gas.na')),
            );
          }),
        ),
        h('p', { class: 'source' }, t('gas.source', { time: new Date(g.fetchedAt).toISOString().slice(11, 19) })),
      );
    } catch (e) {
      clear(out, errorText(failMessage(e)));
    }
  };
  void run();
  return h(
    'div',
    { class: 'stack' },
    sectionHead(
      'gas',
      t('gas.head', { count: EVM_NETWORKS.length }),
      h(
        'div',
        { class: 'row' },
        h('button', { type: 'button', class: 'btn-ghost sm', on: { click: () => openTool('gas-calculator') } }, icon('gas'), t('common.feeCalculator')),
        h('button', { type: 'button', class: 'btn-ghost sm', on: { click: () => void run() } }, icon('refresh'), t('common.refresh')),
      ),
    ),
    out,
  );
}

// ---------------------------------------------------------------- Saved

function savedPanel(): HTMLElement {
  const filter = h('input', { class: 'input', placeholder: t('saved.filterPlaceholder'), 'aria-label': t('saved.filterLabel') });
  const list = h('ul', { class: 'saved-list' });
  const render = () => {
    const f = filter.value.trim().toLowerCase();
    const items = [...state.saved]
      .filter((x) => !f || x.label.toLowerCase().includes(f) || x.query.toLowerCase().includes(f) || x.note.toLowerCase().includes(f))
      .sort((a, b) => Number(b.favourite) - Number(a.favourite) || b.addedAt - a.addedAt);
    list.classList.toggle('is-empty', !items.length);
    if (!state.saved.length) {
      return clear(list, h('li', { class: 'empty' }, spot('bookmark', 'lg'), h('h2', null, t('saved.emptyTitle')), h('p', null, t('saved.emptyBody'))));
    }
    if (!items.length) return clear(list, h('li', { class: 'hint' }, t('saved.noMatch', { query: filter.value })));
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
            h('span', { class: 'saved-sub' }, item.label ? h('span', { class: 'mono' }, shortHash(item.query, 8, 6)) : null, `${item.label ? ' · ' : ''}${d ? detectLabel(d.label) : t('common.unrecognised')}${c ? ` · ${c.name}` : ''}`),
          ),
          h(
            'button',
            {
              type: 'button',
              class: `star${item.favourite ? ' on' : ''}`,
              'aria-pressed': String(item.favourite),
              'aria-label': item.favourite ? t('saved.unpin') : t('saved.pin'),
              title: item.favourite ? t('saved.unpin') : t('saved.pin'),
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
      h('button', { type: 'button', class: 'btn-ghost', title: t('saved.manageTitle'), on: { click: () => void openTab(appUrl('#saved')) } }, icon('external'), t('saved.manage')),
    ),
    list,
  );
}

// ---------------------------------------------------------------- Dialogs

function dialog(title: string, ic: IconName, body: Node, cls = ''): HTMLDialogElement {
  const dlg = h(
    'dialog',
    { class: `modal ${cls}`, 'aria-label': title },
    h('div', { class: 'modal-card' }, h('header', { class: 'modal-head' }, h('h2', null, spot(ic), title), iconButton('x', t('common.close'), () => dlg.close())), h('div', { class: 'modal-body' }, body)),
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
    { class: `seg${labels ? ' labelled' : ''}`, role: 'radiogroup', 'aria-label': t('theme.label') },
    THEMES.map(([th, label, aria, ic]) =>
      h(
        'button',
        {
          type: 'button',
          role: 'radio',
          'data-theme-opt': th,
          'aria-checked': String(state.settings.theme === th),
          'aria-label': t(aria),
          title: t(aria),
          on: {
            click: async () => {
              state.settings.theme = th;
              applyTheme(th);
              document.querySelectorAll('[data-theme-opt]').forEach((b) => b.setAttribute('aria-checked', String(b.getAttribute('data-theme-opt') === th)));
              await setSettings(state.settings);
            },
          },
        },
        icon(ic),
        labels ? t(label) : null,
      ),
    ),
  );
}

function settingRow(title: string, text: string, control: Node, cls = '') {
  return h('div', { class: `set-row ${cls}` }, h('div', { class: 'set-text' }, h('b', null, title), text ? h('small', null, text) : null), control);
}

/** UI language: Automatic (browser language) or one of the 15, each in its own name. */
function languageSelect(): HTMLElement {
  const sel = h(
    'select',
    { class: 'select lang-select', 'aria-label': t('language.label') },
    h('option', { value: 'auto', selected: state.settings.language === 'auto' ? true : undefined }, t('language.auto', { language: localeName(matchLocale(browserLanguages())) })),
    LOCALES.map((l) => h('option', { value: l.code, lang: l.code, selected: state.settings.language === l.code ? true : undefined }, l.name)),
  );
  sel.addEventListener('change', async () => {
    state.settings.language = sel.value as LanguagePref;
    await setSettings(state.settings);
    applyLanguage(state.settings.language);
    // Rebuild everything in the new language, then reopen Settings where the user was.
    panels.clear();
    refreshSaved = null;
    document.querySelectorAll('dialog.modal').forEach((d) => (d as HTMLDialogElement).close());
    paintShell();
    openSettings();
  });
  return sel;
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
    const network = h('input', { type: 'checkbox', class: 'switch', role: 'switch', 'aria-label': t('common.onlineLookups'), checked: state.settings.network ? true : undefined });
    network.addEventListener('change', async () => {
      state.settings.network = network.checked;
      await setSettings(state.settings);
      panels.delete('gas');
      paintShell();
    });
    clear(
      body,
      settingRow(t('settings.appearance'), t('settings.appearanceHint'), themeSeg(true)),
      // One line, so the dialog still fits the popup; the options page has the full explanation.
      settingRow(t('language.label'), '', languageSelect(), 'compact'),
      h(
        'div',
        { class: 'set-block' },
        h('div', { class: 'set-text' }, h('b', null, t('settings.whenSearch')), h('small', null, t('settings.whenSearchHint'))),
        h(
          'div',
          { class: 'choices' },
          choice('results', t('settings.resultsFirst'), t('settings.resultsFirstHint', { count: NETWORKS.length })),
          choice('explorer', t('settings.alwaysExplorer'), t('settings.alwaysExplorerHint')),
        ),
      ),
      settingRow(t('common.onlineLookups'), state.settings.network ? t('settings.onlineOn', { host: apiHost() }) : t('settings.onlineOff'), network),
      settingRow(
        t('settings.recent'),
        t('settings.recentKept', { count: state.recent.length }),
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
          t('common.clear'),
        ),
      ),
      h('button', { type: 'button', class: 'link-row', on: { click: () => void openTab(appUrl('#settings')) } }, icon('sliders'), h('span', null, h('b', null, t('settings.more')), h('small', null, t('settings.moreHint'))), icon('caretRight', 'ic faint')),
    );
  };
  paint();
  dialog(t('common.settings'), 'gear', body, 'modal-settings');
}

function linkCard(ic: IconName, title: string, sub: string, href: string, cls = '') {
  return ext_link(href, [spot(ic), h('span', { class: 'item-text' }, h('b', null, title), h('small', null, sub)), icon('arrowRight', 'ic xs faint')], `link-card ${cls}`);
}

function openInfo() {
  const version = ext.runtime.getManifest().version;
  const kbd = (...keys: string[]) => keys.flatMap((k, i): (string | Node)[] => [i ? ' + ' : '', h('kbd', { class: 'kbd' }, k)]);
  const body = h(
    'div',
    { class: 'modal-stack' },
    h('p', { class: 'label' }, icon('lightbulb'), t('info.fasterWays')),
    h(
      'div',
      { class: 'how-grid' },
      h('div', { class: 'how' }, spot('keyboard'), h('b', null, t('info.shortcut')), h('span', null, ...tx('info.shortcutBody', { keys: kbd('Alt', 'Shift', 'W') }))),
      // The right-click menu item is registered by the background in English, so it is quoted as is.
      h('div', { class: 'how' }, spot('cursor'), h('b', null, t('info.rightClick')), h('span', null, ...tx('info.rightClickBody', { menu: h('i', null, 'Look up on Web3Lens') }))),
      h('div', { class: 'how' }, spot('search'), h('b', null, t('info.addressBar')), h('span', null, ...tx('info.addressBarBody', { key: h('kbd', { class: 'kbd' }, 'w3') }))),
    ),
    h(
      'div',
      { class: 'stats' },
      h('div', { class: 'stat' }, h('b', null, CHAIN_COUNT_LABEL), h('span', null, t('info.statChains'))),
      h('div', { class: 'stat' }, h('b', null, String(NETWORKS.length)), h('span', null, t('info.statNative'))),
      h('div', { class: 'stat' }, h('b', null, new Date(sanctionsSnapshotAt()).toISOString().slice(0, 10)), h('span', null, t('info.statOfac'))),
    ),
    h(
      'div',
      { class: 'link-grid' },
      linkCard('globe', t('info.website'), 'web3lens.com', 'https://web3lens.com'),
      linkCard('envelope', t('info.contact'), t('info.contactSub'), 'https://web3lens.com/contact'),
      linkCard('shield', t('info.privacy'), t('info.privacySub'), 'https://web3lens.com/privacy-policy'),
    ),
    h('p', { class: 'divider-label' }, h('span', null, t('info.moreFrom'))),
    h(
      'div',
      { class: 'link-grid four' },
      OTHER_TOOLS.map(([name, about, url, ic]) => linkCard(ic, name, t(about), url, 'other')),
    ),
    h('p', { class: 'modal-foot' }, t('info.foot', { version })),
  );
  dialog(t('info.title'), 'info', body, 'modal-info');
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
    h('div', { class: 'head-brand' }, brand(), h('span', { class: 'tagline' }, ...tx('popup.tagline', { strong: h('b', null, t('popup.taglineStrong')) }))),
    h(
      'div',
      { class: 'row' },
      h(
        'button',
        { type: 'button', class: `status-pill${online ? '' : ' off'}`, title: online ? t('popup.statusOnline', { host: apiHost() }) : t('popup.statusOffline'), on: { click: openSettings } },
        h('span', { class: 'status-dot', 'aria-hidden': 'true' }),
        online ? t('popup.online') : t('common.offlineMode'),
      ),
      themeSeg(),
      iconButton('info', t('popup.aboutButton'), openInfo),
      iconButton('gear', t('common.settings'), openSettings),
      iconButton('external', t('popup.openApp'), () => void openTab(appUrl('#search'))),
    ),
  );
}

function tabBar(): HTMLElement {
  tabButtons.clear();
  const bar = h(
    'nav',
    { class: 'popup-tabs', role: 'tablist', 'aria-label': t('common.sections') },
    TABS.map(([tab, label, ic]) => {
      const b = h('button', { type: 'button', class: 'ptab', role: 'tab', id: `tab-${tab}`, 'aria-controls': 'popup-panel', on: { click: () => show(tab) } }, icon(ic), t(label), tab === 'saved' ? savedCount : null);
      tabButtons.set(tab, b);
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
          state.settings.network ? t('popup.footOnline', { host: apiHost() }) : t('popup.footOffline'),
        ),
        h('button', { type: 'button', class: 'linkish small', on: { click: openInfo } }, t('popup.footLink'), icon('arrowRight', 'ic xs')),
      ),
    ),
  );
  show(active);
}

async function render() {
  state = await load();
  setApiBase(state.settings.apiBase);
  applyTheme(state.settings.theme);
  applyLanguage(state.settings.language);
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
