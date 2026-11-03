/** Search with auto-detect, chain picker, explorer handoff and native results: popup and full page. */
import { setApiBase } from '@/lib/api-client';
import { CHAINS, getChain, type Chain } from '@/lib/chains';
import { detectAll, extractQuery, type Detection } from '@/lib/detect';
import { detectionFor, isSafeExternalUrl, resolveExplorer, toQueryKind, webSearchLink, type ExplorerAction } from '@/lib/explorer';
import { shortHash } from '@/lib/format';
import { hasNativeSupport } from '@/lib/networks';
import { labelFor } from '@/lib/saved';
import { checkSanctions } from '@/lib/security/sanctions';
import { appUrl, openTab } from '../browser';
import { clear, copy, ext_link, h } from '../dom';
import { detectLabel, detectNote, t } from '../i18n';
import { addRecent, clearRecent, setPrefs, upsertSaved, type load } from '../store';
import { chainPicker, glyph, icon } from '../ui';
import { badge, errorText, explorerList, note } from './common';
import { locateCard, multichainCard, resultView, type Nav } from './results';

export type State = Awaited<ReturnType<typeof load>>;
export type Ctx = { state: State; nav: Nav; compact: boolean };

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

/**
 * `recentInto` renders the recent list into an element the caller places (the popup's side column);
 * `idle` is hidden together with it while there is a query.
 */
