#!/usr/bin/env node
/**
 * Store metadata guard: the extension's store title and short description are FROZEN.
 *
 *   node scripts/store-metadata-guard.mjs            # verify (exit 1 on any drift)
 *   node scripts/store-metadata-guard.mjs --update   # re-snapshot, ONLY on the owner's explicit instruction
 *
 * Why: in Super Session Manager 7.0.1 the title and short description were rewritten as a side effect of unrelated
 * work, and its Chrome Web Store ranking dropped sharply until the old wording was restored. The name, short name,
 * summary and toolbar title are SEO assets, not code: they never change during a refactor, a port, an i18n batch, a
 * compliance pass or a version bump. A test runs this check, so drift fails the test suite.
 *
 * What is frozen is listed in CONFIG; the accepted values live in the baseline file. The long description is not
 * frozen (it is edited by hand in the store dashboards).
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..').split('\\').join('/');

const CONFIG = {
  baseline: 'store/store-metadata.baseline.json',
  // Hand-written manifests (only these and *.md are hand-edited in the build folders).
  manifestJson: ['extension-chrome/manifest.json', 'extension-edge/manifest.json', 'extension-firefox/manifest.json'],
  listings: ['store/listing.md'],
};

// ---- Guard logic below is shared verbatim by the author's extension repos (ported from Super Session
// ---- Manager's scripts/store-metadata-guard.mjs). Only CONFIG above differs per repo.

const UPDATE = process.argv.includes('--update');
const BASELINE = `${ROOT}/${CONFIG.baseline}`;
const rel = (p) => p.slice(ROOT.length + 1);

/** Manifest JSON: the store-facing fields only. */
function fromManifestJson(file, out) {
  const m = JSON.parse(readFileSync(file, 'utf8'));
  const fields = { name: m.name, short_name: m.short_name, description: m.description, 'action.default_title': m.action?.default_title ?? m.browser_action?.default_title };
  for (const [k, v] of Object.entries(fields)) if (typeof v === 'string') out[`${rel(file)} :: ${k}`] = v;
}

