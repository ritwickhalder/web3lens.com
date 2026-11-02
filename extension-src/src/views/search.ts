/** Search with auto-detect, chain picker, explorer handoff and native results — popup and full page. */
import { setApiBase } from '@/lib/api-client';
import { POPULAR_CHAIN_IDS } from '@/lib/chain-meta';
import { CHAINS, getChain, type Chain } from '@/lib/chains';
import { detectAll, extractQuery, type Detection } from '@/lib/detect';
import { detectionFor, fallbackNotice, isSafeExternalUrl, resolveExplorer, toQueryKind, webSearchLink, type ExplorerAction } from '@/lib/explorer';
import { shortHash } from '@/lib/format';
import { hasNativeSupport } from '@/lib/networks';
import { labelFor } from '@/lib/saved';
import { checkSanctions } from '@/lib/security/sanctions';
import { appUrl, openTab } from '../browser';
import { clear, ext_link, h } from '../dom';
import { addRecent, clearRecent, upsertSaved, type load } from '../store';
import { badge, errorText, explorerList, note } from './common';
import { locateCard, multichainCard, resultView, type Nav } from './results';

export type State = Awaited<ReturnType<typeof load>>;
export type Ctx = { state: State; nav: Nav; compact: boolean };

function chainSelect(state: State, selected: Chain, candidates: string[]): HTMLSelectElement {
  const opt = (c: Chain) => h('option', { value: c.id, selected: c.id === selected.id ? true : undefined }, c.name);
  const group = (label: string, ids: string[]) => {
    const chains = ids.map((id) => getChain(id)).filter((c): c is Chain => Boolean(c));
    return chains.length ? h('optgroup', { label }, chains.map(opt)) : null;
  };
  return h(
    'select',
    { class: 'select', 'aria-label': 'Blockchain' },
    group('Detected', candidates),
    group('Favourites', state.prefs.favouriteChains),
    group('Popular', POPULAR_CHAIN_IDS),
    h('optgroup', { label: `All chains · ${CHAINS.length}` }, CHAINS.map(opt)),
  );
}

/** Opens an explorer action from an extension page. Form explorers are submitted from a hidden form. */
export function openAction(action: ExplorerAction) {
  if (action.kind === 'url') {
    if (isSafeExternalUrl(action.href)) void openTab(action.href);
    return;
  }
  if (!isSafeExternalUrl(action.action)) return;
  const form = h('form', { method: action.method, action: action.action, target: '_blank', rel: 'noopener noreferrer', style: 'display:none' }, h('input', { type: 'hidden', name: action.param, value: action.value }));
  document.body.append(form);
  form.submit();
  form.remove();
}

