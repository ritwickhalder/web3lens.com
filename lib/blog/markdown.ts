/**
 * A small Markdown subset for the blog, parsed into a typed tree that a React component renders. Pure (no Node,
 * no React) so it can be unit-tested and reused. Supported:
 *
 *   frontmatter   --- key: value / key: [a, b] ---
 *   blocks        ## h2, ### h3, paragraphs, - lists, 1. lists, ``` fences, | tables |, ---,
 *                 > quotes, > [!NOTE] / [!TIP] / [!WARNING] callouts, ![alt](src "caption") figures,
 *                 ::name arg   directives (e.g. ::cta extension)
 *   inline        **strong**, *em*, `code`, [text](href)
 */

export type Inline =
  | { t: 'text'; v: string }
  | { t: 'strong'; c: Inline[] }
  | { t: 'em'; c: Inline[] }
  | { t: 'code'; v: string }
  | { t: 'link'; href: string; c: Inline[] };

export type Block =
  | { t: 'heading'; level: 2 | 3; id: string; text: string; c: Inline[] }
  | { t: 'paragraph'; c: Inline[] }
  | { t: 'list'; ordered: boolean; items: Inline[][] }
  | { t: 'code'; lang: string; v: string }
  | { t: 'callout'; variant: 'note' | 'tip' | 'warning' | 'quote'; c: Inline[][] }
  | { t: 'table'; head: Inline[][]; rows: Inline[][][] }
  | { t: 'image'; src: string; alt: string; caption: string; width?: number; height?: number }
  | { t: 'directive'; name: string; arg: string }
  | { t: 'hr' };

export type Frontmatter = Record<string, string | string[]>;

/** Splits `---` frontmatter from the body. Values: plain strings (quotes optional) or `[a, b]` lists. */
export function parseFrontmatter(source: string): { data: Frontmatter; body: string } {
  const text = source.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!m) return { data: {}, body: text };
  const data: Frontmatter = {};
  for (const line of m[1].split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const kv = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (!kv) throw new Error(`Bad frontmatter line: ${line}`);
    const raw = kv[2].trim();
    data[kv[1]] = raw.startsWith('[') && raw.endsWith(']')
      ? raw.slice(1, -1).split(',').map((s) => unquote(s.trim())).filter(Boolean)
      : unquote(raw);
  }
  return { data, body: text.slice(m[0].length) };
}

