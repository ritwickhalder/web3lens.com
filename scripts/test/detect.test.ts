import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getChain } from '../../lib/chains';
import { detectAll, detectQuery, EXAMPLES, extractQuery } from '../../lib/detect';

const label = (q: string) => detectQuery(q)?.label ?? null;
const checksum = (q: string) => detectQuery(q)?.checksum ?? null;

test('recognises common address formats', () => {
  assert.equal(label('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'), 'EVM address');
  assert.equal(label('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'), 'Bitcoin address');
  assert.equal(label('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy'), 'Bitcoin address');
  assert.equal(label('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq'), 'Bitcoin address');
  assert.equal(label('bc1p5d7rjq7g6rdk2yhzks9smlaqtedr4dekq08ge8ztwac72sfr9rusxg3297'), 'Bitcoin address');
  assert.equal(label('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'), 'Tron address');
  assert.equal(label('rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh'), 'XRP address');
  assert.equal(label('cosmos1hsk6jryyqjfhp5dhc55tc9jtckygx0eph6dd02'), 'Cosmos address');
  assert.equal(label('DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L'), 'Dogecoin address');
  assert.equal(label('LVg2kJoFNg45Nbpy53h7Fe1wKyeXVRhMH9'), 'Litecoin address');
  assert.equal(label('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), 'Solana address');
  assert.equal(label('GAHK7EEG2WWHVKDNT4CEQFZGKF2LGDSW2IVM4S5DP42RBW3K6BTODB4A'), 'Stellar address');
  assert.equal(label('bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a'), 'Bitcoin Cash address');
  assert.equal(label('15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5'), 'Polkadot address');
  assert.equal(label('HNZata7iMYWmk5RvZRTiAsSDhV8366zq2YGb3tLH5Upf74F'), 'Kusama address');
  assert.equal(label('EQDtFpEwcFAEcRe5mLVh2N6C0x-_hJEM7W61_JLnSF74p4q2'), 'TON address');
  assert.equal(label('tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb'), 'Tezos address');
  assert.equal(label('alice.near'), 'NEAR account');
});

test('verifies checksums and flags mistakes instead of guessing another chain', () => {
  assert.equal(checksum('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'), 'valid');
  assert.equal(checksum('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'), 'none');
  const typo = detectQuery('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB4a')!;
  assert.equal(typo.checksum, 'invalid');
  assert.match(typo.note!, /checksum/i);
  assert.equal(checksum('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'), 'valid');
  const btcTypo = detectQuery('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNb')!;
  assert.equal(btcTypo.label, 'Bitcoin address');
  assert.equal(btcTypo.checksum, 'invalid');
  assert.equal(checksum('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdr'), 'invalid');
  assert.equal(checksum('bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6c'), 'invalid');
});

test('normalises: EIP-55 checksum, lowercase bech32, cashaddr prefix', () => {
  assert.equal(detectQuery('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48')?.normalized, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
  assert.equal(detectQuery('BC1QAR0SRRR7XFKVY5L643LYDNW9RE59GTZZWF5MDQ')?.normalized, 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq');
  assert.equal(detectQuery('qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a')?.normalized, 'bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a');
});

test('recognises hashes, names and block numbers', () => {
  assert.equal(label(`0x${'ab'.repeat(32)}`), 'EVM transaction hash');
  assert.equal(label('4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b'), 'Transaction hash');
  assert.equal(label('00000000000000000002a7c4c1e48d76c5a37902165a270156b7a8d72728a054'), 'Bitcoin block hash');
  assert.equal(label('vitalik.eth'), 'ENS name');
  assert.equal(label('pay.vitalik.eth'), 'ENS name');
  assert.equal(label('bonfida.sol'), 'Solana name');
  assert.equal(label('840000'), 'Block number');
});

test('offers every interpretation of an ambiguous query', () => {
  const all = detectAll(`0x${'ab'.repeat(32)}`).map((d) => d.format);
  assert.deepEqual(all, ['evm-tx', 'move-address', 'substrate-hash']);
});

test('refuses to search secrets', () => {
  assert.equal(detectQuery('5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ')?.kind, 'secret');
  assert.equal(detectQuery('abandon '.repeat(11) + 'about')?.kind, 'secret');
});

test('returns null for things it does not recognise', () => {
  assert.equal(detectQuery(''), null);
  assert.equal(detectQuery('   '), null);
  assert.equal(detectQuery('hello world'), null);
  assert.equal(detectQuery('0x123'), null);
});

test('extracts the query from payment URIs and explorer links', () => {
  assert.deepEqual(extractQuery('bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?amount=0.1'), {
    query: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    from: 'uri',
  });
  assert.equal(extractQuery('ethereum:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48@1').query, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
  const tx = `0x${'cd'.repeat(32)}`;
  assert.deepEqual(extractQuery(`https://etherscan.io/tx/${tx}`), { query: tx, from: 'url', host: 'etherscan.io' });
  assert.equal(extractQuery('https://tronscan.org/#/address/TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t').query, 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t');
  assert.equal(extractQuery('https://example.com/about').query, 'https://example.com/about');
  assert.equal(extractQuery('  vitalik.eth ').query, 'vitalik.eth');
});

test('every suggested chain exists', () => {
  const samples = [
    '0x' + 'a'.repeat(40),
    '0x' + 'a'.repeat(64),
    '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    'vitalik.eth',
    '840000',
    'a'.repeat(64),
    'A'.repeat(64),
    'alice.near',
    'cosmos1hsk6jryyqjfhp5dhc55tc9jtckygx0eph6dd02',
    'EQDtFpEwcFAEcRe5mLVh2N6C0x-_hJEM7W61_JLnSF74p4q2',
  ];
  for (const q of samples) {
    for (const d of detectAll(q)) for (const id of d.chains) assert.ok(getChain(id), `${q} → ${id}`);
  }
});

test('home page examples are detected as advertised', () => {
  for (const ex of EXAMPLES) assert.equal(label(ex.query), ex.expect, ex.query);
});
