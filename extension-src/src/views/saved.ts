/** Saved labels and notes in the extension, with export/import and share links. */
import { getChain } from '@/lib/chains';
import { detectQuery } from '@/lib/detect';
import { investigationUrl } from '@/lib/investigation';
import { exportSaved, sanitizeSaved } from '@/lib/saved';
import { clear, copy, h } from '../dom';
import { detectLabel, t } from '../i18n';
import { importSaved, removeSaved, savedCap, upsertSaved } from '../store';
import type { Ctx } from './search';
import { syncStatus } from './sync-status';

export function savedView(ctx: Ctx): HTMLElement {
  const list = h('ul', { class: 'list saved' });
  const msg = h('p', { class: 'accent small' });
  const selected = new Set<string>();
  const filter = h('input', { class: 'input', placeholder: t('savedPage.filter'), 'aria-label': t('saved.filterLabel') });

  function render() {
    const f = filter.value.trim().toLowerCase();
    const items = [...ctx.state.saved]
      .filter((x) => !f || x.label.toLowerCase().includes(f) || x.query.toLowerCase().includes(f) || x.note.toLowerCase().includes(f))
      .sort((a, b) => Number(b.favourite) - Number(a.favourite) || b.addedAt - a.addedAt);
    if (!ctx.state.saved.length) return clear(list, h('li', { class: 'muted' }, t('savedPage.empty')));
    clear(
      list,
      ...items.map((item) => {
        const d = detectQuery(item.query);
        const chain = item.chainId ? getChain(item.chainId) : undefined;
        const kind = d?.kind === 'transaction' ? 'tx' : 'address';
        const label = h('input', { class: 'input', value: item.label, placeholder: t('savedPage.label'), maxlength: '80', 'aria-label': t('savedPage.label') });
        label.addEventListener('change', () => void upsertSaved({ query: item.query, chainId: item.chainId, label: label.value }));
        const notes = h('textarea', { class: 'input area', placeholder: t('savedPage.notes'), maxlength: '1000', 'aria-label': t('savedPage.notes') }, item.note);
        notes.addEventListener('change', () => void upsertSaved({ query: item.query, chainId: item.chainId, note: notes.value }));
        const check = h('input', { type: 'checkbox', checked: selected.has(item.id) ? true : undefined, 'aria-label': t('savedPage.select') });
        check.addEventListener('change', () => (check.checked ? selected.add(item.id) : selected.delete(item.id)));
        return h(
          'li',
          { class: 'saved-item' },
          check,
          h(
            'div',
            { class: 'stack tight' },
            label,
            h(
              'button',
              { type: 'button', class: 'linkish mono', on: { click: () => ctx.nav(chain ? `#result/${kind}/${chain.id}/${encodeURIComponent(item.query)}` : `#search?q=${encodeURIComponent(item.query)}`) } },
              item.query,
            ),
            h('span', { class: 'muted small' }, `${d ? detectLabel(d.label) : t('common.unrecognised')}${chain ? ` · ${chain.name}` : ''}`),
            notes,
          ),
          h(
            'div',
            { class: 'col' },
            h('button', { type: 'button', class: 'btn-ghost sm', 'aria-pressed': String(item.favourite), on: { click: () => void upsertSaved({ query: item.query, chainId: item.chainId, favourite: !item.favourite }) } }, item.favourite ? '★' : '☆'),
            h('button', { type: 'button', class: 'btn-ghost sm', on: { click: () => void removeSaved(item.id) } }, t('savedPage.remove')),
          ),
        );
      }),
    );
  }
  filter.addEventListener('input', render);
  const file = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
  file.addEventListener('change', async () => {
    const f = file.files?.[0];
    if (!f) return;
    try {
      if (f.size > 2_000_000) throw new Error(t('savedPage.tooLarge'));
      const raw = JSON.parse(await f.text());
      const incoming = sanitizeSaved(raw?.items ?? raw);
      const r = await importSaved(incoming);
      msg.textContent = r.skipped ? `${t('savedPage.imported', { count: r.imported })} ${t('pro.savedFull', { count: r.skipped, max: await savedCap() })}` : t('savedPage.imported', { count: r.imported });
    } catch (e) {
      msg.textContent = t('savedPage.importFailed', { error: (e as Error).message });
    }
  });
  render();
  return h(
    'div',
    { class: 'stack' },
    h('p', { class: 'label' }, t('common.saved')),
    h('h1', { class: 'heading' }, t('savedPage.title')),
    h('p', { class: 'muted' }, t('savedPage.intro')),
    syncStatus(ctx.state.settings.network, true),
    h(
      'div',
      { class: 'row wrap' },
      h('button', { type: 'button', class: 'btn-ghost sm', on: { click: () => h('a', { href: URL.createObjectURL(new Blob([exportSaved(ctx.state.saved)], { type: 'application/json' })), download: 'web3lens-saved.json' }).click() } }, t('savedPage.exportJson')),
      h('button', { type: 'button', class: 'btn-ghost sm', on: { click: () => file.click() } }, t('savedPage.importJson')),
      file,
      h(
        'button',
        {
          type: 'button',
          class: 'btn-ghost sm',
          on: {
            click: async () => {
              const items = ctx.state.saved.filter((x) => selected.has(x.id)).map((x) => ({ q: x.query, c: x.chainId ?? undefined, l: x.label, n: x.note }));
              if (!items.length) return (msg.textContent = t('savedPage.selectFirst'));
              await copy(investigationUrl({ v: 1, t: `Investigation (${items.length} items)`, items }, ctx.state.settings.apiBase));
              msg.textContent = t('savedPage.shareCopied');
            },
          },
        },
        t('savedPage.shareSelected'),
      ),
    ),
    msg,
    filter,
    list,
  );
}
