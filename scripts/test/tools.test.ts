import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { bytesToHex, hexToBytes } from '../../lib/codec/bytes';
import { rlpDecode, rlpEncode } from '../../lib/codec/rlp';
import { decodeParams, encodeCall, encodeParams, formatDecoded, parseJsonAbi, parseSignature, parseType, typeString } from '../../lib/evm/abi';
import { decodeCalldata, KNOWN_SIGNATURES, knownFunctions } from '../../lib/evm/signatures';
import { decodeRawTransaction } from '../../lib/evm/tx-decode';
import { decimalToHex, hashes, hexToDecimal, hexToSignedInt256, hexToText, textToHex } from '../../lib/tools/convert';
import { bitcoinFee, calculateFee } from '../../lib/tools/gas';
import { parseTime, relative } from '../../lib/tools/time';
import { convertUnits, displayAmount, formatUnits, parseUnits } from '../../lib/tools/units';

test('units: exact conversions', () => {
  assert.equal(parseUnits('1.5', 18).toString(), '1500000000000000000');
  assert.equal(parseUnits('1e-9', 18).toString(), '1000000000');
  assert.equal(parseUnits('.5', 2).toString(), '50');
  assert.equal(formatUnits(BigInt('1500000000000000000'), 18), '1.5');
  assert.equal(formatUnits(BigInt(-1), 18), '-0.000000000000000001');
  assert.equal(convertUnits('1', 18, 9), '1000000000');
  assert.equal(convertUnits('21000', 9, 18), '0.000021');
  assert.equal(convertUnits('1', 8, 0), '100000000');
  assert.throws(() => parseUnits('1.0000000001', 9), /decimal places/);
  assert.throws(() => parseUnits('abc', 18));
  assert.equal(displayAmount('1234567.123456789'), '1,234,567.123456');
  assert.equal(displayAmount('0.0000000001'), '<0.000001');
});

test('hex, text and hashes', () => {
  assert.equal(hexToDecimal('0xde0b6b3a7640000'), '1000000000000000000');
  assert.equal(decimalToHex('1e18'), '0xde0b6b3a7640000');
  assert.equal(decimalToHex('255'), '0xff');
  assert.equal(decimalToHex('-1'), '-0x1');
  assert.equal(hexToSignedInt256(`0x${'f'.repeat(64)}`), '-1');
  assert.equal(hexToText(textToHex('héllo ✓')), 'héllo ✓');
  assert.throws(() => hexToText('0xff'));
  const h = hashes({ kind: 'text', value: 'transfer(address,uint256)' });
  assert.equal(h.selector, '0xa9059cbb');
  assert.equal(hashes({ kind: 'hex', value: '0x' }).keccak256, '0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470');
});

test('timestamps', () => {
  const genesis = parseTime('1231006505');
  assert.equal(genesis.iso, '2009-01-03T18:15:05.000Z');
  assert.equal(genesis.interpretedAs, 'seconds');
  assert.equal(parseTime('1231006505000').interpretedAs, 'milliseconds');
  assert.equal(parseTime('0x495fab29').seconds, 1231006505);
  assert.equal(parseTime('2009-01-03T18:15:05Z').seconds, 1231006505);
  assert.throws(() => parseTime('not a date'));
  assert.equal(relative(0, 3_600_000), '1 hour ago');
  assert.equal(relative(7_200_000, 0), 'in 2 hours');
});

test('fees', () => {
  const legacy = calculateFee({ gasLimit: '21000', baseFeeGwei: '20' });
  assert.equal(legacy.fee, '0.00042');
  const eip1559 = calculateFee({ gasLimit: '21000', baseFeeGwei: '10', priorityFeeGwei: '2', maxFeeGwei: '11', priceUsd: 2000 });
  assert.equal(eip1559.effectiveGasPriceGwei, '11');
  assert.equal(eip1559.feeWei, String(21000 * 11e9));
  assert.equal(eip1559.burnedWei, String(21000 * 10e9));
  assert.equal(eip1559.tipWei, String(21000 * 1e9));
  assert.ok(Math.abs(eip1559.feeUsd! - 0.462) < 1e-9);
  assert.deepEqual(bitcoinFee(141, 10), { sats: 1410, btc: '0.0000141' });
  assert.throws(() => calculateFee({ gasLimit: '0', baseFeeGwei: '1' }));
});

test('ABI types parse and print canonically', () => {
  for (const t of ['uint256', 'int8', 'address[]', 'bytes32[2]', '(address,uint256)[]', '(uint256,(bool,string))']) assert.equal(typeString(parseType(t)), t);
  assert.equal(typeString(parseType('uint')), 'uint256');
  assert.throws(() => parseType('uint7'));
  assert.equal(parseSignature('transfer(address to, uint256 amount)').selector, '0xa9059cbb');
  assert.equal(parseSignature('function approve(address spender,uint256 value) external returns (bool)').signature, 'approve(address,uint256)');
});

