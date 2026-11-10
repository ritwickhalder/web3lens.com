import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cached, clearCache } from '../../lib/server/cache';
import { clientIp, createLimiter, createLookupBudget } from '../../lib/server/rate-limit';
import { isAutomated, isCrawler } from '../../lib/server/bots';
import { checkAddressQuery, checkEvmAddress, checkEvmTx, checkTxQuery } from '../../lib/validate-query';
import { checkSanctions } from '../../lib/security/sanctions';
import { sanitizeSaved, savedId } from '../../lib/saved';
import { sanitizePrefs } from '../../lib/prefs';
import { hasNativeSupport, NETWORKS } from '../../lib/networks';
import { getChain } from '../../lib/chains';
import { fetchJson, ProviderError, setFetch } from '../../lib/providers/http';

test('cache: fresh hit, refetch after TTL, stale-if-error, error without stale copy', async () => {
  clearCache();
  let t = 1000;
  const now = () => t;
  let calls = 0;
  const ok = async () => ++calls;
  assert.deepEqual(await cached('k', 100, 1000, ok, now), { value: 1, fetchedAt: 1000, stale: false, cached: false });
  assert.equal((await cached('k', 100, 1000, ok, now)).cached, true);
  t = 1200;
  assert.equal((await cached('k', 100, 1000, ok, now)).value, 2);
  t = 1400;
  const failing = async () => {
    throw new Error('down');
  };
  const stale = await cached('k', 100, 1000, failing, now);
  assert.deepEqual([stale.value, stale.stale], [2, true]);
  t = 5000;
  await assert.rejects(cached('k', 100, 1000, failing, now), /down/);
  await assert.rejects(cached('other', 100, 1000, failing, now), /down/);
});

test('cache de-duplicates concurrent requests', async () => {
  clearCache();
  let calls = 0;
  const slow = () => new Promise<number>((r) => setTimeout(() => r(++calls), 10));
  const [a, b] = await Promise.all([cached('d', 1000, 1000, slow), cached('d', 1000, 1000, slow)]);
  assert.equal(calls, 1);
  assert.equal(a.value, b.value);
});