/** TS manifest sources (WXT configs): name / short_name / description / default_title string literals, minus command descriptions. */
function fromManifestSource(file, out) {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  const seen = {};
  for (const line of lines) {
    const m = /^\s*(name|short_name|description|default_title)\s*:\s*["'`]([^"'`]*)["'`]/.exec(line);
    if (!m || /^__MSG_command/i.test(m[2])) continue;
    // Plugin and helper objects also have `name:`; only manifest values (message references or long titles) count.
    if (m[1] === 'name' && !m[2].startsWith('__MSG_') && !/\s/.test(m[2])) continue;
    const n = (seen[m[1]] = (seen[m[1]] ?? 0) + 1);
    out[`${rel(file)} :: ${m[1]}${n > 1 ? ` #${n}` : ''}`] = m[2];
  }
}

/** _locales/<loc>/messages.json: the frozen keys, every locale. */
function fromLocales(dir, keys, out) {
  for (const loc of readdirSync(dir).sort()) {
    const file = `${dir}/${loc}/messages.json`;
    if (!existsSync(file)) continue;
    const msgs = JSON.parse(readFileSync(file, 'utf8'));
    for (const key of keys) if (msgs[key]?.message !== undefined) out[`${rel(file)} :: ${key}`] = msgs[key].message;
  }
}

const FIELD = /^(name|display name|title|product name|summary|short description)\b/i;

/**
 * Listing copy files. Two layouts are understood:
 *  - "rule": a NAME / TITLE / SUMMARY header line between ---- or ==== rules, the value on the line after the next rule;
 *  - "md": a Markdown heading starting with Name / Display name / Title / Summary / Short description, whose value is
 *    the section's > quoted lines, or else its first plain line; plus "- **Name:** value" bullets anywhere.
 */
function fromListing(file, out) {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  const rule = (s) => /^\s*[-=]{10,}\s*$/.test(s ?? '');
  const put = (label, value) => {
    const key = `${rel(file)} :: ${label.trim().replace(/\s+/g, ' ')}`;
    let k = key;
    for (let n = 2; k in out; n++) k = `${key} #${n}`;
    out[k] = value.trim();
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (FIELD.test(line.trim()) && rule(lines[i + 1]) && !rule(line)) {
      // value is the first non-empty line after the rule that closes the header
      for (let j = i + 2; j < lines.length; j++) if (lines[j].trim() && !rule(lines[j])) { put(line.split(/\s{2,}|\(/)[0], lines[j]); break; }
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h && FIELD.test(h[2])) {
      const body = [];
      for (let j = i + 1; j < lines.length && !/^#{1,6}\s/.test(lines[j]); j++) body.push(lines[j]);
      const quotes = body.filter((l) => /^\s*>/.test(l)).map((l) => l.replace(/^\s*>\s?/, ''));
      const plain = body.find((l) => l.trim() && !/^\s*[-*(]/.test(l) && !/^\s*`{3}/.test(l));
      const value = quotes.length ? quotes.join(' | ') : plain;
      if (value) put(h[2], value);
      continue;
    }
    const b = /^\s*[-*]\s+\*\*(Name|Display name|Title|Summary|Short description)[^*]*\*\*\s*:?\s*(.+)$/i.exec(line);
    if (b) put(b[1], b[2]);
  }
}

export function snapshot() {
  const out = {};
  for (const f of CONFIG.manifestJson ?? []) if (existsSync(`${ROOT}/${f}`)) fromManifestJson(`${ROOT}/${f}`, out);
  for (const f of CONFIG.manifestSource ?? []) if (existsSync(`${ROOT}/${f}`)) fromManifestSource(`${ROOT}/${f}`, out);
  for (const d of CONFIG.locales ?? []) if (existsSync(`${ROOT}/${d}`)) fromLocales(`${ROOT}/${d}`, CONFIG.messageKeys, out);
  for (const f of CONFIG.listings ?? []) if (existsSync(`${ROOT}/${f}`)) fromListing(`${ROOT}/${f}`, out);
  for (const d of CONFIG.listingDirs ?? []) {
    if (!existsSync(`${ROOT}/${d}`)) continue;
    for (const f of readdirSync(`${ROOT}/${d}`).filter((x) => /\.(txt|md)$/i.test(x)).sort()) fromListing(`${ROOT}/${d}/${f}`, out);
  }
  return out;
}

/** Differences between the files and the frozen baseline; empty when nothing moved. */
export function problems(current = snapshot()) {
  if (!existsSync(BASELINE)) return [`no baseline at ${CONFIG.baseline}: create it deliberately with --update`];
  const base = JSON.parse(readFileSync(BASELINE, 'utf8')).values;
  const out = [];
  for (const key of Object.keys(base)) {
    if (!(key in current)) out.push(`MISSING  ${key}\n           baseline: ${JSON.stringify(base[key])}`);
    else if (current[key] !== base[key]) out.push(`CHANGED  ${key}\n           baseline: ${JSON.stringify(base[key])}\n           now:      ${JSON.stringify(current[key])}`);
  }
  for (const key of Object.keys(current)) if (!(key in base)) out.push(`NEW      ${key} = ${JSON.stringify(current[key])} (a new locale or listing needs an explicit --update)`);
  return out;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const current = snapshot();
  if (UPDATE) {
    writeFileSync(
      BASELINE,
      JSON.stringify(
        {
          _comment: 'FROZEN store title/description. Regenerate only with `node scripts/store-metadata-guard.mjs --update`, and only when the owner has explicitly asked for that wording change. See scripts/store-metadata-guard.mjs.',
          values: current,
        },
        null,
        2,
      ) + '\n',
      'utf8',
    );
    console.log(`store-metadata-guard: baseline written with ${Object.keys(current).length} values -> ${CONFIG.baseline}`);
    process.exit(0);
  }
  const found = problems(current);
  if (found.length) {
    console.error(`\nstore-metadata-guard: ${found.length} problem(s). The store title / description is FROZEN.\n`);
    for (const p of found) console.error('  ' + p + '\n');
    console.error('  These strings are SEO assets: a side-effect rewrite cost Super Session Manager its Chrome Web Store ranking.');
    console.error('  Revert the change. Only if the owner explicitly asked for this exact wording: node scripts/store-metadata-guard.mjs --update\n');
    process.exit(1);
  }
  console.log(`store-metadata-guard: OK, ${Object.keys(current).length} frozen title/description values unchanged.`);
}
