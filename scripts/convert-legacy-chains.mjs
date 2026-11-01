/**
 * One-off generator: legacy/select.js + the <select> in legacy/index.html → data/chains.json.
 *
 *   npm run chains:convert
 *
 * Each option is run through the original explorer() (scripts/lib/legacy-select.mjs) with a
 * placeholder query, and what it did is stored as data. Two legacy bugs are fixed on the way
 * (see FEATURES.md): `open(url + t, '_blank')` appended "_blank" to the URL, and the Google
 * default glued the query onto "Blockchain Explorer" with no space.
 *
 * Retire this script once chains.json starts being edited by hand (ROADMAP Phase 1).
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadLegacyExplorer, readLegacyOptions } from './lib/legacy-select.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'data', 'chains.json');
const Q = '__W3L_QUERY__';

// Display names that were truncated in the legacy dropdown.
const LABEL_FIXES = {
  'Basic Attenti...': 'Basic Attention Token',
  'Experience Po...': 'Experience Points',
  'High Performa...': 'High Performance Blockchain',
  // Shorter display names for chains shown in tight UI.
  'Polygon (matic)': 'Polygon',
};

function legacyToExplorer(value, label, record) {
  if (record.submitted) {
    const { action, method, param, value: v } = record.submitted;
    if (v !== Q) throw new Error(`${value}: form value was changed`);
    return { kind: 'form', action, method, param };
  }
  if (record.opened.length === 0) throw new Error(`${value}: nothing was opened`);
  // A missing `break` made a few cases open a second, unrelated explorer; keep the first.
  if (record.opened.length > 1) console.warn(`${value}: legacy opened ${record.opened.length} tabs, keeping the first`);
  let url = record.opened[0];
  if (url.endsWith(`${Q}_blank`)) url = url.slice(0, -'_blank'.length);
  if (url.startsWith('https://www.google.com/search?q=')) {
    return { kind: 'google', terms: `${label} Blockchain Explorer` };
  }
  if (url.split(Q).length !== 2) throw new Error(`${value}: query placeholder missing in ${url}`);
  return { kind: 'url', url: url.replace(Q, '{q}') };
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/\+/g, '-plus')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function main() {
  const runLegacy = loadLegacyExplorer();
  const seen = new Set();
  const chains = readLegacyOptions().map(({ value, label }) => {
    const name = LABEL_FIXES[label] ?? label;
    const record = runLegacy(value, Q);
    let id = slugify(value) || 'chain';
    while (seen.has(id)) id += '-2';
    seen.add(id);
    const chain = { id, name, legacyValue: value, explorer: legacyToExplorer(value, name, record) };
    if (record.alerted) chain.fallback = true;
    return chain;
  });
  fs.writeFileSync(OUT, `${JSON.stringify(chains, null, 2)}\n`);
  const kinds = chains.reduce((acc, c) => ((acc[c.explorer.kind] = (acc[c.explorer.kind] || 0) + 1), acc), {});
  console.log(`Wrote ${chains.length} chains to ${path.relative(ROOT, OUT)}`, kinds, {
    fallback: chains.filter((c) => c.fallback).length,
  });
}

main();
