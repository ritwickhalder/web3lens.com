/**
 * Explorer health check: writes data/explorer-health.json, which the site uses for "explorer down" marks.
 *
 *   npm run explorers:check            # check and write
 *   npm run explorers:check -- --dry   # check and print only
 *
 * Two levels:
 * - `hosts`: the home page of every explorer host in data/chains*.json and data/explorers.json. A host
 *   counts as "ok" when it answers with a status below 500 (403s from bot protection still mean the site
 *   is up). For http:// explorers it also records whether https:// works, so the site can upgrade them.
 * - `chains`: the page each chain's explorer actually opens (its legacy template with an empty query, or
 *   each route's home), so a coin dropped from a shared explorer (404), a parked or for-sale domain, or a
 *   dead subpath is caught even when the host is up. Only failures are stored.
 *
 * Results are a snapshot: the site shows the check date. scripts/audit-chains.mjs is the fuller research
 * audit (page titles, CoinGecko/DefiLlama matching).
 */
import fs from 'node:fs';
import path from 'node:path';
import { pool, probe, probeWithRetry, verdict } from './lib/probe.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'data', 'explorer-health.json');
const dry = process.argv.includes('--dry');

const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8'));
const chains = [...read('chains.json'), ...read('chains-extra.json')];
const { routes, inherit } = read('explorers.json');
const prefixes = Object.keys(inherit);

const urls = [];
for (const c of chains) {
  if (c.explorer.kind === 'url') urls.push(c.explorer.url.replace('{q}', ''));
  if (c.explorer.kind === 'form') urls.push(c.explorer.action);
}
for (const list of Object.values(routes)) for (const r of list) urls.push(r.home);

/** host → whether any known template for it uses plain http */
const hosts = new Map();
for (const u of urls) {
  try {
    const url = new URL(u);
    hosts.set(url.hostname, (hosts.get(url.hostname) ?? false) || url.protocol === 'http:');
  } catch {
    // Invalid templates are reported by the unit tests.
  }
}

async function checkHost(host, usesHttp) {
  const https = await probe(`https://${host}/`, { timeoutMs: 12_000 });
  const httpsOk = https.status !== null && https.status < 500;
  if (httpsOk || !usesHttp) {
    return { ok: httpsOk, https: httpsOk, status: https.status, ...(httpsOk ? {} : { error: https.error ?? `HTTP ${https.status}` }) };
  }
  const http = await probe(`http://${host}/`, { timeoutMs: 12_000 });
  const ok = http.status !== null && http.status < 500;
  return { ok, https: false, status: http.status, ...(ok ? {} : { error: http.error ?? `HTTP ${http.status}` }) };
}

const progress = (label, total) => (d) => {
  if (d % 25 === 0 || d === total) process.stderr.write(`  ${label} ${d}/${total}\n`);
};

const hostEntries = [...hosts.entries()];
const hostResults = {};
await pool(hostEntries, 12, async ([host, usesHttp]) => (hostResults[host] = await checkHost(host, usesHttp)), progress('hosts', hostEntries.length));

// Per-chain pages. Tokens that inherit a host chain's routes are covered by that chain.
/** chain id → [{ route?: name, url }] */
const pages = new Map();
for (const c of chains) {
  if (routes[c.id]) {
    pages.set(c.id, routes[c.id].map((r) => ({ route: r.name, url: r.home })));
    continue;
  }
  const e = c.explorer;
  if (e.kind === 'url' && !prefixes.some((p) => e.url.startsWith(p))) pages.set(c.id, [{ url: e.url.replace('{q}', '') }]);
  if (e.kind === 'form') pages.set(c.id, [{ url: e.action }]);
}
const pageUrls = [...new Set([...pages.values()].flat().map((p) => p.url))];
const pageResults = new Map();
await pool(pageUrls, 12, async (u) => {
  // A dead host is already recorded; don't wait for it twice.
  const host = new URL(u).hostname;
  if (hostResults[host] && !hostResults[host].ok) return pageResults.set(u, { verdict: 'dead', status: hostResults[host].status, error: hostResults[host].error });
  const r = await probeWithRetry(u, { timeoutMs: 15_000 });
  pageResults.set(u, { verdict: verdict(r), status: r.status, error: r.error });
}, progress('pages', pageUrls.length));

const chainResults = {};
for (const [id, list] of pages) {
  const failed = list
    .map((p) => ({ ...p, ...pageResults.get(p.url) }))
    // `blocked` (bot protection) means the site is up.
    .filter((p) => p.verdict !== 'ok' && p.verdict !== 'blocked');
  if (!failed.length) continue;
  chainResults[id] = failed.map((p) => ({
    ...(p.route ? { route: p.route } : {}),
    url: p.url,
    verdict: p.verdict,
    status: p.status ?? null,
    ...(p.error ? { error: p.error } : {}),
  }));
}

const sortObj = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
const sortedHosts = sortObj(hostResults);
const down = Object.entries(sortedHosts).filter(([, r]) => !r.ok);
const upgraded = Object.entries(sortedHosts).filter(([h, r]) => hosts.get(h) && r.https);
console.log(`${hosts.size} hosts: ${hosts.size - down.length} ok, ${down.length} down, ${upgraded.length} http hosts work over https`);
for (const [h, r] of down) console.log(`  down: ${h} (${r.error})`);
console.log(`${pages.size} chains checked: ${Object.keys(chainResults).length} with a failing explorer page`);
for (const [id, list] of Object.entries(sortObj(chainResults))) console.log(`  ${id}: ${list.map((p) => `${p.route ?? 'legacy'} ${p.verdict}${p.status ? ` ${p.status}` : ''}`).join(', ')}`);
if (!dry) {
  fs.writeFileSync(OUT, `${JSON.stringify({ checkedAt: new Date().toISOString(), hosts: sortedHosts, chains: sortObj(chainResults) }, null, 2)}\n`);
  console.log(`Wrote ${path.relative(ROOT, OUT)}`);
}
