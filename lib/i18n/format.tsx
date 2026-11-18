import { Fragment, type ReactNode } from 'react';

export type Vars = Record<string, string | number>;
export type Catalog = Record<string, string>;
type Tags = Record<string, (chunks: ReactNode) => ReactNode>;

/** `{name}` placeholders. Values are inserted as they are (numbers are not reformatted). */
export function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (all, name: string) => (name in vars ? String(vars[name]) : all));
}

/** Turns `<b>bold</b>` and `<br/>` into React nodes with the renderers given. Tags don't nest; an unknown tag renders its text. */
export function rich(template: string, tags: Tags): ReactNode {
  const out: ReactNode[] = [];
  const re = /<(\w+)>([\s\S]*?)<\/\1>|<(\w+)\s*\/>/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(template))) {
    if (m.index > last) out.push(template.slice(last, m.index));
    const name = m[1] ?? m[3];
    const render = tags[name];
    const inner = m[2] ?? '';
    out.push(<Fragment key={out.length}>{render ? render(inner) : inner}</Fragment>);
    last = re.lastIndex;
  }
  if (last < template.length) out.push(template.slice(last));
  return <>{out}</>;
}

export type Tx = {
  (english: string, vars?: Vars): string;
  rich: (english: string, tags: Tags, vars?: Vars) => ReactNode;
};

/**
 * Translations are keyed by the English text itself. A string with no translation (including one whose English
 * changed after the last translation pass) renders in English, so the fallback is automatic and an edited sentence
 * never shows a stale translation.
 */
export function createTx(catalog: Catalog): Tx {
  const tx = ((english: string, vars?: Vars) => interpolate(catalog[english] || english, vars)) as Tx;
  tx.rich = (english, tags, vars) => rich(tx(english, vars), tags);
  return tx;
}