test('rate limiter allows max per window per key', () => {
  const check = createLimiter({ windowMs: 1000, max: 2 });
  assert.ok(check('a', 0).ok && check('a', 1).ok);
  const third = check('a', 2);
  assert.ok(!third.ok && third.retryAfter === 1);
  assert.ok(check('b', 2).ok);
  assert.ok(check('a', 1001).ok);
  assert.equal(clientIp(new Headers({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' })), '1.2.3.4');
  assert.equal(clientIp(new Headers()), 'unknown');
});

test('query validation for native lookups', () => {
  const ok = checkAddressQuery('ethereum', '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48');
  assert.ok(ok.ok && ok.query === '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
  assert.ok(checkAddressQuery('ethereum', 'vitalik.eth').ok);
  assert.ok(!checkAddressQuery('base', 'vitalik.eth').ok);
  assert.ok(!checkAddressQuery('ethereum', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB4a').ok, 'bad checksum');
  assert.ok(checkAddressQuery('bitcoin', '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa').ok);
  assert.ok(!checkAddressQuery('bitcoin', 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx').ok, 'testnet');
  assert.ok(!checkAddressQuery('bitcoin', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48').ok, 'wrong chain');
  assert.ok(checkAddressQuery('solana', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v').ok);
  assert.ok(!checkAddressQuery('tron', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t').ok, 'no native support');
  assert.ok(!checkAddressQuery('ethereum', 'abandon '.repeat(11) + 'about').ok, 'secret');
  assert.ok(checkTxQuery('ethereum', `0x${'ab'.repeat(32)}`).ok);
  assert.ok(checkTxQuery('bitcoin', 'a'.repeat(64)).ok);
  assert.ok(!checkTxQuery('solana', 'a'.repeat(64)).ok);
  assert.ok(checkEvmAddress('0x000000000000000000000000000000000000dead').ok);
  assert.ok(!checkEvmTx('0x1234').ok);
});

test('every native network maps to a known chain', () => {
  for (const n of NETWORKS) {
    assert.ok(getChain(n.id), n.id);
    if (n.family === 'evm') for (const u of n.rpc) assert.match(u, /^https:\/\//);
  }
  assert.ok(hasNativeSupport('ethereum', 'name') && !hasNativeSupport('base', 'name') && !hasNativeSupport('tron', 'address'));
});

test('OFAC snapshot lookup', () => {
  // Ronin bridge exploiter, sanctioned April 2022.
  const hit = checkSanctions('0x098B716B8Aaf21512996dC57EB0615e2383E2f96');
  assert.ok(hit.listed && hit.lists.includes('ETH'));
  assert.ok(checkSanctions('0x098b716b8aaf21512996dc57eb0615e2383e2f96').listed, 'case-insensitive for 0x');
  assert.ok(!checkSanctions('0x000000000000000000000000000000000000dEaD').listed);
  assert.match(hit.snapshotAt, /^\d{4}-\d\d-\d\d/);
});

test('saved items and prefs sanitise untrusted JSON', () => {
  const items = sanitizeSaved([
    { query: '0xABC', chainId: 'ethereum', label: 'x'.repeat(200) },
    { query: '0xabc', chainId: 'ethereum' },
    { query: '' },
    'junk',
    { query: 'bc1q', chainId: null, favourite: true },
  ]);
  assert.equal(items.length, 2);
  assert.equal(items[0].label.length, 80);
  assert.equal(savedId('0xABC', 'ethereum'), 'ethereum:0xabc');
  assert.equal(savedId('1A1zP', null), '*:1A1zP');
  assert.deepEqual(sanitizeSaved({ not: 'a list' }), []);
  const prefs = sanitizePrefs({ explorers: { ethereum: 'Blockscout', bad: 5 }, favouriteChains: ['bitcoin', 3], searchAction: 'nope' });
  assert.deepEqual(prefs, { explorers: { ethereum: 'Blockscout' }, favouriteChains: ['bitcoin'], searchAction: 'results' });
});

test('fetchJson maps HTTP failures to ProviderError', async () => {
  setFetch(async () => new Response('x', { status: 429 }));
  await assert.rejects(fetchJson('X', 'https://example.com'), (e: unknown) => e instanceof ProviderError && e.status === 429);
  setFetch(async () => new Response('not json', { status: 200 }));
  await assert.rejects(fetchJson('X', 'https://example.com'), /invalid JSON/);
  setFetch(async () => Response.json({ a: 1 }));
  assert.deepEqual(await fetchJson('X', 'https://example.com'), { a: 1 });
  setFetch(null);
});

test('lookup budget: per-minute bursts and an hourly cap', () => {
  const check = createLookupBudget({ perMinute: 3, perHour: 5 });
  assert.ok(check('a', 0).ok && check('a', 1).ok && check('a', 2).ok);
  assert.ok(!check('a', 3).ok, 'fourth in a minute is refused');
  assert.ok(check('a', 60_000).ok && check('a', 60_001).ok, 'new minute');
  const capped = check('a', 120_000);
  assert.ok(!capped.ok && capped.retryAfter > 3000, 'hourly cap reached; retry after the hour window');
  assert.ok(check('b', 120_000).ok, 'other clients unaffected');
  assert.ok(check('a', 3_600_001).ok, 'next hour');
});

test('crawler and automation detection', () => {
  const browsers = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:144.0) Gecko/20100101 Firefox/144.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0',
    'Mozilla/5.0 (Linux; Android 10; CUBOT X30 Build/QP1A.190711.020) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  ];
  for (const ua of browsers) assert.ok(!isCrawler(ua) && !isAutomated(ua), ua);
  const crawlers = [
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)',
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
    'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)',
    'Mozilla/5.0 (Linux; Android 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; Bytespider; spider-feedback@bytedance.com)',
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    'Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)',
  ];
  for (const ua of crawlers) assert.ok(isCrawler(ua) && isAutomated(ua), ua);
  // Scripts may use the API but don't get live data rendered into HTML.
  for (const ua of ['curl/8.5.0', 'python-requests/2.32.3', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/142.0.0.0 Safari/537.36']) {
    assert.ok(!isCrawler(ua) && isAutomated(ua), ua);
  }
  assert.ok(isAutomated(null) && isAutomated('') && !isCrawler(null));
});

test('robots.txt keeps crawlers off the live-lookup pages and the API, not off the empty search page', async () => {
  const { default: robots } = await import('../../app/robots');
  const rules = robots().rules;
  const disallow = (Array.isArray(rules) ? rules[0] : rules).disallow;
  for (const p of ['/api/', '/address/', '/tx/', '/search?']) assert.ok(disallow?.includes(p), p);
  assert.ok(!disallow?.includes('/search'));
});

test('sitemap lists static pages and per-chain explorer pages, not per-browser pages', async () => {
  const { default: sitemap } = await import('../../app/sitemap');
  const urls = sitemap().map((e) => e.url);
  assert.ok(urls.includes('https://web3lens.com/explorer/bitcoin'));
  assert.ok(urls.includes('https://web3lens.com/gas'));
  assert.ok(urls.includes('https://web3lens.com/tools/abi-decoder'));
  assert.ok(!urls.some((u) => u.endsWith('/saved') || u.endsWith('/settings')));
  assert.equal(new Set(urls).size, urls.length, 'no duplicates');
});

test('provider requests identify Web3Lens in a UA form public APIs accept', async () => {
  const { USER_AGENT } = await import('../../lib/providers/http');
  // Blockscout returns 403 for UAs not starting with Mozilla/5.0 (found in the batch 6 audit).
  assert.match(USER_AGENT, /^Mozilla\/5\.0 \(compatible; Web3Lens\/[\d.]+; \+https:\/\/web3lens\.com\)$/);
});

test('error messages use the right article', async () => {
  const { checkAddressQuery } = await import('../../lib/validate-query');
  const e = checkAddressQuery('ethereum', 'nope');
  assert.ok(!e.ok && e.error === "That isn't an Ethereum address.");
  const b = checkAddressQuery('bitcoin', 'nope');
  assert.ok(!b.ok && b.error === "That isn't a Bitcoin address.");
});

test('RPC failover: an endpoint that refuses every call hands over to the next one', async () => {
  const { rpcBatch } = await import('../../lib/providers/evm');
  const { setFetch } = await import('../../lib/providers/http');
  const net = { family: 'evm' as const, id: 'x', chainId: 1, name: 'X', symbol: 'X', rpc: ['https://first.test', 'https://second.test'] };
  const hits: string[] = [];
  setFetch(async (input, init) => {
    hits.push(String(input));
    const body = JSON.parse(String(init?.body)) as { id: number }[];
    return String(input).includes('first')
      ? Response.json(body.map((b) => ({ jsonrpc: '2.0', id: b.id, error: { code: -32000, message: 'Archive requests require a personal token' } })))
      : Response.json(body.map((b) => ({ jsonrpc: '2.0', id: b.id, result: '0x1' })));
  });
  try {
    assert.deepEqual(await rpcBatch(net, [{ method: 'eth_blockNumber', params: [] }]), ['0x1']);
    assert.deepEqual(hits, ['https://first.test', 'https://second.test']);
  } finally {
    setFetch(null);
  }
});
