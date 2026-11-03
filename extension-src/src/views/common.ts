/** Small building blocks shared by the extension views. */
import { ApiError } from '@/lib/api-client';
import { getChain } from '@/lib/chains';
import { explorerLinks } from '@/lib/explorer';
import type { Detection } from '@/lib/detect';
import { formatUtc } from '@/lib/format';
import type { Section } from '@/lib/lookup-types';
import { ext_link, h } from '../dom';
import { ago, t } from '../i18n';
import { icon } from '../ui';

export function card(title: string | null, ...children: (Node | null | false)[]) {
  return h('section', { class: 'card' }, title ? h('h2', null, title) : null, ...children);
}

export function badge(text: string, tone: 'neutral' | 'good' | 'warn' | 'danger' = 'neutral') {
  return h('span', { class: `badge ${tone}` }, text);
}

export function note(text: string, tone: 'info' | 'warn' | 'danger' = 'info') {
  return h('p', { class: `note ${tone}` }, icon(tone === 'info' ? 'info' : tone === 'danger' ? 'shieldWarning' : 'warning'), h('span', null, text));
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
  if (s.status !== 'ok') return [note(s.source ? t('source.unavailableFrom', { source: s.source.name, reason: s.reason }) : t('source.unavailable', { reason: s.reason }), 'warn')];
  const out = render(s.data);
  return [
    ...(Array.isArray(out) ? out : [out]),
    h(
      'p',
      { class: 'source' },
      t('source.line', { source: s.source.name, ago: ago(s.fetchedAt) }),
      s.stale ? h('span', { class: 'stale' }, ` ${t('source.stale')}`) : null,
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
    links.map((l, i) => {
      const a = ext_link(l.href, [l.unreachable ? icon('warning', 'ic warn') : null, l.name, icon('external', 'ic xs')], i === 0 && !l.unreachable ? 'chip primary' : 'chip');
      if (l.unreachable) a.setAttribute('title', t('source.explorerDown'));
      return a;
    }),
  );
}

export function when(ts: number | string | null | undefined) {
  if (!ts) return '—';
  return `${formatUtc(ts)} (${ago(ts)})`;
}

export function loading(text: string) {
  return h('p', { class: 'muted pulse' }, text);
}

export function errorText(text: string) {
  return h('p', { class: 'error', role: 'alert' }, text);
}

/** API errors already read well; anything else means the answer couldn't be shown (e.g. site and extension out of step). */
export function failMessage(e: unknown): string {
  if (!(e instanceof ApiError)) return t('api.badAnswer');
  // lib/api-client's own messages (the server's `error` texts stay as sent).
  if (e.status === 0) return e.message.startsWith('Web3Lens took too long') ? t('api.timeout') : t('api.unreachable');
  if (e.status === 429 && e.message.startsWith('Too many lookups')) return t('api.rateLimited');
  if (e.message.startsWith('The Web3Lens lookup service is unavailable')) return t('api.serviceDown', { status: e.status });
  return e.message;
}
