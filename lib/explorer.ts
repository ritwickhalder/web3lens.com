import type { Chain } from '@/lib/chains';

export type ExplorerAction =
  | { kind: 'url'; href: string }
  | { kind: 'form'; action: string; method: 'get' | 'post'; param: string; value: string };

/** Pure: what searching `query` on `chain` should do. The query is trimmed first. */
export function resolveExplorer(chain: Chain, query: string): ExplorerAction {
  const q = query.trim();
  const { explorer } = chain;
  switch (explorer.kind) {
    case 'url':
      return { kind: 'url', href: explorer.url.replace('{q}', encodeURIComponent(q)) };
    case 'form':
      return { kind: 'form', action: explorer.action, method: explorer.method, param: explorer.param, value: q };
    case 'google':
      return {
        kind: 'url',
        href: `https://www.google.com/search?q=${encodeURIComponent(`${explorer.terms} ${q}`)}`,
      };
  }
}

export function fallbackNotice(chain: Chain): string {
  return `${chain.name} is one of the very few blockchains not yet supported. Redirecting you to a ${chain.name} explorer instead...`;
}

/**
 * Opens the explorer in a new tab. Call it straight from a click/submit handler so the
 * browser treats the new tab as user-initiated and doesn't block it.
 */
export function openExplorer(action: ExplorerAction): void {
  if (action.kind === 'url') {
    window.open(action.href, '_blank', 'noopener,noreferrer');
    return;
  }
  const form = document.createElement('form');
  form.method = action.method;
  form.action = action.action;
  form.target = '_blank';
  form.rel = 'noopener noreferrer';
  form.style.display = 'none';
  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = action.param;
  input.value = action.value;
  form.appendChild(input);
  document.body.appendChild(form);
  form.submit();
  form.remove();
}
