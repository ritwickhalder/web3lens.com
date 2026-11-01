import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getChain } from '../../lib/chains';
import { detectQuery, EXAMPLES } from '../../lib/detect';

const label = (q: string) => detectQuery(q)?.label ?? null;

test('recognises common address formats', () => {
  assert.equal(label('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'), 'EVM address');
  assert.equal(label('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'), 'Bitcoin address');
  assert.equal(label('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy'), 'Bitcoin address');
  assert.equal(label('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq'), 'Bitcoin address');
  assert.equal(label('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'), 'Tron address');
  assert.equal(label('rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh'), 'XRP address');
  assert.equal(label('cosmos1hsk6jryyqjfhp5dhc55tc9jtckygx0eph6dd02'), 'Cosmos address');
  assert.equal(label('DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L'), 'Dogecoin address');
  assert.equal(label('LVg2kJoFNg45Nbpy53h7Fe1wKyeXVRhMH9'), 'Litecoin address');
  assert.equal(label('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), 'Solana address');
  assert.equal(label('GAHK7EEG2WWHVKDNT4CEQFZGKF2LGDSW2IVM4S5DP42RBW3K6BTODB4A'), 'Stellar address');
});

test('recognises hashes, names and block numbers', () => {
  assert.equal(label(`0x${'ab'.repeat(32)}`), 'EVM transaction hash');
  assert.equal(label('4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b'), 'Transaction hash');
  assert.equal(label('vitalik.eth'), 'ENS name');
  assert.equal(label('pay.vitalik.eth'), 'ENS name');
  assert.equal(label('bonfida.sol'), 'Solana name');
  assert.equal(label('840000'), 'Block number');
});

test('returns null for things it does not recognise', () => {
  assert.equal(detectQuery(''), null);
  assert.equal(detectQuery('   '), null);
  assert.equal(detectQuery('hello world'), null);
  assert.equal(detectQuery('0x123'), null);
});

test('every suggested chain exists in chains.json', () => {
  const samples = ['0x' + 'a'.repeat(40), '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', 'vitalik.eth', '840000', 'a'.repeat(64)];
  for (const q of samples) {
    for (const id of detectQuery(q)!.chains) assert.ok(getChain(id), `${q} → ${id}`);
  }
});

test('home page examples are detected as advertised', () => {
  for (const ex of EXAMPLES) assert.equal(label(ex.query), ex.expect, ex.query);
});
