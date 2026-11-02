/** Batch search in the extension: same parser, checks, CSV and share link as the website. */
import { apiGet } from '@/lib/api-client';
import { BATCH_MAX, parseBatch } from '@/lib/batch';
import { getChain } from '@/lib/chains';
import { toCsv } from '@/lib/csv';
import { explorerLinks } from '@/lib/explorer';
import { formatUsd, shortHash } from '@/lib/format';
import { investigationUrl } from '@/lib/investigation';
import type { MultichainResult } from '@/lib/lookup-types';
import { labelFor } from '@/lib/saved';
import { openTab } from '../browser';
import { clear, copy, ext_link, h } from '../dom';
import { upsertSaved } from '../store';
import { badge, card, note } from './common';
import type { Ctx } from './search';

export function batchView(ctx: Ctx, initial = ''): HTMLElement {
  const text = h('textarea', { class: 'input mono area tall', placeholder: '0x…\nbc1…\nvitalik.eth', spellcheck: 'false' }, initial);
  const out = h('div', { class: 'stack' });
  const msg = h('p', { class: 'accent small' });
  const balances = new Map<string, string>();

  function render() {
    const { rows, truncated } = parseBatch(text.value);
    const table = h(
      'table',
      { class: 'table' },
      h('thead', null, h('tr', null, h('th', null, 'Value'), h('th', null, 'Type'), h('th', null, 'Checks'), h('th', null, 'EVM'), h('th', null, ''))),
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
            h('td', null, d?.label ?? 'not recognised'),
            h('td', null, d?.kind === 'secret' ? badge('secret', 'danger') : null, d?.checksum === 'valid' ? badge('ok', 'good') : null, d?.checksum === 'invalid' ? badge('bad checksum', 'danger') : null, r.sanctions?.listed ? badge('OFAC', 'danger') : null),
            h('td', { class: 'muted' }, d ? (balances.get(d.normalized) ?? '') : ''),
            h('td', null, link ? ext_link(link.href, `${link.name} ↗`) : null),
          );
        }),
      ),
    );
    const evm = rows.filter((r) => r.detection?.format === 'evm-address' && r.detection.checksum !== 'invalid');
    clear(
      out,
      truncated ? note(`${truncated} more left out (limit ${BATCH_MAX}).`, 'warn') : null,
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
                    if (!ctx.state.settings.network) return (msg.textContent = 'Online lookups are off in settings.');
                    for (const r of evm) {
                      const q = r.detection!.normalized;
                      balances.set(q, 'checking…');
                      render();
                      try {
                        const m = await apiGet<MultichainResult>('multichain', { q });
                        const ok = m.rows.filter((x) => x.status === 'ok');
                        balances.set(q, `${ok.filter((x) => x.balanceWei !== '0' || (x.nonce ?? 0) > 0).length}/11 active · ${formatUsd(ok.reduce((n, x) => n + (x.usd ?? 0), 0)) || '$0'}`);
                      } catch (e) {
                        balances.set(q, `unavailable: ${(e as Error).message}`);
                      }
                      render();
                    }
                  },
                },
              },
              `Fetch EVM balances (${evm.length})`,
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
              'Export CSV',
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
                    for (const r of rows) if (r.detection && r.detection.kind !== 'secret') await upsertSaved({ query: r.detection.normalized, chainId: null });
                    msg.textContent = 'Saved to this browser.';
                  },
                },
              },
              'Save all',
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
                    msg.textContent = 'Share link copied (opens on web3lens.com; the list is inside the link).';
                  },
                },
              },
              'Copy share link',
            )
          : null,
      ),
      msg,
      rows.length ? card(`${rows.length} checked`, h('div', { class: 'scroll-x' }, table)) : null,
    );
  }

  return h(
    'div',
    { class: 'stack' },
    h('p', { class: 'label' }, 'Batch search'),
    h('h1', { class: 'heading' }, 'Check a list at once'),
    h('p', { class: 'muted' }, `Up to ${BATCH_MAX} addresses, hashes or names: one per line, or separated by commas or spaces.`),
    text,
    h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn', on: { click: render } }, 'Check all')),
    out,
  );
}

export function openBatchWith(values: string[], appUrl: (hash: string) => string) {
  return openTab(appUrl(`#batch?q=${encodeURIComponent(values.join('\n'))}`));
}
