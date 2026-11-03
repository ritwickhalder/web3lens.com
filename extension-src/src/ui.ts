/**
 * Visual building blocks for the extensions, matching the website: the lens logo, Phosphor icons,
 * official coin logos (ChainGlyph) and the searchable chain picker. SVGs are build-time strings
 * from the site's own components, parsed with DOMParser (never innerHTML).
 */
import icons from 'virtual:svg-icons';
import { chainMeta, POPULAR_CHAIN_IDS } from '@/lib/chain-meta';
import { CHAINS, getChain, type Chain } from '@/lib/chains';
import { explorerDown } from '@/lib/explorer';
import { h } from './dom';
import { t } from './i18n';

const parser = typeof DOMParser !== 'undefined' ? new DOMParser() : null;
const cache = new Map<string, Element>();

function svgFrom(key: string, markup: string | undefined): SVGElement | null {
  if (!markup || !parser) return null;
  let tpl = cache.get(key);
  if (!tpl) {
    const doc = parser.parseFromString(markup, 'image/svg+xml');
    if (doc.querySelector('parsererror')) return null;
    tpl = doc.documentElement;
    cache.set(key, tpl);
  }
  return document.importNode(tpl, true) as unknown as SVGElement;
}

export type IconName =
  | 'arrowRight' | 'external' | 'refresh' | 'bookmark' | 'brackets' | 'caret' | 'check' | 'checkCircle' | 'clock' | 'history' | 'cloudSlash'
  | 'copy' | 'cube' | 'cursor' | 'desktop' | 'gas' | 'gear' | 'hash' | 'info' | 'keyboard' | 'lightbulb' | 'link' | 'list' | 'search'
  | 'moon' | 'qr' | 'receipt' | 'scales' | 'scan' | 'shield' | 'shieldWarning' | 'sparkle' | 'star' | 'sun' | 'trash' | 'warning'
  | 'wrench' | 'x' | 'caretRight' | 'code' | 'envelope' | 'globe' | 'layout' | 'play' | 'sliders' | 'stack';

/** Tool icons, as components/tools/ToolIcon.tsx on the website. */
export const TOOL_ICONS: Record<string, IconName> = {
  'unit-converter': 'scales',
  'address-validator': 'checkCircle',
  'hex-converter': 'hash',
  'timestamp-converter': 'clock',
  'gas-calculator': 'gas',
  'abi-decoder': 'brackets',
  'transaction-decoder': 'receipt',
  batch: 'list',
  'gas-tracker': 'gas',
};

/** Phosphor icon: bold for UI glyphs, duotone for illustrations (as on the website). */
export function icon(name: IconName, cls = 'ic', duotone = false): Element {
  const svg = svgFrom(`${duotone ? 'd' : 'b'}:${name}`, duotone ? icons.uiDuotone[name] : icons.ui[name]);
  if (!svg) return h('span', { class: cls, 'aria-hidden': 'true' });
  svg.setAttribute('class', cls);
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  return svg;
}

/** Round coin badge: the official logo when there is one, otherwise the ticker on a tinted disc. */
export function glyph(id: string, name: string, size: 'xs' | 'sm' | 'md' | 'lg' = 'md'): Element {
  const svg = svgFrom(`c:${id}`, icons.chains[id]);
  if (svg) {
    svg.setAttribute('class', `glyph ${size}`);
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    return svg;
  }
  const { symbol, color } = chainMeta(id, name);
  const el = h('span', { class: `glyph ticker ${size}`, 'aria-hidden': 'true' }, symbol.slice(0, size === 'xs' ? 1 : size === 'lg' ? 4 : 3));
  el.style.setProperty('--tint', color);
  return el;
}

/** The lens mark from components/brand/Logo.tsx. */
export function logoMark(cls = 'logo-mark'): SVGElement {
  const markup =
    '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<circle cx="16" cy="16" r="12.5" stroke-width="2"/><circle cx="16" cy="16" r="8.5" stroke-width="1" stroke-dasharray="2 2" opacity="0.6"/>' +
    '<path d="M16 1.5v4M16 26.5v4M1.5 16h4M26.5 16h4" stroke-width="1.75"/>' +
    '<path d="M16 11.5 20 13.75v4.5L16 20.5l-4-2.25v-4.5z" stroke-width="1.75" stroke-linejoin="round"/>' +
    '<path d="M16 16v4.5M16 16l4-2.25M16 16l-4-2.25" stroke-width="1.1" stroke-linejoin="round"/></svg>';
  const svg = svgFrom('logo', markup)!;
  svg.setAttribute('class', cls);
  return svg;
}

