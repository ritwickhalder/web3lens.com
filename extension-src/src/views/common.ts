/** Small building blocks shared by the extension views. */
import { getChain } from '@/lib/chains';
import { explorerLinks } from '@/lib/explorer';
import type { Detection } from '@/lib/detect';
import { formatUtc, timeAgo } from '@/lib/format';
import type { Section } from '@/lib/lookup-types';
import { ext_link, h } from '../dom';

export function card(title: string | null, ...children: (Node | null | false)[]) {
  return h('section', { class: 'card' }, title ? h('h2', null, title) : null, ...children);
}

export function badge(text: string, tone: 'neutral' | 'good' | 'warn' | 'danger' = 'neutral') {
  return h('span', { class: `badge ${tone}` }, text);
}

export function note(text: string, tone: 'info' | 'warn' | 'danger' = 'info') {
  return h('p', { class: `note ${tone}` }, text);
}

export function facts(rows: [string, Node | string | null][]) {
  return h(
    'dl',
    { class: 'facts' },
    rows.filter(([, v]) => v !== null).map(([k, v]) => [h('dt', null, k), h('dd', null, v)]),
  );
}

export function mono(text: string, cls = '') {
  return h('span', { class: `mono ${cls}` }, text);
}

/** Renders a sourced section, or why it's unavailable; always with its source line. */
export function sectionBody<T>(s: Section<T>, render: (d: T) => Node | Node[]): Node[] {
  if (s.status !== 'ok') return [note(`Unavailable${s.source ? ` from ${s.source.name}` : ''}: ${s.reason}. Nothing is shown rather than a guess.`, 'warn')];
  const out = render(s.data);
  return [
    ...(Array.isArray(out) ? out : [out]),
    h(
      'p',
      { class: 'source' },
      `Source: ${s.source.name} · fetched ${timeAgo(s.fetchedAt)}`,
      s.stale ? h('span', { class: 'stale' }, ' · stale (source not responding)') : null,
    ),
  ];
}

export function sourcedCard<T>(title: string, s: Section<T>, render: (d: T) => Node | Node[]) {
  return h('section', { class: 'card' }, h('h2', null, title), ...sectionBody(s, render));
}

export function explorerList(chainId: string, query: string, detection?: Detection | null) {
  const chain = getChain(chainId);
  if (!chain) return null;
  const links = explorerLinks(chain, query, detection);
  return h(
    'div',
    { class: 'chips' },
    links.map((l, i) => ext_link(l.href, `${l.unreachable ? '⚠ ' : ''}${l.name} ↗`, i === 0 ? 'chip primary' : 'chip')),
  );
}

export function when(t: number | string | null | undefined) {
  if (!t) return '—';
  return `${formatUtc(t)} (${timeAgo(t)})`;
}

export function loading(text: string) {
  return h('p', { class: 'muted pulse' }, text);
}

export function errorText(text: string) {
  return h('p', { class: 'error', role: 'alert' }, text);
}
