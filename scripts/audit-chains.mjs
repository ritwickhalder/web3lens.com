/**
 * Chain audit: probes every chain's actual explorer page (not just the host's home page) and, with
 * --refs, matches each chain to CoinGecko (active/inactive, market cap, volume) and DefiLlama (TVL),
 * so dead projects and moved explorers can be told apart. Needs open network access.
 *
 *   npm run chains:audit                                      # = --refs --out audit
 *   node scripts/audit-chains.mjs --out audit                 # explorer probes only
 *   node scripts/audit-chains.mjs --out audit --refs          # plus CoinGecko / DefiLlama references
 *   node scripts/audit-chains.mjs --out audit --urls cand.json  # probe candidate URLs ([{id, url}] or [url])
 *
 * Writes <out>/chain-audit.json (and refs files with --refs; audit/ is gitignored). The output is
 * research input for hand-editing data/chains*.json, data/explorers.json and data/chains-retired.json;
 * the site doesn't read it. `npm run explorers:check` is the lighter check whose snapshot the site uses.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pool, probeWithRetry, verdict } from './lib/probe.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
};
const OUT = path.resolve(arg('--out') ?? 'audit');
const URLS = arg('--urls');
const REFS = process.argv.includes('--refs');
fs.mkdirSync(OUT, { recursive: true });

const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8'));
const log = (s) => process.stderr.write(`${s}\n`);
const progress = (label) => (d, n) => {
  if (d % 25 === 0 || d === n) log(`  ${label} ${d}/${n}`);
};
const write = (name, data) => {
  fs.writeFileSync(path.join(OUT, name), `${JSON.stringify(data, null, 1)}\n`);
  log(`wrote ${path.join(OUT, name)}`);
};

// ---------------------------------------------------------------------------------------------
// Candidate mode

if (URLS) {
  const list = JSON.parse(fs.readFileSync(URLS, 'utf8')).map((x) => (typeof x === 'string' ? { url: x } : x));
  const results = await pool(list, 12, async (c) => {
    const r = await probeWithRetry(c.url);
    return { ...c, verdict: verdict(r), ...r };
  }, progress('candidates'));
  write('candidates.json', results);
  process.exit(0);
}

// ---------------------------------------------------------------------------------------------
// Explorer probes

const chains = [...read('chains.json'), ...read('chains-extra.json')];
const { routes, inherit } = read('explorers.json');
/** Tokens whose template starts with one of these borrow the host chain's routes (checked once, on the host). */
const INHERIT = Object.entries(inherit);

/** URLs that show whether a chain's explorer works: the page the template opens (empty query) and the site root. */
function probesFor(chain) {
  if (routes[chain.id]) return routes[chain.id].map((r) => ({ explorer: r.name, url: r.home }));
  const e = chain.explorer;
  if (e.kind === 'url') {
    const parent = INHERIT.find(([p]) => e.url.startsWith(p));
    if (parent) return [];
    const page = e.url.replace('{q}', '');
    return [{ explorer: 'legacy', url: page }, { explorer: 'legacy-root', url: `${new URL(page).origin}/` }];
  }
  if (e.kind === 'form') return [{ explorer: 'legacy-form', url: e.action }, { explorer: 'legacy-root', url: `${new URL(e.action).origin}/` }];
  return [];
}

const plan = chains.map((c) => ({ chain: c, probes: probesFor(c) }));
const unique = [...new Set(plan.flatMap((p) => p.probes.map((x) => x.url)))];
log(`${chains.length} chains, ${unique.length} unique URLs to probe`);
const results = new Map();
await pool(unique, 16, async (u) => results.set(u, await probeWithRetry(u)), progress('probes'));

// ---------------------------------------------------------------------------------------------
// References

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(url, tries = 5) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { accept: 'application/json', 'user-agent': 'Web3LensAudit/1.0' } });
      if (res.status === 429 || res.status >= 500) {
        log(`  ${res.status} ${url}, waiting`);
        await sleep(30_000 * (i + 1));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
      return await res.json();
    } catch (e) {
      log(`  ${e.message}`);
      await sleep(5000 * (i + 1));
    }
  }
  throw new Error(`gave up on ${url}`);
}

