/**
 * Blog content loader (server/build time only): reads `content/blog/*.md`, validates the frontmatter and derives
 * reading time, table of contents and FAQ. Publishing a post = adding a Markdown file; the listing, category pages,
 * sitemap and RSS feed pick it up automatically.
 */
import fs from 'node:fs';
import path from 'node:path';
import { BLOG, getCategory, type BlogCategorySlug } from '@/config/blog';
import { SITE } from '@/config/site';
import { extractFaq, parseFrontmatter, parseMarkdown, tableOfContents, wordCount, type Block } from '@/lib/blog/markdown';

export const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');
const PUBLIC_DIR = path.join(process.cwd(), 'public');

export type PostSummary = {
  slug: string;
  title: string;
  /** Shorter <title> when the headline is long; falls back to `title`. */
  seoTitle: string;
  description: string;
  category: BlogCategorySlug;
  tags: string[];
  date: string;
  updated: string;
  author: { name: string; url: string };
  readingMinutes: number;
  words: number;
  coins: string[];
  icon: string;
  related: string[];
  order: number;
};

export type Post = PostSummary & {
  blocks: Block[];
  toc: ReturnType<typeof tableOfContents>;
  faq: ReturnType<typeof extractFaq>;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function str(data: Record<string, string | string[]>, key: string, file: string, required = true): string {
  const v = data[key];
  if (v === undefined || v === '') {
    if (required) throw new Error(`${file}: missing frontmatter "${key}"`);
    return '';
  }
  if (Array.isArray(v)) throw new Error(`${file}: "${key}" must be a string`);
  return v;
}

function list(data: Record<string, string | string[]>, key: string): string[] {
  const v = data[key];
  return v === undefined ? [] : Array.isArray(v) ? v : [v];
}

/** Width and height of a PNG in /public, so figures reserve their space (no layout shift). */
function pngSize(src: string): { width: number; height: number } | undefined {
  if (!src.startsWith('/') || !src.endsWith('.png')) return undefined;
  const file = path.join(PUBLIC_DIR, src);
  if (!file.startsWith(PUBLIC_DIR) || !fs.existsSync(file)) throw new Error(`Image not found in public/: ${src}`);
  const buf = fs.readFileSync(file);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

export function parsePost(slug: string, source: string): Post {
  const file = `${slug}.md`;
  const { data, body } = parseFrontmatter(source);
  const category = str(data, 'category', file);
  if (!getCategory(category)) throw new Error(`${file}: unknown category "${category}"`);
  const date = str(data, 'date', file);
  const updated = str(data, 'updated', file, false) || date;
  if (!DATE.test(date) || !DATE.test(updated)) throw new Error(`${file}: dates must be YYYY-MM-DD`);
  const blocks = parseMarkdown(body).map((b) => (b.t === 'image' ? { ...b, ...pngSize(b.src) } : b));
  const words = wordCount(blocks);
  const title = str(data, 'title', file);
  return {
    slug,
    title,
    seoTitle: str(data, 'seoTitle', file, false) || title,
    description: str(data, 'description', file),
    category: category as BlogCategorySlug,
    tags: list(data, 'tags'),
    date,
    updated,
    author: { name: str(data, 'author', file, false) || SITE.author.name, url: SITE.author.github },
    readingMinutes: Math.max(1, Math.round(words / BLOG.wordsPerMinute)),
    words,
    coins: list(data, 'coins'),
    icon: str(data, 'icon', file, false) || 'book',
    related: list(data, 'related'),
    order: Number(str(data, 'order', file, false) || 0),
    blocks,
    toc: tableOfContents(blocks),
    faq: extractFaq(blocks),
  };
}

let cache: Post[] | null = null;

/** All posts, newest first (ties broken by `order`, higher first). */
export function getAllPosts(): Post[] {
  if (cache && process.env.NODE_ENV === 'production') return cache;
  const posts = fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .map((f) => parsePost(f.replace(/\.md$/, ''), fs.readFileSync(path.join(BLOG_DIR, f), 'utf8')));
  posts.sort((a, b) => b.date.localeCompare(a.date) || b.order - a.order || a.slug.localeCompare(b.slug));
  cache = posts;
  return posts;
}

export function getPost(slug: string): Post | undefined {
  return getAllPosts().find((p) => p.slug === slug);
}

export function summary(p: Post): PostSummary {
  const { blocks: _b, toc: _t, faq: _f, ...rest } = p;
  return rest;
}

export function postsInCategory(category: string): Post[] {
  return getAllPosts().filter((p) => p.category === category);
}

/** Hand-picked `related` posts first, then the newest posts in the same category, then anything else. */
export function relatedPosts(post: Post, count = 3): Post[] {
  const all = getAllPosts().filter((p) => p.slug !== post.slug);
  const picked = post.related.map((s) => all.find((p) => p.slug === s)).filter((p): p is Post => Boolean(p));
  const rest = [...all.filter((p) => p.category === post.category), ...all];
  for (const p of rest) {
    if (picked.length >= count) break;
    if (!picked.includes(p)) picked.push(p);
  }
  return picked.slice(0, count);
}

/** Previous (older) and next (newer) post in listing order. */
export function adjacentPosts(slug: string): { prev?: Post; next?: Post } {
  const all = getAllPosts();
  const i = all.findIndex((p) => p.slug === slug);
  return { next: i > 0 ? all[i - 1] : undefined, prev: i >= 0 ? all[i + 1] : undefined };
}
