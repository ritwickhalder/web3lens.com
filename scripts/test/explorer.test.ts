import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CHAINS, getChain, type Chain } from '../../lib/chains';
import { fallbackNotice, resolveExplorer } from '../../lib/explorer';

const chain = (explorer: Chain['explorer'], fallback?: boolean): Chain => ({
  id: 'x',
  name: 'Xcoin',
  legacyValue: 'Xcoin',
  explorer,
  fallback,
});

test('url explorers get the trimmed, encoded query', () => {
  const action = resolveExplorer(chain({ kind: 'url', url: 'https://ex.io/search?q={q}' }), '  a b&c  ');
  assert.deepEqual(action, { kind: 'url', href: 'https://ex.io/search?q=a%20b%26c' });
});

test('form explorers pass the raw trimmed query as the form value', () => {
  const action = resolveExplorer(chain({ kind: 'form', action: 'https://ex.io/', method: 'post', param: 'q' }), ' 0x1 ');
  assert.deepEqual(action, { kind: 'form', action: 'https://ex.io/', method: 'post', param: 'q', value: '0x1' });
});

test('google fallback searches for the explorer plus the query', () => {
  const action = resolveExplorer(chain({ kind: 'google', terms: 'Xcoin Blockchain Explorer' }), 'abc');
  assert.deepEqual(action, { kind: 'url', href: 'https://www.google.com/search?q=Xcoin%20Blockchain%20Explorer%20abc' });
});

test('fallback notice names the chain', () => {
  assert.match(fallbackNotice(chain({ kind: 'url', url: '{q}' }, true)), /^Xcoin is one of the very few blockchains not yet supported/);
});

test('well-known chains route where the legacy site sent them', () => {
  assert.equal(CHAINS[0].id, 'bitcoin');
  assert.deepEqual(resolveExplorer(getChain('ethereum')!, '0xabc'), { kind: 'url', href: 'https://etherscan.io/search?q=0xabc' });
  assert.equal(resolveExplorer(getChain('stellar')!, 'G1').kind, 'form');
  assert.equal(getChain('lisk')?.fallback, true);
  // GameCredits fell through into Bitcore in the legacy switch; only the first explorer is kept.
  const gc = resolveExplorer(getChain('gamecredits')!, 'g');
  assert.ok(gc.kind === 'url' && gc.href.startsWith('https://blockexplorer.gamecredits.com/'));
});

test('every url template has exactly one {q} and uses http(s)', () => {
  for (const c of CHAINS) {
    if (c.explorer.kind === 'url') {
      assert.equal(c.explorer.url.split('{q}').length, 2, c.name);
      assert.match(c.explorer.url, /^https?:\/\//, c.name);
    }
    if (c.explorer.kind === 'form') assert.match(c.explorer.action, /^https?:\/\//, c.name);
  }
});