const norm = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');
const loose = (s) => norm(s).replace(/(token|coin|network|protocol|chain|cash|classic)$/, '');
let cg = null;
let llama = [];
if (REFS) {
  const CG = 'https://api.coingecko.com/api/v3';
  log('CoinGecko lists…');
  const active = await getJson(`${CG}/coins/list?include_platform=true`);
  await sleep(8000);
  const inactive = await getJson(`${CG}/coins/list?status=inactive`);
  await sleep(8000);
  const top = [];
  for (let page = 1; page <= 6; page++) {
    top.push(...(await getJson(`${CG}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=${page}`)));
    await sleep(8000);
  }
  log('DefiLlama chains…');
  llama = (await getJson('https://api.llama.fi/v2/chains')).map((c) => ({
    name: c.name,
    chainId: c.chainId ?? null,
    gecko: c.gecko_id ?? null,
    symbol: c.tokenSymbol ?? null,
    tvl: Math.round(c.tvl ?? 0),
  }));
  llama.sort((a, b) => b.tvl - a.tvl);

  const byNorm = new Map();
  const add = (key, coin) => {
    if (!key) return;
    if (!byNorm.has(key)) byNorm.set(key, []);
    byNorm.get(key).push(coin);
  };
  const all = [...active.map((c) => ({ ...c, active: true })), ...inactive.map((c) => ({ ...c, active: false }))];
  for (const c of all) {
    add(`n:${norm(c.name)}`, c);
    add(`i:${c.id}`, c);
    add(`l:${loose(c.name)}`, c);
  }
  const market = new Map(top.map((m) => [m.id, m]));
  const matchesFor = (chain) => {
    const seen = new Map();
    for (const [key, tier] of [[`i:${chain.id}`, 'id'], [`n:${norm(chain.name)}`, 'name'], [`l:${loose(chain.name)}`, 'loose']]) {
      for (const c of byNorm.get(key) ?? []) if (!seen.has(c.id)) seen.set(c.id, { ...c, tier });
    }
    return [...seen.values()].slice(0, 6);
  };
  // Market data for every matched active coin that isn't in the top list already.
  const matched = new Map(chains.map((c) => [c.id, matchesFor(c)]));
  const need = [...new Set([...matched.values()].flat().filter((c) => c.active && !market.has(c.id)).map((c) => c.id))];
  log(`market data for ${need.length} more coins…`);
  for (let i = 0; i < need.length; i += 100) {
    const ids = need.slice(i, i + 100).join(',');
    for (const m of await getJson(`${CG}/coins/markets?vs_currency=usd&ids=${encodeURIComponent(ids)}&per_page=250`)) market.set(m.id, m);
    await sleep(8000);
  }
  cg = { matched, market };
  write(
    'top-markets.json',
    top.map((m) => ({
      id: m.id,
      symbol: m.symbol,
      name: m.name,
      rank: m.market_cap_rank,
      mcap: Math.round(m.market_cap ?? 0),
      vol: Math.round(m.total_volume ?? 0),
      platforms: Object.keys(active.find((a) => a.id === m.id)?.platforms ?? {}).filter(Boolean),
    })),
  );
  write('llama-chains.json', llama);
}

// ---------------------------------------------------------------------------------------------
// Report

const report = plan.map(({ chain, probes }) => {
  const checked = probes.map((p) => {
    const r = results.get(p.url);
    return { explorer: p.explorer, verdict: verdict(r), ...r };
  });
  const parent = chain.explorer.kind === 'url' ? INHERIT.find(([p]) => chain.explorer.url.startsWith(p))?.[1] : undefined;
  const page = checked.find((c) => c.explorer !== 'legacy-root') ?? checked[0];
  const out = {
    id: chain.id,
    name: chain.name,
    explorer: chain.explorer,
    routes: routes[chain.id]?.map((r) => r.name),
    inherits: parent,
    verdict: parent ? 'inherits' : chain.explorer.kind === 'google' ? 'none' : (page?.verdict ?? 'none'),
    probes: checked,
  };
  if (cg) {
    out.coingecko = cg.matched.get(chain.id).map((c) => {
      const m = cg.market.get(c.id);
      return {
        id: c.id,
        name: c.name,
        symbol: c.symbol,
        tier: c.tier,
        active: c.active,
        rank: m?.market_cap_rank ?? null,
        mcap: m ? Math.round(m.market_cap ?? 0) : null,
        vol: m ? Math.round(m.total_volume ?? 0) : null,
        platforms: Object.keys(c.platforms ?? {}).filter(Boolean),
        contracts: c.platforms ? Object.fromEntries(Object.entries(c.platforms).filter(([k, v]) => k && v && ['ethereum', 'binance-smart-chain'].includes(k))) : undefined,
      };
    });
  }
  return out;
});

const tally = {};
for (const r of report) tally[r.verdict] = (tally[r.verdict] ?? 0) + 1;
write('chain-audit.json', { checkedAt: new Date().toISOString(), tally, chains: report });
console.log(JSON.stringify(tally));
