import assert from 'node:assert/strict';
import { test } from 'node:test';
import { allExplorerRoutes, CHAINS, explorerRoutes, getChain, type Chain } from '../../lib/chains';
import {
  explorerLinks,
  fallbackNotice,
  isSafeExternalUrl,
  resolveExplorer,
  resolveLegacyExplorer,
  templateProblems,
} from '../../lib/explorer';

const chain = (explorer: Chain['explorer'], fallback?: boolean): Chain => ({
  id: 'x',
  name: 'Xcoin',
  legacyValue: 'Xcoin',
  explorer,
  fallback,
});

const href = (id: string, q: string, explorer?: string) => {
  const r = resolveExplorer(getChain(id)!, q, { explorer });
  assert.equal(r.action.kind, 'url');
  return r.action.kind === 'url' ? r.action.href : '';
};

const BTC_TX = '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b';
const EVM_TX = `0x${'ab'.repeat(32)}`;
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

test('legacy url explorers get the trimmed, encoded query', () => {
  const action = resolveLegacyExplorer(chain({ kind: 'url', url: 'https://ex.io/search?q={q}' }), '  a b&c  ');
  assert.deepEqual(action, { kind: 'url', href: 'https://ex.io/search?q=a%20b%26c' });
});

test('legacy form explorers pass the raw trimmed query as the form value', () => {
  const action = resolveLegacyExplorer(chain({ kind: 'form', action: 'https://ex.io/', method: 'post', param: 'q' }), ' 0x1 ');
  assert.deepEqual(action, { kind: 'form', action: 'https://ex.io/', method: 'post', param: 'q', value: '0x1' });
});

test('legacy google fallback searches for the explorer plus the query', () => {
  const action = resolveLegacyExplorer(chain({ kind: 'google', terms: 'Xcoin Blockchain Explorer' }), 'abc');
  assert.deepEqual(action, { kind: 'url', href: 'https://www.google.com/search?q=Xcoin%20Blockchain%20Explorer%20abc' });
});

test('fallback notice names the chain', () => {
  assert.match(fallbackNotice(chain({ kind: 'url', url: '{q}' }, true)), /^Xcoin is one of the very few blockchains not yet supported/);
});