export function searchView(ctx: Ctx, initial: { query?: string; chain?: string } = {}): HTMLElement {
  const { state } = ctx;
  setApiBase(state.settings.apiBase);
  let picked: Chain = (initial.chain && getChain(initial.chain)) || CHAINS[0];
  let userPicked = Boolean(initial.chain && getChain(initial.chain));

  const input = h('input', { class: 'input mono', type: 'text', placeholder: 'Address, tx hash, block or ENS name', 'aria-label': 'Search', autocomplete: 'off', spellcheck: 'false', value: initial.query ?? '' });
  const selectWrap = h('div', { class: 'select-wrap' });
  const info = h('div', { class: 'detect' });
  const results = h('div', { class: 'stack' });
  const recentBox = h('div', null);

  const current = () => {
    const { query } = extractQuery(input.value);
    const all = detectAll(query);
    return { query, all, best: all[0] ?? null };
  };

  const effectiveChain = (best: Detection | null): Chain => {
    if (userPicked || !best?.chains.length) return picked;
    return best.chains.includes(picked.id) ? picked : (getChain(best.chains[0]) ?? picked);
  };

  function renderSelect() {
    const { best } = current();
    const chain = effectiveChain(best);
    const sel = chainSelect(state, chain, best?.chains.slice(0, 14) ?? []);
    sel.addEventListener('change', () => {
      picked = getChain(sel.value) ?? picked;
      userPicked = true;
      renderInfo();
    });
    clear(selectWrap, sel);
  }

  function renderInfo() {
    const { query, best, all } = current();
    if (!query) return clear(info);
    if (!best) return clear(info, h('p', { class: 'muted' }, 'Not a format Web3Lens recognises: it will go to the chosen chain’s explorer search.'));
    if (best.kind === 'secret') return clear(info, note(best.note ?? 'Secret detected.', 'danger'));
    const chain = effectiveChain(best);
    const saved = labelFor(state.saved, best.normalized, chain.id);
    const sanctions = best.kind === 'address' ? checkSanctions(best.normalized) : null;
    clear(
      info,
      h(
        'div',
        { class: 'row wrap' },
        badge(best.label, 'neutral'),
        best.checksum === 'valid' ? badge('checksum ok', 'good') : null,
        best.checksum === 'invalid' ? badge('bad checksum', 'danger') : null,
        best.network === 'testnet' ? badge('testnet', 'warn') : null,
        sanctions?.listed ? badge('OFAC listed', 'danger') : null,
        saved?.label ? badge(`★ ${saved.label}`, 'good') : null,
        all.length > 1 ? h('span', { class: 'muted' }, `also: ${all.slice(1).map((d) => d.label).join(', ')}`) : null,
      ),
      best.note ? note(best.note, best.checksum === 'invalid' ? 'danger' : 'warn') : null,
    );
  }

  function refresh() {
    const { query } = extractQuery(input.value);
    if (query !== input.value.trim() && input.value.trim()) input.value = query;
    if (!query) userPicked = Boolean(initial.chain) && userPicked;
    renderSelect();
    renderInfo();
    recentBox.hidden = Boolean(query);
  }

  function goExplorer(chain: Chain, query: string) {
    const r = resolveExplorer(chain, query, { explorer: state.prefs.explorers[chain.id] });
    if (r.unreachable) {
      results.prepend(
        h(
          'div',
          { class: 'note warn' },
          `${chain.name}'s explorer did not respond at the last health check. `,
          ext_link(webSearchLink(chain, query), 'Search the web'),
          ' · ',
          h('button', { type: 'button', class: 'linkish', on: { click: () => openAction(r.action) } }, 'open anyway'),
        ),
      );
      return;
    }
    if (r.fallback) results.prepend(note(fallbackNotice(chain), 'info'));
    openAction(r.action);
  }

  async function submit(e?: Event, forceExplorer = false) {
    e?.preventDefault();
    const { query, best } = current();
    clear(results);
    if (!query) return results.append(errorText('Paste an address, transaction hash, block number or name first.'));
    if (best?.kind === 'secret') return results.append(note(best.note ?? 'Not searched.', 'danger'));
    const chain = effectiveChain(best);
    await addRecent({ chainId: chain.id, query });
    const d = detectionFor(chain, query);
    const kind = toQueryKind(d);
    const native = d && d.checksum !== 'invalid' && d.network !== 'testnet' && hasNativeSupport(chain.id, kind) && kind !== 'block';
    if (forceExplorer || !native || state.prefs.searchAction === 'explorer') return goExplorer(chain, query);
    if (!state.settings.network) {
      results.append(note('Online lookups are off (settings), so here are the explorers:', 'info'), explorerList(chain.id, d!.normalized, d) ?? h('span'));
      return;
    }
    const evmOverview = (d!.format === 'evm-address' || d!.format === 'evm-tx') && !userPicked;
    if (evmOverview && !ctx.compact) {
      results.append(d!.format === 'evm-address' ? multichainCard(d!.normalized, ctx.nav) : locateCard(d!.normalized, ctx.nav));
      results.append(h('section', { class: 'card' }, h('h2', null, 'Explorers'), explorerList(chain.id, d!.normalized, d) ?? h('span')));
      return;
    }
    const k = kind === 'tx' ? 'tx' : 'address';
    if (ctx.compact) {
      results.append(
        h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn-ghost sm', on: { click: () => void openTab(appUrl(`#result/${k}/${chain.id}/${encodeURIComponent(d!.normalized)}`)) } }, 'Open full view ↗')),
        resultView(k, chain.id, d!.normalized, state.settings, (hash) => void openTab(appUrl(hash)), true),
      );
    } else ctx.nav(`#result/${k}/${chain.id}/${encodeURIComponent(d!.normalized)}`);
  }

  function renderRecent() {
    if (!state.recent.length) return clear(recentBox);
    clear(
      recentBox,
      h(
        'div',
        { class: 'recent' },
        h('p', { class: 'label' }, 'Recent'),
        h(
          'ul',
          { class: 'list' },
          state.recent.map((r) =>
            h(
              'li',
              null,
              h(
                'button',
                {
                  type: 'button',
                  class: 'linkish mono',
                  on: {
                    click: () => {
                      input.value = r.query;
                      picked = getChain(r.chainId) ?? picked;
                      userPicked = true;
                      refresh();
                      void submit();
                    },
                  },
                },
                shortHash(r.query, 10, 8),
              ),
              h('span', { class: 'muted' }, getChain(r.chainId)?.name ?? r.chainId),
            ),
          ),
        ),
        h('button', { type: 'button', class: 'linkish muted', on: { click: async () => (await clearRecent(), (state.recent = []), renderRecent()) } }, 'Clear'),
      ),
    );
  }

  input.addEventListener('input', refresh);
  const form = h(
    'form',
    { class: 'search', on: { submit: (e: Event) => void submit(e) } },
    input,
    h('div', { class: 'row' }, selectWrap, h('button', { type: 'submit', class: 'btn' }, 'Search')),
    h(
      'div',
      { class: 'row' },
      h('button', { type: 'button', class: 'btn-ghost sm', on: { click: () => void submit(undefined, true) } }, 'Open in explorer ↗'),
      h(
        'button',
        {
          type: 'button',
          class: 'btn-ghost sm',
          on: {
            click: async (e: Event) => {
              const { best, query } = current();
              if (!query || best?.kind === 'secret') return;
              const chain = effectiveChain(best);
              await upsertSaved({ query: best?.normalized ?? query, chainId: chain.id });
              (e.target as HTMLElement).textContent = 'Saved ★';
            },
          },
        },
        'Save',
      ),
    ),
  );
  refresh();
  renderRecent();
  queueMicrotask(() => input.focus());
  if (initial.query) queueMicrotask(() => void submit());
  return h('div', { class: 'stack' }, form, info, results, recentBox);
}