test('ABI encode/decode round-trips static and dynamic types', () => {
  const types = ['uint256', 'string', 'bytes', 'address[]', '(uint8,bool,string)', 'int256', 'bytes4', 'uint256[2]'];
  const values = [
    '42',
    'hello world, this string is longer than thirty-two bytes',
    '0xdeadbeef',
    ['0x000000000000000000000000000000000000dEaD', '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed'],
    ['7', true, 'x'],
    '-5',
    '0x12345678',
    ['1', '2'],
  ];
  const enc = encodeParams(types, values);
  const dec = decodeParams(types.map((t) => ({ type: parseType(t) })), enc).map(formatDecoded);
  assert.deepEqual(dec, [
    '42',
    'hello world, this string is longer than thirty-two bytes',
    '0xdeadbeef',
    '[0x000000000000000000000000000000000000dEaD, 0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed]',
    '[7, true, x]',
    '-5',
    '0x12345678',
    '[1, 2]',
  ]);
});

test('calldata decoding with built-in signatures and a JSON ABI', () => {
  const data = encodeCall('transfer(address,uint256)', ['0x000000000000000000000000000000000000dEaD', '1000']);
  assert.equal(data.slice(0, 10), '0xa9059cbb');
  const [call] = decodeCalldata(data);
  assert.equal(call.fn.signature, 'transfer(address,uint256)');
  assert.deepEqual(call.args.map(formatDecoded), ['0x000000000000000000000000000000000000dEaD', '1000']);
  const abi = parseJsonAbi(JSON.stringify([{ type: 'function', name: 'setValue', inputs: [{ name: 'v', type: 'tuple', components: [{ name: 'a', type: 'uint256' }, { name: 'b', type: 'string' }] }] }]));
  const enc = encodeCall('setValue((uint256,string))', [['5', 'hi']]);
  const [c2] = decodeCalldata(enc, abi.functions);
  assert.equal(c2.fn.name, 'setValue');
  assert.equal(c2.args[0].name, 'v');
  assert.equal(decodeCalldata('0xdeadbeef').length, 0);
  assert.equal(decodeCalldata('nonsense').length, 0);
  // Truncated data must fail cleanly, not throw.
  assert.equal(decodeCalldata(data.slice(0, 40)).length, 0);
  // Every built-in signature parses.
  assert.ok(knownFunctions().size > 40 && KNOWN_SIGNATURES.every((s) => parseSignature(s)));
});

test('decoder rejects hostile lengths without hanging', () => {
  const huge = `0x${'0'.repeat(62)}20${'f'.repeat(64)}`;
  assert.throws(() => decodeParams([{ type: parseType('bytes') }], huge));
  assert.throws(() => decodeParams([{ type: parseType('uint256[]') }], huge));
});

test('RLP round-trips and rejects malformed input', () => {
  const item = [hexToBytes('0x01'), [hexToBytes('0x'), hexToBytes(`0x${'ab'.repeat(60)}`)], hexToBytes('0x80')];
  const enc = rlpEncode(item);
  assert.deepEqual(rlpDecode(enc), item);
  assert.equal(bytesToHex(rlpEncode(hexToBytes('0x'))), '0x80');
  assert.equal(bytesToHex(rlpEncode([])), '0xc0');
  assert.throws(() => rlpDecode(hexToBytes('0xc3')));
  assert.throws(() => rlpDecode(hexToBytes('0x0102')));
});

test('raw transactions decode with the right hash and sender (mainnet fixtures, types 0/2/3/4)', () => {
  const fixtures = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'fixtures', 'raw-txs.json'), 'utf8')) as { type: number; hash: string; from: string; raw: string }[];
  assert.deepEqual([...new Set(fixtures.map((f) => f.type))].sort(), [0, 2, 3, 4]);
  for (const f of fixtures) {
    const d = decodeRawTransaction(f.raw);
    assert.equal(d.type, f.type);
    assert.equal(d.hash, f.hash, `hash of type ${f.type}`);
    assert.equal(d.from?.toLowerCase(), f.from, `sender of type ${f.type}`);
    if (f.type !== 0) assert.equal(d.chainId, 1);
    if (f.type === 4) assert.ok(d.authorizations!.length > 0 && d.authorizations!.every((a) => a.signer));
  }
});

test('tampered transactions are caught', () => {
  const [f] = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'fixtures', 'raw-txs.json'), 'utf8')) as { raw: string; from: string }[];
  // Flip a byte inside the signed payload: the recovered sender changes.
  const raw = f.raw;
  const i = raw.length - 140;
  const tampered = raw.slice(0, i) + (raw[i] === '0' ? '1' : '0') + raw.slice(i + 1);
  try {
    const d = decodeRawTransaction(tampered);
    assert.notEqual(d.from?.toLowerCase(), f.from);
  } catch {
    // Or it no longer parses at all; both are fine.
  }
  assert.throws(() => decodeRawTransaction('0x1234'));
  assert.throws(() => decodeRawTransaction('0x09c0c0'));
});
