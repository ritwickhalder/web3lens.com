/**
 * Minimal DOM builder. Text always goes in as text nodes (never innerHTML), so addresses, labels and
 * API responses can't inject markup.
 */
import { t } from './i18n';

type Child = Node | string | number | null | undefined | false | Child[];
type Props = Record<string, unknown> & { class?: string; on?: Record<string, (e: Event) => void> };

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props?: Props | null, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = String(v);
      else if (k === 'on') for (const [ev, fn] of Object.entries(v as Record<string, (e: Event) => void>)) el.addEventListener(ev, fn);
      else if (k === 'value' && 'value' in el) (el as HTMLInputElement).value = String(v);
      else if (k === 'checked' && 'checked' in el) (el as HTMLInputElement).checked = Boolean(v);
      else if (k === 'href') {
        const href = String(v);
        // Only http(s), extension-relative and fragment links.
        if (/^(https?:|#|[a-z]+\.html)/i.test(href)) el.setAttribute('href', href);
      } else el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  append(el, children);
  return el;
}

function append(el: Node, children: Child[]) {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
}

export function clear(el: Element, ...children: Child[]) {
  el.replaceChildren();
  append(el, children);
  return el;
}

export function ext_link(href: string, text: Child, cls = 'link'): HTMLAnchorElement {
  return h('a', { href, target: '_blank', rel: 'noopener noreferrer', class: cls }, text);
}

export async function copy(text: string, btn?: HTMLElement) {
  try {
    await navigator.clipboard.writeText(text);
    if (btn) {
      const old = btn.textContent;
      btn.textContent = t('common.copied');
      setTimeout(() => (btn.textContent = old), 1200);
    }
  } catch {
    // Clipboard blocked; the value stays selectable.
  }
}

export function copyBtn(text: string, label = t('common.copy')) {
  const b: HTMLButtonElement = h('button', { type: 'button', class: 'btn-ghost sm copy', title: label, 'aria-label': label });
  b.textContent = label;
  b.addEventListener('click', () => copy(text, b));
  return b;
}