function unquote(s: string): string {
  return /^(["']).*\1$/.test(s) ? s.slice(1, -1) : s;
}

/** URL-safe heading id: lowercase ASCII words joined by hyphens. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Parses inline markup. Unmatched markers are kept as text. */
export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let buf = '';
  const flush = () => {
    if (buf) out.push({ t: 'text', v: buf });
    buf = '';
  };
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '\\' && i + 1 < src.length && /[\\`*_[\]()!]/.test(src[i + 1])) {
      buf += src[i + 1];
      i += 2;
      continue;
    }
    if (ch === '`') {
      const end = src.indexOf('`', i + 1);
      if (end > i) {
        flush();
        out.push({ t: 'code', v: src.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    if (ch === '*' && src[i + 1] === '*') {
      const end = src.indexOf('**', i + 2);
      if (end > i + 2) {
        flush();
        out.push({ t: 'strong', c: parseInline(src.slice(i + 2, end)) });
        i = end + 2;
        continue;
      }
    }
    if (ch === '*' && src[i + 1] !== ' ' && src[i + 1] !== '*') {
      const end = src.indexOf('*', i + 1);
      if (end > i + 1 && src[end - 1] !== ' ') {
        flush();
        out.push({ t: 'em', c: parseInline(src.slice(i + 1, end)) });
        i = end + 1;
        continue;
      }
    }
    if (ch === '[') {
      const close = findClose(src, i, '[', ']');
      if (close > i && src[close + 1] === '(') {
        const paren = src.indexOf(')', close + 2);
        if (paren > close) {
          flush();
          out.push({ t: 'link', href: src.slice(close + 2, paren).trim(), c: parseInline(src.slice(i + 1, close)) });
          i = paren + 1;
          continue;
        }
      }
    }
    buf += ch;
    i++;
  }
  flush();
  return out;
}

function findClose(src: string, start: number, open: string, close: string): number {
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    if (src[i] === '\\') {
      i++;
      continue;
    }
    if (src[i] === open) depth++;
    else if (src[i] === close && --depth === 0) return i;
  }
  return -1;
}

/** Plain text of inline nodes (for ids, word counts, FAQ answers and descriptions). */
export function inlineText(nodes: Inline[]): string {
  return nodes.map((n) => (n.t === 'text' || n.t === 'code' ? n.v : inlineText(n.c))).join('');
}

const splitRow = (line: string) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map((c) => c.trim().replace(/\\\|/g, '|'));

/** Parses the Markdown body into blocks. Heading ids are made unique within the document. */
export function parseMarkdown(body: string): Block[] {
  const lines = body.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  const ids = new Set<string>();
  const uniqueId = (text: string) => {
    const base = slugify(text) || 'section';
    let id = base;
    for (let n = 2; ids.has(id); n++) id = `${base}-${n}`;
    ids.add(id);
    return id;
  };
  const isBlockStart = (l: string) =>
    /^(#{2,3})\s/.test(l) || /^```/.test(l) || /^\s*[-*]\s+/.test(l) || /^\s*\d+\.\s+/.test(l) || /^>/.test(l) || /^\|/.test(l) || /^!\[/.test(l) || /^::\w/.test(l) || /^---\s*$/.test(l);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const h = /^(#{2,3})\s+(.+?)\s*#*$/.exec(line);
    if (h) {
      const c = parseInline(h[2]);
      const text = inlineText(c);
      blocks.push({ t: 'heading', level: h[1].length as 2 | 3, id: uniqueId(text), text, c });
      i++;
      continue;
    }
    if (/^#\s/.test(line)) throw new Error('Use ## and ### in posts; the title is the page h1.');
    const fence = /^```(\S*)\s*$/.exec(line);
    if (fence) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) code.push(lines[i++]);
      if (i >= lines.length) throw new Error('Unclosed code fence');
      i++;
      blocks.push({ t: 'code', lang: fence[1], v: code.join('\n') });
      continue;
    }
    if (/^---\s*$/.test(line)) {
      blocks.push({ t: 'hr' });
      i++;
      continue;
    }
    const dir = /^::(\w[\w-]*)\s*(.*)$/.exec(line);
    if (dir) {
      blocks.push({ t: 'directive', name: dir[1], arg: dir[2].trim() });
      i++;
      continue;
    }
    const img = /^!\[([^\]]*)\]\(\s*(\S+?)(?:\s+"([^"]*)")?\s*\)\s*$/.exec(line);
    if (img) {
      blocks.push({ t: 'image', alt: img[1], src: img[2], caption: img[3] ?? '' });
      i++;
      continue;
    }
    if (/^>/.test(line)) {
      const quoted: string[] = [];
      while (i < lines.length && /^>/.test(lines[i])) quoted.push(lines[i++].replace(/^>\s?/, ''));
      let variant: 'note' | 'tip' | 'warning' | 'quote' = 'quote';
      const marker = /^\[!(NOTE|TIP|WARNING)\]\s*$/i.exec(quoted[0] ?? '');
      if (marker) {
        variant = marker[1].toLowerCase() as 'note' | 'tip' | 'warning';
        quoted.shift();
      }
      const paras = quoted.join('\n').split(/\n\s*\n/).map((p) => p.replace(/\n/g, ' ').trim()).filter(Boolean);
      blocks.push({ t: 'callout', variant, c: paras.map(parseInline) });
      continue;
    }
    if (/^\|/.test(line)) {
      const rows: string[][] = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(splitRow(lines[i++]));
      if (rows.length < 2 || !rows[1].every((c) => /^:?-{3,}:?$/.test(c))) throw new Error('Tables need a header and a --- separator row');
      blocks.push({ t: 'table', head: rows[0].map(parseInline), rows: rows.slice(2).map((r) => r.map(parseInline)) });
      continue;
    }
    const listMatch = /^\s*([-*]|\d+\.)\s+/.exec(line);
    if (listMatch) {
      const ordered = /\d/.test(listMatch[1]);
      const itemRe = ordered ? /^\s*\d+\.\s+(.*)$/ : /^\s*[-*]\s+(.*)$/;
      const items: string[] = [];
      while (i < lines.length) {
        const m = itemRe.exec(lines[i]);
        if (m) {
          items.push(m[1]);
          i++;
        } else if (lines[i].trim() && /^\s{2,}\S/.test(lines[i]) && items.length) {
          items[items.length - 1] += ` ${lines[i].trim()}`;
          i++;
        } else break;
      }
      blocks.push({ t: 'list', ordered, items: items.map(parseInline) });
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !(para.length && isBlockStart(lines[i]))) para.push(lines[i++].trim());
    blocks.push({ t: 'paragraph', c: parseInline(para.join(' ')) });
  }
  return blocks;
}

/** Text of a block, for word counts. */
export function blockText(b: Block): string {
  switch (b.t) {
    case 'heading':
      return b.text;
    case 'paragraph':
      return inlineText(b.c);
    case 'list':
      return b.items.map(inlineText).join(' ');
    case 'code':
      return b.v;
    case 'callout':
      return b.c.map(inlineText).join(' ');
    case 'table':
      return [...b.head, ...b.rows.flat()].map(inlineText).join(' ');
    case 'image':
      return b.caption;
    default:
      return '';
  }
}

export function wordCount(blocks: Block[]): number {
  return blocks.map(blockText).join(' ').split(/\s+/).filter((w) => /\w/.test(w)).length;
}

/** h2/h3 headings for the table of contents. */
export function tableOfContents(blocks: Block[]): { id: string; text: string; level: 2 | 3 }[] {
  return blocks.filter((b): b is Extract<Block, { t: 'heading' }> => b.t === 'heading').map(({ id, text, level }) => ({ id, text, level }));
}

/**
 * Questions and answers from a "Frequently asked questions" (or "FAQ") h2: each h3 under it is a question and the
 * paragraphs and lists up to the next heading are its answer.
 */
export function extractFaq(blocks: Block[]): { question: string; answer: string }[] {
  const start = blocks.findIndex((b) => b.t === 'heading' && b.level === 2 && /frequently asked questions|^faqs?$/i.test(b.text));
  if (start < 0) return [];
  const faq: { question: string; answer: string }[] = [];
  for (let i = start + 1; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.t === 'heading' && b.level === 2) break;
    if (b.t === 'heading') faq.push({ question: b.text, answer: '' });
    else if (faq.length && (b.t === 'paragraph' || b.t === 'list' || b.t === 'callout')) {
      const last = faq[faq.length - 1];
      last.answer = `${last.answer} ${blockText(b)}`.trim();
    }
  }
  return faq.filter((f) => f.answer);
}

/** Every link target in the document, for link checking. */
export function collectLinks(blocks: Block[]): string[] {
  const out: string[] = [];
  const walk = (nodes: Inline[]) => {
    for (const n of nodes) {
      if (n.t === 'link') out.push(n.href);
      if (n.t === 'strong' || n.t === 'em' || n.t === 'link') walk(n.c);
    }
  };
  for (const b of blocks) {
    if (b.t === 'heading' || b.t === 'paragraph') walk(b.c);
    else if (b.t === 'list') b.items.forEach(walk);
    else if (b.t === 'callout') b.c.forEach(walk);
    else if (b.t === 'table') [...b.head, ...b.rows.flat()].forEach(walk);
  }
  return out;
}
