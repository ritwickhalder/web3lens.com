import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { BLOG_CATEGORIES, COVER_ICON_NAMES, CTA_PRESETS, GUIDES_FOR_PAGE } from '../../config/blog';
import { EXTENSION_STORES, MAIN_NAV, OTHER_PRODUCTS, PAGES, SITE } from '../../config/site';
import { TOOLS } from '../../config/tools';
import { collectLinks, extractFaq, parseFrontmatter, parseInline, parseMarkdown, slugify, wordCount } from '../../lib/blog/markdown';
import { adjacentPosts, getAllPosts, relatedPosts } from '../../lib/blog/posts';
import { allExplorerRoutes, getChain } from '../../lib/chains';
import { detectQuery } from '../../lib/detect';
import { getNetwork } from '../../lib/networks';

test('markdown: frontmatter, inline and blocks', () => {
  const { data, body } = parseFrontmatter('---\ntitle: "A: b"\ntags: [x, y z]\n---\n## Hi\n\nText');
  assert.equal(data.title, 'A: b');
  assert.deepEqual(data.tags, ['x', 'y z']);
  assert.equal(body, '## Hi\n\nText');

  assert.deepEqual(parseInline('a **b [c](/d)** `e*f` *g*'), [
    { t: 'text', v: 'a ' },
    { t: 'strong', c: [{ t: 'text', v: 'b ' }, { t: 'link', href: '/d', c: [{ t: 'text', v: 'c' }] }] },
    { t: 'text', v: ' ' },
    { t: 'code', v: 'e*f' },
    { t: 'text', v: ' ' },
    { t: 'em', c: [{ t: 'text', v: 'g' }] },
  ]);
  assert.deepEqual(parseInline('2 * 3 and 4*'), [{ t: 'text', v: '2 * 3 and 4*' }]);

  const blocks = parseMarkdown(
    ['## Intro', '', 'One', 'two.', '- a', '- b', '', '1. x', '2. y', '', '> [!WARNING]', '> careful', '', '| h | i |', '|---|---|', '| 1 | 2 |', '', '```js', 'x = 1', '```', '::cta search', '## Intro'].join('\n'),
  );
  assert.deepEqual(
    blocks.map((b) => b.t),
    ['heading', 'paragraph', 'list', 'list', 'callout', 'table', 'code', 'directive', 'heading'],
  );
  assert.equal(blocks[0].t === 'heading' && blocks[0].id, 'intro');
  assert.equal(blocks[8].t === 'heading' && blocks[8].id, 'intro-2', 'duplicate heading ids are made unique');
  assert.equal(blocks[4].t === 'callout' && blocks[4].variant, 'warning');
  assert.equal(slugify('Bitcoin, Ethereum & EVM'), 'bitcoin-ethereum-and-evm');
  assert.throws(() => parseMarkdown('# Title'), /h1/);
  assert.throws(() => parseMarkdown('```\nopen'), /Unclosed/);

  const faq = extractFaq(parseMarkdown('## Frequently asked questions\n\n### Q1?\n\nA1.\n\n### Q2?\n\nA2.\n\n## Next\n\nNot an answer.'));
  assert.deepEqual(faq, [
    { question: 'Q1?', answer: 'A1.' },
    { question: 'Q2?', answer: 'A2.' },
  ]);
  assert.equal(wordCount(parseMarkdown('one two\n\n- three')), 3);
});

const posts = getAllPosts();
const slugs = new Set(posts.map((p) => p.slug));
const categories = new Set<string>(BLOG_CATEGORIES.map((c) => c.slug));