/**
 * Popup hero illustration: three linked blocks under the lens, the last one checked. Flat shapes
 * coloured by CSS classes (.il-*) so it follows the theme.
 */
export function heroIllustration(cls = 'illus'): SVGElement {
  const block = (x: number, hi = false) =>
    `<rect class="il-block${hi ? ' hi' : ''}" x="${x}" y="38" width="44" height="44" rx="10"/>` +
    `<path class="il-cube${hi ? ' hi' : ''}" d="M${x + 22} 50l9 5v10l-9 5-9-5V55zM${x + 22} 60v10M${x + 22} 60l9-5M${x + 22} 60l-9-5"/>`;
  const markup =
    '<svg viewBox="0 0 220 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<path class="il-rail" d="M8 104h204"/>' +
    '<path class="il-link" d="M54 56h22M54 64h22M142 56h22M142 64h22"/>' +
    block(10) +
    block(88, true) +
    block(166) +
    '<circle class="il-badge" cx="206" cy="40" r="10"/><path class="il-check" d="M201.5 40.5l3 3 6-6.5"/>' +
    '<circle class="il-glass" cx="110" cy="60" r="31"/>' +
    '<circle class="il-dash" cx="110" cy="60" r="24"/>' +
    '<path class="il-handle" d="M132 82l16 16"/>' +
    '<path class="il-tick" d="M110 18v8M110 94v8M68 60h8M144 60h8"/>' +
    '<path class="il-spark" d="M30 14v10M25 19h10M184 92v8M180 96h8"/>' +
    '</svg>';
  const svg = svgFrom('hero', markup)!;
  svg.setAttribute('class', cls);
  return svg;
}

/** Duotone icon on a tinted square: the small "spot illustrations" used in empty states and tiles. */
export function spot(name: IconName, size: 'sm' | 'lg' = 'sm'): HTMLElement {
  return h('span', { class: `spot ${size}`, 'aria-hidden': 'true' }, icon(name, 'ic', true));
}

export function brand(): HTMLElement {
  return h('span', { class: 'brand' }, logoMark(), h('span', { class: 'wordmark' }, 'Web3', h('span', { class: 'accent' }, 'Lens')));
}

/** Icon-only button with an accessible label and tooltip. */
export function iconButton(name: IconName, label: string, onClick: () => void, cls = 'icon-btn'): HTMLButtonElement {
  return h('button', { type: 'button', class: cls, 'aria-label': label, title: label, on: { click: onClick } }, icon(name));
}

export type ChainPicker = {
  el: HTMLElement;
  value: () => Chain;
  set: (chain: Chain, opts?: { auto?: boolean }) => void;
  setDetected: (ids: string[]) => void;
};

/**
 * Searchable chain picker like the website's ChainCombobox: Detected, Favourites and Popular groups,
 * coin logos, keyboard navigation (↑ ↓ Enter Esc), and a star to pin favourites.
 */