export function searchView(ctx: Ctx, initial: { query?: string; chain?: string; recentInto?: HTMLElement; idle?: HTMLElement } = {}): HTMLElement {
  const { state } = ctx;
  setApiBase(state.settings.apiBase);
  let userPicked = Boolean(initial.chain && getChain(initial.chain));

  const input = h('input', {
    class: 'search-input',
    type: 'text',
    placeholder: t('search.placeholder'),
    'aria-label': t('search.inputLabel'),
    autocomplete: 'off',
    spellcheck: 'false',
    value: initial.query ?? '',
  });
  const picker = chainPicker({
    value: (initial.chain && getChain(initial.chain)) || CHAINS[0],
    favourites: state.prefs.favouriteChains,
    onChange: () => {
      userPicked = true;
      renderInfo();
    },
    onToggleFavourite: (id) => {
      const fav = state.prefs.favouriteChains;
      state.prefs = { ...state.prefs, favouriteChains: fav.includes(id) ? fav.filter((x) => x !== id) : [...fav, id] };
      void setPrefs(state.prefs);
    },
  });
  const info = h('div', { class: 'detect', 'aria-live': 'polite' });
  const results = h('div', { class: 'stack results' });
  const recentBox = initial.recentInto ?? h('div', null);

  const current = () => {
    const { query } = extractQuery(input.value);
    const all = detectAll(query);
    return { query, all, best: all[0] ?? null };
  };

  const effectiveChain = (best: Detection | null): Chain => {
    const picked = picker.value();
    if (userPicked || !best?.chains.length) return picked;
    return best.chains.includes(picked.id) ? picked : (getChain(best.chains[0]) ?? picked);
  };

  function syncPicker() {
    const { best } = current();
    picker.setDetected(best?.kind === 'secret' ? [] : (best?.chains.slice(0, 14) ?? []));
    const chain = effectiveChain(best);
    if (chain.id !== picker.value().id || (!userPicked && best?.chains.includes(chain.id))) picker.set(chain, { auto: !userPicked && Boolean(best?.chains.includes(chain.id)) });
    else if (!best) picker.set(chain, { auto: false });
  }

  function renderInfo() {
    const { query, best, all } = current();
    if (!query) return clear(info);
    if (!best) return clear(info, h('p', { class: 'hint' }, t('search.unknownFormat')));
    if (best.kind === 'secret') return clear(info, note(best.note ? detectNote(best.note) : t('search.secret'), 'danger'));
    const chain = effectiveChain(best);
    const saved = labelFor(state.saved, best.normalized, chain.id);
    const sanctions = best.kind === 'address' ? checkSanctions(best.normalized) : null;
    const candidates = best.chains.map((id) => getChain(id)).filter((c): c is Chain => Boolean(c));
    clear(
      info,
      h(
        'div',
        { class: 'row wrap' },
        h('span', { class: 'detect-pill' }, icon('scan'), detectLabel(best.label), best.checksum === 'valid' ? h('span', { class: 'pill-sub' }, t('search.checksumOk')) : null),
        best.checksum === 'invalid' ? badge(t('search.badChecksum'), 'danger') : null,
        best.network === 'testnet' ? badge(t('search.testnet'), 'warn') : null,
        sanctions?.listed ? badge(t('search.ofacListed'), 'danger') : null,
        saved?.label ? badge(`★ ${saved.label}`, 'good') : null,
      ),
      candidates.length > 1 || !candidates.includes(chain)
        ? h(
            'div',
            { class: 'row wrap chips-row' },
            h('span', { class: 'row-label' }, candidates.includes(chain) ? t('search.searchOn') : t('search.switchTo')),
            candidates.slice(0, ctx.compact ? 4 : 8).map((c) =>
              h(
                'button',
                {
                  type: 'button',
                  class: `chain-chip${c.id === chain.id ? ' active' : ''}`,
                  'aria-pressed': String(c.id === chain.id),
                  on: {
                    click: () => {
                      picker.set(c);
                      userPicked = true;
                      renderInfo();
                    },
                  },
                },
                glyph(c.id, c.name, 'xs'),
                c.name,
              ),
            ),
          )
        : null,
      all.length > 1 ? h('p', { class: 'hint' }, t('search.couldBe', { list: all.slice(1).map((d) => detectLabel(d.label)).join(', ') })) : null,
      best.note ? note(detectNote(best.note), best.checksum === 'invalid' ? 'danger' : 'warn') : null,
    );
  }

  function refresh() {
    const { query } = extractQuery(input.value);
    if (query !== input.value.trim() && input.value.trim()) input.value = query;
    if (!query && !initial.chain) userPicked = false;
    syncPicker();
    renderInfo();
    recentBox.hidden = Boolean(query);
    if (initial.idle) initial.idle.hidden = Boolean(query);
  }

  function goExplorer(chain: Chain, query: string) {
    const r = resolveExplorer(chain, query, { explorer: state.prefs.explorers[chain.id] });
    if (r.unreachable) {
      results.prepend(
        h(
          'div',
          { class: 'note warn' },
          icon('warning'),
          h(
            'span',
            null,
            `${t('search.explorerDown', { chain: chain.name })} `,
            ext_link(webSearchLink(chain, query), t('search.searchWeb')),
            ' · ',
            h('button', { type: 'button', class: 'linkish', on: { click: () => openAction(r.action) } }, t('search.openAnyway')),
          ),
        ),
      );
      return;
    }
    if (r.fallback) results.prepend(note(t('search.fallback', { chain: chain.name }), 'info'));
    openAction(r.action);
  }

  async function submit(e?: Event, forceExplorer = false) {
    e?.preventDefault();
    const { query, best } = current();
    clear(results);
    fullBtn.hidden = true;
    if (!query) return results.append(errorText(t('search.empty')));
    if (best?.kind === 'secret') return results.append(note(best.note ? detectNote(best.note) : t('search.notSearched'), 'danger'));
    const chain = effectiveChain(best);
    await addRecent({ chainId: chain.id, query });
    const d = detectionFor(chain, query);
    const kind = toQueryKind(d);
    const native = d && d.checksum !== 'invalid' && d.network !== 'testnet' && hasNativeSupport(chain.id, kind) && kind !== 'block';
    if (forceExplorer || !native || state.prefs.searchAction === 'explorer') return goExplorer(chain, query);
    if (!state.settings.network) {
      results.append(note(t('search.offlineExplorers'), 'info'), explorerList(chain.id, d!.normalized, d) ?? h('span'));
      return;
    }
    const evmOverview = (d!.format === 'evm-address' || d!.format === 'evm-tx') && !userPicked;
    if (evmOverview && !ctx.compact) {
      results.append(d!.format === 'evm-address' ? multichainCard(d!.normalized, ctx.nav) : locateCard(d!.normalized, ctx.nav));
      results.append(h('section', { class: 'card' }, h('h2', null, t('common.explorers')), explorerList(chain.id, d!.normalized, d) ?? h('span')));
      return;
    }
    const k = kind === 'tx' ? 'tx' : 'address';
    if (ctx.compact) {
      fullView = `#result/${k}/${chain.id}/${encodeURIComponent(d!.normalized)}`;
      fullBtn.hidden = false;
      results.append(resultView(k, chain.id, d!.normalized, state.settings, (hash) => void openTab(appUrl(hash)), true));
    } else ctx.nav(`#result/${k}/${chain.id}/${encodeURIComponent(d!.normalized)}`);
  }

  function renderRecent() {
    if (!state.recent.length) {
      return initial.recentInto
        ? clear(recentBox, h('section', { class: 'recent' }, h('div', { class: 'section-head' }, h('p', { class: 'label' }, icon('history'), t('search.recent'))), h('p', { class: 'hint' }, t('search.recentEmpty'))))
        : clear(recentBox);
    }
    clear(
      recentBox,
      h(
        'section',
        { class: 'recent' },
        h('div', { class: 'section-head' }, h('p', { class: 'label' }, icon('history'), t('search.recent')), h('button', { type: 'button', class: 'linkish muted small', on: { click: async () => (await clearRecent(), (state.recent = []), renderRecent()) } }, t('common.clear'))),
        h(
          'ul',
          { class: 'recent-list' },
          state.recent.slice(0, initial.recentInto ? 4 : undefined).map((r) => {
            const c = getChain(r.chainId);
            return h(
              'li',
              null,
              h(
                'button',
                {
                  type: 'button',
                  class: 'recent-item',
                  on: {
                    click: () => {
                      input.value = r.query;
                      if (c) picker.set(c);
                      userPicked = true;
                      refresh();
                      void submit();
                    },
                  },
                },
                c ? glyph(c.id, c.name, 'sm') : null,
                h('span', { class: 'mono' }, shortHash(r.query, 10, 8)),
                h('span', { class: 'muted small' }, c?.name ?? r.chainId),
              ),
            );
          }),
        ),
      ),
    );
  }

  input.addEventListener('input', refresh);
  const form = h(
    'form',
    { class: 'searchbar marks', on: { submit: (e: Event) => void submit(e) } },
    picker.el,
    h('span', { class: 'divider', 'aria-hidden': 'true' }),
    input,
    h('button', { type: 'submit', class: 'btn search-btn' }, t('common.search'), icon('arrowRight')),
  );
  // In the popup, the compact result's "Open full view" sits at the end of the action row.
  let fullView = '';
  const fullBtn = h('button', { type: 'button', class: 'btn-ghost sm full-view', hidden: true, on: { click: () => fullView && void openTab(appUrl(fullView)) } }, t('search.openFull'), icon('arrowRight'));
  const actions = h(
    'div',
    { class: 'row wrap actions' },
    h('button', { type: 'button', class: 'btn-ghost sm', on: { click: () => void submit(undefined, true) } }, icon('external'), t('search.openExplorer')),
    h(
      'button',
      {
        type: 'button',
        class: 'btn-ghost sm',
        on: {
          click: async (e: Event) => {
            // currentTarget is reset once the event finishes dispatching, so read it before awaiting.
            const btn = e.currentTarget as HTMLElement;
            const { best, query } = current();
            if (!query || best?.kind === 'secret') return;
            const chain = effectiveChain(best);
            await upsertSaved({ query: best?.normalized ?? query, chainId: chain.id });
            btn.replaceChildren(icon('check'), t('common.saved'));
          },
        },
      },
      icon('bookmark'),
      t('common.save'),
    ),
    h(
      'button',
      {
        type: 'button',
        class: 'btn-ghost sm',
        on: {
          click: async (e: Event) => {
            const btn = e.currentTarget as HTMLElement;
            const { best, query } = current();
            if (!query || best?.kind === 'secret') return;
            await copy(best?.normalized ?? query);
            btn.replaceChildren(icon('check'), t('common.copied'));
            setTimeout(() => btn.replaceChildren(icon('copy'), t('common.copy')), 1200);
          },
        },
      },
      icon('copy'),
      t('common.copy'),
    ),
  );
  refresh();
  renderRecent();
  queueMicrotask(() => input.focus());
  if (initial.query) queueMicrotask(() => void submit());
  actions.append(fullBtn);
  return h('div', { class: 'stack' }, form, info, actions, results, initial.recentInto ? null : recentBox);
}