test('routes each query type to the right page (fixes the legacy single-path quirks)', () => {
  // Bitcoin used to send everything to /btc/address/.
  assert.equal(href('bitcoin', '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'), 'https://mempool.space/address/1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
  assert.equal(href('bitcoin', BTC_TX), `https://mempool.space/tx/${BTC_TX}`);
  assert.equal(href('bitcoin', '840000'), 'https://mempool.space/block/840000');
  // Solana used to send everything to /tx/.
  assert.equal(
    href('solana', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
    'https://explorer.solana.com/address/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  );
  // Tron used to send everything to /transaction/.
  assert.equal(href('tron', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'), 'https://tronscan.org/#/address/TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t');
  assert.equal(href('tron', BTC_TX), `https://tronscan.org/#/transaction/${BTC_TX}`);
  // Cardano used to send everything to /address/.
  assert.equal(href('cardano', BTC_TX), `https://cardanoscan.io/transaction/${BTC_TX}`);
  // EVM.
  assert.equal(href('ethereum', USDC.toLowerCase()), `https://etherscan.io/address/${USDC}`);
  assert.equal(href('base', EVM_TX), `https://basescan.org/tx/${EVM_TX}`);
  assert.equal(href('ethereum', 'vitalik.eth'), 'https://etherscan.io/name-lookup-search?id=vitalik.eth');
  // Unrecognised text goes to the explorer's search.
  assert.equal(href('ethereum', 'hello'), 'https://etherscan.io/search?q=hello');
});

test('odd legacy mappings are fixed', () => {
  assert.match(href('usdc', USDC), /^https:\/\/etherscan\.io\/token\/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48\?a=/);
  assert.match(href('internetcomputer', 'abc'), /^https:\/\/dashboard\.internetcomputer\.org\//);
  assert.match(href('icon', 'hx' + 'a'.repeat(40)), /^https:\/\/tracker\.icon\.community\//);
});

test('ERC-20 tokens that pointed at Etherscan search inherit the Ethereum routes', () => {
  const tokens = CHAINS.filter((c) => c.explorer.kind === 'url' && c.explorer.url === 'https://etherscan.io/search?q={q}' && !(c.id in allExplorerRoutes()));
  assert.ok(tokens.length > 300);
  for (const t of tokens.slice(0, 20)) assert.equal(explorerRoutes(t)[0]?.name, 'Etherscan', t.name);
  assert.equal(href(tokens[0].id, EVM_TX), `https://etherscan.io/tx/${EVM_TX}`);
});

test('explorer preference picks the named explorer and falls back to the default', () => {
  assert.equal(href('ethereum', EVM_TX, 'Blockscout'), `https://eth.blockscout.com/tx/${EVM_TX}`);
  assert.equal(href('ethereum', EVM_TX, 'Nope'), `https://etherscan.io/tx/${EVM_TX}`);
});

test('chains without routes use the legacy explorer', () => {
  const r = resolveExplorer(getChain('stellar')!, 'G1');
  assert.ok(r.action.kind === 'url');
  const lisk = resolveExplorer(getChain('lisk')!, 'x');
  assert.equal(lisk.fallback, true);
  const gc = resolveExplorer(getChain('gamecredits')!, 'g');
  assert.equal(gc.kind, 'search');
});

test('explorerLinks lists every explorer for the query type', () => {
  const links = explorerLinks(getChain('bitcoin')!, BTC_TX);
  assert.deepEqual(
    links.map((l) => l.name),
    ['mempool.space', 'Blockstream', 'Blockchair', 'Blockchain.com'],
  );
  assert.ok(links.every((l) => l.href.includes(BTC_TX) && l.kind === 'tx'));
});

test('every route template is valid https with exactly one {q}', () => {
  for (const [id, routes] of Object.entries(allExplorerRoutes())) {
    assert.ok(getChain(id), `routes for unknown chain ${id}`);
    assert.ok(routes.length > 0, id);
    for (const r of routes) {
      assert.deepEqual(templateProblems(r.home, { requireQ: false }), [], `${id} ${r.name} home`);
      for (const key of ['address', 'tx', 'block', 'names', 'search'] as const) {
        if (r[key]) assert.deepEqual(templateProblems(r[key]!), [], `${id} ${r.name} ${key}`);
      }
      assert.ok(r.address || r.tx || r.search, `${id} ${r.name} has no usable template`);
    }
  }
});

test('every legacy template is a valid URL with exactly one {q}', () => {
  for (const c of CHAINS) {
    if (c.explorer.kind === 'url') assert.deepEqual(templateProblems(c.explorer.url, { allowHttp: true }), [], c.name);
    if (c.explorer.kind === 'form') assert.deepEqual(templateProblems(c.explorer.action, { allowHttp: true, requireQ: false }), [], c.name);
  }
});

test('extra chains are https-only and unique', () => {
  const ids = CHAINS.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const c of CHAINS.filter((x) => !x.legacyValue)) {
    assert.ok(c.explorer.kind === 'url' && c.explorer.url.startsWith('https://'), c.id);
  }
});

test('isSafeExternalUrl blocks non-http schemes and private hosts', () => {
  assert.ok(isSafeExternalUrl('https://etherscan.io/tx/1'));
  assert.ok(!isSafeExternalUrl('javascript:alert(1)'));
  assert.ok(!isSafeExternalUrl('data:text/html,x'));
  assert.ok(!isSafeExternalUrl('http://localhost:3000'));
  assert.ok(!isSafeExternalUrl('https://user:pw@example.com'));
});