test('blog: at least 15 published posts with complete, unique metadata', () => {
  assert.ok(posts.length >= 15, `expected ≥15 posts, found ${posts.length}`);
  for (const key of ['title', 'seoTitle', 'description'] as const) {
    const values = posts.map((p) => p[key].toLowerCase());
    assert.equal(new Set(values).size, values.length, `duplicate ${key}`);
  }
  for (const p of posts) {
    assert.match(p.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, `${p.slug}: slug must be lowercase words and hyphens`);
    assert.ok(categories.has(p.category), `${p.slug}: category`);
    assert.ok(p.description.length >= 110 && p.description.length <= 160, `${p.slug}: description is ${p.description.length} chars`);
    assert.ok(`${p.seoTitle} | ${SITE.name}`.length <= 70, `${p.slug}: <title> "${p.seoTitle}" is too long`);
    assert.ok(p.words >= 900, `${p.slug}: only ${p.words} words`);
    assert.ok(p.toc.filter((t) => t.level === 2).length >= 4, `${p.slug}: needs at least 4 sections`);
    assert.ok(p.faq.length >= 2, `${p.slug}: needs an FAQ section`);
    assert.ok((COVER_ICON_NAMES as readonly string[]).includes(p.icon), `${p.slug}: unknown icon ${p.icon}`);
    for (const c of p.coins) assert.ok(getChain(c), `${p.slug}: unknown coin ${c}`);
    for (const r of p.related) assert.ok(slugs.has(r) && r !== p.slug, `${p.slug}: related "${r}"`);
    assert.ok(p.updated >= p.date, `${p.slug}: updated before published`);
    for (const b of p.blocks) {
      if (b.t === 'directive') assert.ok(b.name === 'cta' && (CTA_PRESETS as readonly string[]).includes(b.arg), `${p.slug}: directive ::${b.name} ${b.arg}`);
      if (b.t === 'image') {
        assert.ok(b.alt.length > 20, `${p.slug}: image ${b.src} needs descriptive alt text`);
        assert.ok(b.width && b.height, `${p.slug}: image ${b.src} needs known dimensions`);
      }
    }
  }
  for (const c of BLOG_CATEGORIES) assert.ok(posts.some((p) => p.category === c.slug), `category ${c.slug} has no posts`);
});

/** Internal routes that exist in the app. */
function internalRouteExists(href: string): boolean {
  const url = new URL(href, SITE.url);
  const p = url.pathname;
  if (url.hash && p === '/extension') {
    if (!EXTENSION_STORES.some((s) => url.hash === `#install-${s.id}`)) return false;
  }
  const staticPages = new Set<string>([...PAGES.map((x) => x.href), '/investigate']);
  if (staticPages.has(p)) return true;
  if (p.startsWith('/tools/')) return TOOLS.some((t) => `/tools/${t.slug}` === p);
  if (p.startsWith('/explorer/')) return Boolean(allExplorerRoutes()[p.slice(10)] && getChain(p.slice(10)));
  if (p.startsWith('/blog/category/')) return categories.has(p.slice(15));
  if (p.startsWith('/blog/')) return slugs.has(p.slice(6));
  const native = /^\/(address|tx)\/([a-z0-9]+)\/([^/]+)$/.exec(p);
  if (native) {
    const d = detectQuery(decodeURIComponent(native[3]));
    return Boolean(getNetwork(native[2]) && d && d.checksum !== 'invalid');
  }
  return false;
}

test('blog: every link in every post resolves', () => {
  const external = new Set<string>();
  for (const p of posts) {
    for (const href of collectLinks(p.blocks)) {
      if (/^https?:/.test(href)) {
        assert.ok(href.startsWith('https://'), `${p.slug}: insecure link ${href}`);
        external.add(new URL(href).hostname);
        continue;
      }
      assert.ok(href.startsWith('/'), `${p.slug}: relative link ${href}`);
      assert.ok(internalRouteExists(href), `${p.slug}: broken internal link ${href}`);
    }
  }
  // Cross-links to the developer's other products are present somewhere, and point at the configured hosts.
  for (const product of OTHER_PRODUCTS) assert.ok(external.has(new URL(product.href).hostname), `no article links to ${product.name}`);
  assert.ok(external.has('github.com'));
});

test('blog: images referenced by posts exist in public/', () => {
  for (const p of posts) {
    for (const b of p.blocks) if (b.t === 'image') assert.ok(fs.existsSync(path.join(process.cwd(), 'public', b.src)), `${p.slug}: ${b.src}`);
  }
});

test('blog: related, previous/next and product-page guides are consistent', () => {
  for (const p of posts) {
    const rel = relatedPosts(p);
    assert.equal(rel.length, 3);
    assert.ok(!rel.some((r) => r.slug === p.slug));
    const { prev, next } = adjacentPosts(p.slug);
    if (prev) assert.equal(adjacentPosts(prev.slug).next?.slug, p.slug);
    if (next) assert.equal(adjacentPosts(next.slug).prev?.slug, p.slug);
  }
  for (const [page, list] of Object.entries(GUIDES_FOR_PAGE)) for (const s of list) assert.ok(slugs.has(s), `${page}: unknown guide ${s}`);
  assert.ok(MAIN_NAV.some((l) => l.href === '/blog'), 'Blog is in the main navigation');
  assert.ok(PAGES.some((l) => l.href === '/blog'), 'Blog is in the sitemap pages');
});
