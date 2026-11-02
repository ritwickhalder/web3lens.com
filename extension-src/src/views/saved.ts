/** Saved labels and notes in the extension, with export/import and share links. */
import { getChain } from '@/lib/chains';
import { detectQuery } from '@/lib/detect';
import { investigationUrl } from '@/lib/investigation';
import { exportSaved, sanitizeSaved } from '@/lib/saved';
import { clear, copy, h } from '../dom';
import { removeSaved, setSaved, upsertSaved } from '../store';
import type { Ctx } from './search';

export function savedView(ctx: Ctx): HTMLElement {
  const list = h('ul', { class: 'list saved' });
  const msg = h('p', { class: 'accent small' });
  const selected = new Set<string>();
  const filter = h('input', { class: 'input', placeholder: 'Filter', 'aria-label': 'Filter saved items' });

  function render() {
    const f = filter.value.trim().toLowerCase();
    const items = [...ctx.state.saved]
      .filter((x) => !f || x.label.toLowerCase().includes(f) || x.query.toLowerCase().includes(f) || x.note.toLowerCase().includes(f))
      .sort((a, b) => Number(b.favourite) - Number(a.favourite) || b.addedAt - a.addedAt);
    if (!ctx.state.saved.length) return clear(list, h('li', { class: 'muted' }, 'Nothing saved yet. Use Save in search or batch.'));
    clear(
      list,
      ...items.map((item) => {
        const d = detectQuery(item.query);
        const chain = item.chainId ? getChain(item.chainId) : undefined;
        const kind = d?.kind === 'transaction' ? 'tx' : 'address';
        const label = h('input', { class: 'input', value: item.label, placeholder: 'Label', maxlength: '80', 'aria-label': 'Label' });
        label.addEventListener('change', () => void upsertSaved({ query: item.query, chainId: item.chainId, label: label.value }));
        const notes = h('textarea', { class: 'input area', placeholder: 'Notes', maxlength: '1000', 'aria-label': 'Notes' }, item.note);
        notes.addEventListener('change', () => void upsertSaved({ query: item.query, chainId: item.chainId, note: notes.value }));
        const check = h('input', { type: 'checkbox', checked: selected.has(item.id) ? true : undefined, 'aria-label': 'Select' });
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
            h('span', { class: 'muted small' }, `${d?.label ?? 'unrecognised'}${chain ? ` · ${chain.name}` : ''}`),
            notes,
          ),
          h(
            'div',
            { class: 'col' },
            h('button', { type: 'button', class: 'btn-ghost sm', 'aria-pressed': String(item.favourite), on: { click: () => void upsertSaved({ query: item.query, chainId: item.chainId, favourite: !item.favourite }) } }, item.favourite ? '★' : '☆'),
            h('button', { type: 'button', class: 'btn-ghost sm', on: { click: () => void removeSaved(item.id) } }, 'Remove'),
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
      if (f.size > 2_000_000) throw new Error('File too large');
      const raw = JSON.parse(await f.text());
      const incoming = sanitizeSaved(raw?.items ?? raw);
      await setSaved([...incoming, ...ctx.state.saved]);
      msg.textContent = `Imported ${incoming.length} items.`;
    } catch (e) {
      msg.textContent = `Import failed: ${(e as Error).message}`;
    }
  });
  render();
  return h(
    'div',
    { class: 'stack' },
    h('p', { class: 'label' }, 'Saved'),
    h('h1', { class: 'heading' }, 'Your labels and notes'),
    h('p', { class: 'muted' }, 'Labels and notes stay in this browser (extension storage). Nothing is synced.'),
    h(
      'div',
      { class: 'row wrap' },
      h('button', { type: 'button', class: 'btn-ghost sm', on: { click: () => h('a', { href: URL.createObjectURL(new Blob([exportSaved(ctx.state.saved)], { type: 'application/json' })), download: 'web3lens-saved.json' }).click() } }, 'Export JSON'),
      h('button', { type: 'button', class: 'btn-ghost sm', on: { click: () => file.click() } }, 'Import JSON'),
      file,
      h(
        'button',
        {
          type: 'button',
          class: 'btn-ghost sm',
          on: {
            click: async () => {
              const items = ctx.state.saved.filter((x) => selected.has(x.id)).map((x) => ({ q: x.query, c: x.chainId ?? undefined, l: x.label, n: x.note }));
              if (!items.length) return (msg.textContent = 'Select items first.');
              await copy(investigationUrl({ v: 1, t: `Investigation (${items.length} items)`, items }, ctx.state.settings.apiBase));
              msg.textContent = 'Share link copied. Labels and notes are inside the link: anyone with it can read them.';
            },
          },
        },
        'Share selected',
      ),
    ),
    msg,
    filter,
    list,
  );
}
