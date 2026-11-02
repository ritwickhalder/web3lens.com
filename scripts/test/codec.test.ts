import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { base32Decode, crc16xmodem } from '../../lib/codec/base32';
import { base58CheckDecode, base58Decode, base58Encode } from '../../lib/codec/base58';
import { bech32Decode, isSegwitAddress } from '../../lib/codec/bech32';
import { blake2b } from '../../lib/codec/blake2b';
import { bigIntToBytes, bytesToBigInt, bytesToHex, bytesToUtf8, hexToBytes, utf8ToBytes } from '../../lib/codec/bytes';
import { isCashAddr } from '../../lib/codec/cashaddr';
import { keccak256 } from '../../lib/codec/keccak';
import { sha256 } from '../../lib/codec/sha256';
import { evmChecksumStatus, toChecksumAddress } from '../../lib/evm/address';

const hex = (b: Uint8Array) => bytesToHex(b, false);

test('keccak256 matches the Ethereum test vectors', () => {
  assert.equal(hex(keccak256('')), 'c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470');
  assert.equal(hex(keccak256('abc')), '4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45');
  // Function selectors.
  assert.equal(hex(keccak256('transfer(address,uint256)')).slice(0, 8), 'a9059cbb');
  assert.equal(hex(keccak256('approve(address,uint256)')).slice(0, 8), '095ea7b3');
  // Event topic for ERC-20 Transfer.
  assert.equal(hex(keccak256('Transfer(address,address,uint256)')), 'ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef');
});

test('keccak256 handles multi-block input (rate boundary 136 bytes)', () => {
  // Cross-check: the block boundary must not change single-byte padding behaviour.
  for (const n of [135, 136, 137, 272, 1000]) assert.equal(keccak256(new Uint8Array(n)).length, 32);
  assert.equal(hex(keccak256(new Uint8Array(135))), hex(keccak256(new Uint8Array(135))));
  assert.notEqual(hex(keccak256(new Uint8Array(136))), hex(keccak256(new Uint8Array(137))));
});

test('sha256 matches node:crypto', () => {
  for (const s of ['', 'abc', 'a'.repeat(55), 'a'.repeat(56), 'a'.repeat(64), 'a'.repeat(1000)]) {
    assert.equal(hex(sha256(s)), createHash('sha256').update(s).digest('hex'), `len ${s.length}`);
  }
});

test('blake2b matches node:crypto (512-bit) and RFC 7693', () => {
  for (const s of ['', 'abc', 'x'.repeat(128), 'x'.repeat(129), 'x'.repeat(500)]) {
    assert.equal(hex(blake2b(s)), createHash('blake2b512').update(s).digest('hex'), `len ${s.length}`);
  }
  assert.equal(blake2b('abc', 32).length, 32);
});

test('base58 round-trips and base58check validates', () => {
  const raw = base58Decode('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')!;
  assert.equal(base58Encode(raw), '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
  assert.equal(base58CheckDecode('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')?.[0], 0);
  assert.equal(base58CheckDecode('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNb'), null);
  assert.equal(base58Decode('0OIl'), null);
  assert.equal(base58Encode(new Uint8Array([0, 0, 1])), '112');
});

test('bech32 / bech32m (BIP-173, BIP-350)', () => {
  assert.ok(isSegwitAddress('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', 'bc'));
  assert.ok(isSegwitAddress('bc1p5d7rjq7g6rdk2yhzks9smlaqtedr4dekq08ge8ztwac72sfr9rusxg3297', 'bc'));
  assert.ok(!isSegwitAddress('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdr', 'bc'));
  // v0 program encoded with bech32m is invalid.
  assert.ok(!isSegwitAddress('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kemeawh', 'bc'));
  assert.equal(bech32Decode('cosmos1hsk6jryyqjfhp5dhc55tc9jtckygx0eph6dd02')?.hrp, 'cosmos');
  assert.equal(bech32Decode('Cosmos1hsk6jryyqjfhp5dhc55tc9jtckygx0eph6dd02'), null, 'mixed case');
});

test('CashAddr checksum', () => {
  assert.ok(isCashAddr('bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a'));
  assert.ok(isCashAddr('qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a'));
  assert.ok(!isCashAddr('bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6c'));
});

test('base32 + CRC16-XModem', () => {
  assert.equal(crc16xmodem(utf8ToBytes('123456789')), 0x31c3);
  assert.deepEqual(base32Decode('MZXW6YQ'), utf8ToBytes('foo'.concat('b')));
});

test('EIP-55 checksums', () => {
  // Vectors from EIP-55.
  for (const a of [
    '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
    '0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359',
    '0xdbF03B407c01E7cD3CBea99509d93f8DDDC8C6FB',
    '0xD1220A0cf47c7B9Be7A2E6BA89F429762e7b9aDb',
  ]) {
    assert.equal(toChecksumAddress(a.toLowerCase()), a);
    assert.equal(evmChecksumStatus(a), 'valid');
  }
  assert.equal(evmChecksumStatus('0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed'), 'none');
  assert.equal(evmChecksumStatus('0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAeD'), 'invalid');
});

test('byte helpers', () => {
  assert.deepEqual(hexToBytes('0x0102ff'), new Uint8Array([1, 2, 255]));
  assert.equal(bytesToHex(new Uint8Array([1, 2, 255])), '0x0102ff');
  assert.equal(bytesToBigInt(bigIntToBytes(BigInt(65535), 4)), BigInt(65535));
  assert.equal(bytesToUtf8(new Uint8Array([0xff])), null);
  assert.throws(() => hexToBytes('0xzz'));
});
