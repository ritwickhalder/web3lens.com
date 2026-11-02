/**
 * Explorer health check: requests the home page of every explorer host in data/chains.json and
 * data/explorers.json and writes data/explorer-health.json.
 *
 *   npm run explorers:check            # check and write
 *   npm run explorers:check -- --dry   # check and print only
 *
 * A host counts as "ok" when it answers at all with a status below 500 (403s from bot protection
 * still mean the site is up). For http:// explorers it also records whether https:// works, so the
 * site can upgrade them (lib/explorer.ts). Results are a snapshot: the site shows the check date.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'data', 'explorer-health.json');
const TIMEOUT_MS = 12_000;
const CONCURRENCY = 12;
const dry = process.argv.includes('--dry');

const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8'));
const urls = [];
for (const c of [...read('chains.json'), ...read('chains-extra.json')]) {
  if (c.explorer.kind === 'url') urls.push(c.explorer.url.replace('{q}', ''));
  if (c.explorer.kind === 'form') urls.push(c.explorer.action);
}
for (const routes of Object.values(read('explorers.json').routes)) for (const r of routes) urls.push(r.home);

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

async function probe(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; Web3LensHealthCheck/1.0; +https://web3lens.com)' },
    });
    res.body?.cancel().catch(() => {});
    return { status: res.status };
  } catch (e) {
    return { status: null, error: e.name === 'AbortError' ? 'timeout' : (e.cause?.code ?? e.message ?? 'error') };
  } finally {
    clearTimeout(timer);
  }
}

async function check(host, usesHttp) {
  const https = await probe(`https://${host}/`);
  const httpsOk = https.status !== null && https.status < 500;
  if (httpsOk || !usesHttp) {
    return { ok: httpsOk, https: httpsOk, status: https.status, ...(httpsOk ? {} : { error: https.error ?? `HTTP ${https.status}` }) };
  }
  const http = await probe(`http://${host}/`);
  const ok = http.status !== null && http.status < 500;
  return { ok, https: false, status: http.status, ...(ok ? {} : { error: http.error ?? `HTTP ${http.status}` }) };
}

const entries = [...hosts.entries()];
const results = {};
let done = 0;
async function worker() {
  while (entries.length) {
    const [host, usesHttp] = entries.shift();
    results[host] = await check(host, usesHttp);
    done++;
    if (done % 25 === 0) process.stderr.write(`  ${done}/${hosts.size}\n`);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const sorted = Object.fromEntries(Object.entries(results).sort(([a], [b]) => a.localeCompare(b)));
const down = Object.entries(sorted).filter(([, r]) => !r.ok);
const upgraded = Object.entries(sorted).filter(([h, r]) => hosts.get(h) && r.https);
console.log(`${hosts.size} hosts: ${hosts.size - down.length} ok, ${down.length} down, ${upgraded.length} http hosts work over https`);
for (const [h, r] of down) console.log(`  down: ${h} (${r.error})`);
if (!dry) {
  fs.writeFileSync(OUT, `${JSON.stringify({ checkedAt: new Date().toISOString(), hosts: sorted }, null, 2)}\n`);
  console.log(`Wrote ${path.relative(ROOT, OUT)}`);
}