export function chainPicker(opts: { value: Chain; favourites: string[]; onChange: (c: Chain) => void; onToggleFavourite?: (id: string) => void }): ChainPicker {
  let current = opts.value;
  let auto = false;
  let detected: string[] = [];
  let favourites = [...opts.favourites];
  let active = 0;
  let options: Chain[] = [];

  const label = h('span', { class: 'picker-label' });
  const nameEl = h('span', { class: 'picker-name' });
  const glyphSlot = h('span', { class: 'picker-glyph' });
  const button = h('button', { type: 'button', class: 'picker-btn', 'aria-haspopup': 'listbox', 'aria-expanded': 'false' }, glyphSlot, h('span', { class: 'picker-text' }, label, nameEl), icon('caret', 'ic caret'));
  const filter = h('input', { class: 'picker-filter', placeholder: t('picker.filterPlaceholder', { count: CHAINS.length }), 'aria-label': t('picker.filterLabel'), autocomplete: 'off', spellcheck: 'false' });
  const list = h('div', { class: 'picker-list', role: 'listbox', 'aria-label': t('picker.listLabel') });
  const panel = h('div', { class: 'picker-panel', hidden: true }, h('div', { class: 'picker-search' }, icon('search'), filter), list);
  const el = h('div', { class: 'picker' }, button, panel);

  const paintButton = () => {
    glyphSlot.replaceChildren(glyph(current.id, current.name, 'md'));
    label.textContent = auto ? t('picker.autoDetected') : t('picker.blockchain');
    label.classList.toggle('accent', auto);
    nameEl.textContent = current.name;
    button.setAttribute('aria-label', t(auto ? 'picker.buttonLabelAuto' : 'picker.buttonLabel', { chain: current.name }));
  };

  const sections = (): [string, Chain[]][] => {
    const f = filter.value.trim().toLowerCase();
    const byIds = (ids: string[]) => ids.map((id) => getChain(id)).filter((c): c is Chain => Boolean(c));
    if (f) {
      const starts = CHAINS.filter((c) => c.name.toLowerCase().startsWith(f));
      const contains = CHAINS.filter((c) => !c.name.toLowerCase().startsWith(f) && (c.name.toLowerCase().includes(f) || c.id.includes(f)));
      return [[t('picker.results'), [...starts, ...contains]]];
    }
    return [
      ...(detected.length ? ([[t('picker.detected'), byIds(detected)]] as [string, Chain[]][]) : []),
      ...(favourites.length ? ([[t('picker.favourites'), byIds(favourites)]] as [string, Chain[]][]) : []),
      [t('picker.popular'), byIds(POPULAR_CHAIN_IDS)],
      [t('picker.allChains', { count: CHAINS.length }), CHAINS],
    ];
  };

  const renderList = () => {
    options = [];
    list.replaceChildren();
    for (const [title, chains] of sections()) {
      if (!chains.length) continue;
      list.append(h('p', { class: 'picker-group' }, title));
      for (const c of chains) {
        const i = options.push(c) - 1;
        const fav = favourites.includes(c.id);
        const row = h(
          'div',
          { class: `picker-row${i === active ? ' active' : ''}`, role: 'option', 'aria-selected': String(c.id === current.id), 'data-i': String(i) },
          glyph(c.id, c.name, 'sm'),
          h('span', { class: 'picker-row-name' }, c.name),
          explorerDown(c) ? h('span', { class: 'tag warn' }, t('picker.explorerDown')) : c.fallback ? h('span', { class: 'tag warn' }, t('picker.limited')) : null,
          c.id === current.id ? icon('check', 'ic accent') : null,
          opts.onToggleFavourite
            ? h(
                'button',
                {
                  type: 'button',
                  class: `star${fav ? ' on' : ''}`,
                  tabindex: '-1',
                  'aria-label': t(fav ? 'picker.unpin' : 'picker.pin', { chain: c.name }),
                  on: {
                    click: (e: Event) => {
                      e.stopPropagation();
                      favourites = fav ? favourites.filter((x) => x !== c.id) : [...favourites, c.id];
                      opts.onToggleFavourite!(c.id);
                      renderList();
                    },
                  },
                },
                icon('star'),
              )
            : null,
        );
        row.addEventListener('click', () => pick(c));
        row.addEventListener('pointerenter', () => setActive(i, false));
        list.append(row);
      }
    }
    if (!options.length) list.append(h('p', { class: 'picker-empty' }, t('picker.noMatch', { query: filter.value })));
  };

  const setActive = (i: number, scroll = true) => {
    active = Math.max(0, Math.min(i, options.length - 1));
    list.querySelectorAll('.picker-row.active').forEach((r) => r.classList.remove('active'));
    const row = list.querySelector(`[data-i="${active}"]`);
    row?.classList.add('active');
    if (scroll) row?.scrollIntoView({ block: 'nearest' });
  };

  const open = () => {
    filter.value = '';
    active = 0;
    renderList();
    panel.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    filter.focus();
  };
  const close = () => {
    panel.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  };
  const pick = (c: Chain) => {
    current = c;
    auto = false;
    paintButton();
    close();
    opts.onChange(c);
  };

  button.addEventListener('click', () => (panel.hidden ? open() : close()));
  filter.addEventListener('input', () => {
    active = 0;
    renderList();
  });
  filter.addEventListener('keydown', (e) => {
    if (!['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) return;
    e.preventDefault();
    if (e.key === 'ArrowDown') setActive(active + 1);
    else if (e.key === 'ArrowUp') setActive(active - 1);
    else if (e.key === 'Enter') {
      if (options[active]) pick(options[active]);
    } else {
      close();
      button.focus();
    }
  });
  document.addEventListener('pointerdown', (e) => {
    if (!panel.hidden && !el.contains(e.target as Node)) close();
  });

  paintButton();
  return {
    el,
    value: () => current,
    set: (c, o) => {
      current = c;
      auto = Boolean(o?.auto);
      paintButton();
    },
    setDetected: (ids) => {
      detected = ids;
    },
  };
}
