/** Batch search in the extension: same parser, checks, CSV and share link as the website. */
import { parseBatch } from '@/lib/batch';
import { canUse, LIMITS, PRE_LAUNCH_LIMITS, type Limits } from '@/lib/entitlements';
import { getChain } from '@/lib/chains';
import { toCsv } from '@/lib/csv';
import { explorerLinks } from '@/lib/explorer';
import { formatUsd, shortHash } from '@/lib/format';
import { investigationUrl } from '@/lib/investigation';
import { labelFor } from '@/lib/saved';
import { ACCOUNT_ORIGIN, batchBalances, displayPlan, extLimits, loadAccount } from '../account';
import { openTab } from '../browser';
import { clear, copy, ext_link, h } from '../dom';
import { detectLabel, t } from '../i18n';
import { upsertSaved } from '../store';
import { badge, card, note } from './common';
import type { Ctx } from './search';

export function batchView(ctx: Ctx, initial = ''): HTMLElement {
  const text = h('textarea', { class: 'input mono area tall', placeholder: '0x…\nbc1…\nvitalik.eth', spellcheck: 'false' }, initial);
  const out = h('div', { class: 'stack' });
  const msg = h('p', { class: 'accent small' });
  const balances = new Map<string, string>();
  let limits: Limits = PRE_LAUNCH_LIMITS;
  let plan: ReturnType<typeof displayPlan> = null;
  let launched = false;
  let limitNote: string | null = null;
  let usage: { used: number; limit: number } | null = null;
  const intro = h('p', { class: 'muted' }, t('batch.intro', { max: limits.batch }));
  void loadAccount().then((a) => {
    limits = extLimits(a);
    plan = displayPlan(a);
    launched = a.me?.billing === true;
    intro.textContent = t('batch.intro', { max: limits.batch });
    if (out.childNodes.length) render();
  });
  const pro = () => !!plan && plan !== 'free';
  const upsell = () =>
    launched && !pro()
      ? h('p', { class: 'muted small' }, `${t('pro.upgradeBatch', { max: LIMITS.pro.batch })} `, h('a', { href: `${ACCOUNT_ORIGIN}/pricing`, target: '_blank', rel: 'noopener noreferrer' }, t('pro.seePro')))
      : null;

  function render() {
    const { rows, truncated } = parseBatch(text.value, limits.batch);
    const table = h(
      'table',
      { class: 'table' },
      h('thead', null, h('tr', null, h('th', null, t('batch.valueCol')), h('th', null, t('batch.typeCol')), h('th', null, t('batch.checksCol')), h('th', null, 'EVM'), h('th', null, ''))),
      h(
        'tbody',
        null,
        rows.map((r) => {
          const d = r.detection;
          const chain = d?.chains[0] ? getChain(d.chains[0]) : undefined;
          const link = d && chain && d.kind !== 'secret' ? explorerLinks(chain, d.normalized, d)[0] : undefined;
          const label = d ? labelFor(ctx.state.saved, d.normalized, null)?.label : undefined;
          return h(
            'tr',
            null,
            h('td', null, h('span', { class: 'mono', title: d?.normalized ?? r.input }, shortHash(d?.normalized ?? r.input, 8, 6)), label ? h('div', { class: 'accent small' }, label) : null),
            h('td', null, d ? detectLabel(d.label) : t('batch.notRecognised')),
            h('td', null, d?.kind === 'secret' ? badge(t('batch.secret'), 'danger') : null, d?.checksum === 'valid' ? badge(t('batch.ok'), 'good') : null, d?.checksum === 'invalid' ? badge(t('search.badChecksum'), 'danger') : null, r.sanctions?.listed ? badge('OFAC', 'danger') : null),
            h('td', { class: 'muted' }, d ? (balances.get(d.normalized) ?? '') : ''),
            h('td', null, link ? ext_link(link.href, `${link.name} ↗`) : null),
          );
        }),
      ),
    );
    const evm = rows.filter((r) => r.detection?.format === 'evm-address' && r.detection.checksum !== 'invalid');
    clear(
      out,
      truncated ? note(t('batch.leftOut', { count: truncated, max: limits.batch }), 'warn') : null,
      limitNote ? note(limitNote, 'warn') : null,
      usage ? h('p', { class: 'muted small' }, t('pro.usage', { used: usage.used, limit: usage.limit })) : null,
      truncated || limitNote ? upsell() : null,
      h(
        'div',
        { class: 'row wrap' },
        evm.length
          ? h(
              'button',
              {
                type: 'button',
                class: 'btn-ghost sm',
                on: {
                  click: async () => {
                    if (!ctx.state.settings.network) return (msg.textContent = t('common.offInSettings'));
                    const targets = evm.slice(0, limits.batchBalances).map((r) => r.detection!.normalized);
                    limitNote = evm.length > targets.length ? t('pro.balancesCapped', { max: limits.batchBalances }) : null;
                    const chunk = pro() ? 50 : limits.batchBalances;
                    for (let i = 0; i < targets.length; i += chunk) {
                      const part = targets.slice(i, i + chunk);
                      for (const q of part) balances.set(q, t('batch.checking'));
                      render();
                      const r = await batchBalances(part);
                      if (r.usage) usage = r.usage;
                      if (!r.ok) {
                        for (const q of part) balances.set(q, r.status === 429 ? t('pro.dailyLimitShort') : t('common.unavailable'));
                        if (r.status === 429 || r.status === 413) limitNote = r.status === 429 ? t('pro.dailyLimit', { limit: r.usage?.limit ?? limits.crossChainPerDay }) : t('pro.balancesCapped', { max: limits.batchBalances });
                        render();
                        break;
                      }
                      for (const x of r.results) {
                        if (!x.result) {
                          balances.set(x.address, t('common.unavailableReason', { reason: x.error ?? '' }));
                          continue;
                        }
                        const ok = x.result.rows.filter((y) => y.status === 'ok');
                        balances.set(x.address, t('batch.active', { active: ok.filter((y) => y.balanceWei !== '0' || (y.nonce ?? 0) > 0).length, total: x.result.rows.length, usd: formatUsd(ok.reduce((n, y) => n + (y.usd ?? 0), 0)) || '$0' }));
                      }
                      render();
                    }
                  },
                },
              },
              t('batch.fetchBalances', { count: Math.min(evm.length, limits.batchBalances) }),
            )
          : null,
        rows.length
          ? h(
              'button',
              {
                type: 'button',
                class: 'btn-ghost sm',
                on: {
                  click: () => {
                    const csv = toCsv(
                      ['input', 'normalized', 'type', 'checksum', 'chains', 'ofac_listed', 'evm'],
                      rows.map((r) => [r.input, r.detection?.normalized ?? '', r.detection?.label ?? '', r.detection?.checksum ?? '', r.detection?.chains.join(' ') ?? '', r.sanctions ? (r.sanctions.listed ? 'yes' : 'no') : '', r.detection ? (balances.get(r.detection.normalized) ?? '') : '']),
                    );
                    const a = h('a', { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'web3lens-batch.csv' });
                    a.click();
                  },
                },
              },
              t('batch.exportCsv'),
            )
          : null,
        rows.length
          ? h(
              'button',
              {
                type: 'button',
                class: 'btn-ghost sm',
                disabled: plan && canUse('jsonExport', plan) ? undefined : true,
                title: plan && canUse('jsonExport', plan) ? undefined : t('pro.proOnly'),
                on: {
                  click: () => {
                    const data = {
                      app: 'web3lens',
                      kind: 'batch',
                      exportedAt: new Date().toISOString(),
                      rows: rows.map((r) => ({ input: r.input, normalized: r.detection?.normalized ?? null, type: r.detection?.label ?? null, checksum: r.detection?.checksum ?? null, chains: r.detection?.chains ?? [], ofacListed: r.sanctions ? r.sanctions.listed : null, evm: r.detection ? (balances.get(r.detection.normalized) ?? null) : null })),
                    };
                    const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })), download: 'web3lens-batch.json' });
                    a.click();
                  },
                },
              },
              plan && canUse('jsonExport', plan) ? t('pro.exportJson') : `${t('pro.exportJson')} · ${t('pro.proOnly')}`,
            )
          : null,
        rows.length
          ? h(
              'button',
              {
                type: 'button',
                class: 'btn-ghost sm',
                on: {
                  click: async () => {
                    let refused = 0;
                    for (const r of rows) if (r.detection && r.detection.kind !== 'secret' && (await upsertSaved({ query: r.detection.normalized, chainId: null })) === 'limit') refused++;
                    msg.textContent = refused ? `${t('batch.savedMsg')} ${t('pro.savedFull', { count: refused, max: limits.savedLocal })}` : t('batch.savedMsg');
                  },
                },
              },
              t('batch.saveAll'),
            )
          : null,
        rows.length
          ? h(
              'button',
              {
                type: 'button',
                class: 'btn-ghost sm',
                on: {
                  click: async () => {
                    const items = rows.filter((r) => r.detection && r.detection.kind !== 'secret').map((r) => ({ q: r.detection!.normalized }));
                    const url = investigationUrl({ v: 1, t: `Batch of ${items.length}`, items }, ctx.state.settings.apiBase);
                    await copy(url);
                    msg.textContent = t('batch.shareCopied');
                  },
                },
              },
              t('batch.copyShare'),
            )
          : null,
      ),
      msg,
      rows.length ? card(t('batch.checked', { count: rows.length }), h('div', { class: 'scroll-x' }, table)) : null,
    );
  }

  return h(
    'div',
    { class: 'stack' },
    h('p', { class: 'label' }, t('app.batchSearch')),
    h('h1', { class: 'heading' }, t('batch.title')),
    intro,
    text,
    h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn', on: { click: render } }, t('batch.checkAll'))),
    out,
  );
}

export function openBatchWith(values: string[], appUrl: (hash: string) => string) {
  return openTab(appUrl(`#batch?q=${encodeURIComponent(values.join('\n'))}`));
}
