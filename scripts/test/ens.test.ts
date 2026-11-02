/** ENS resolution: DNS encoding, gateway URL safety, and a full CCIP-read round trip against a mocked RPC and gateway. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bytesToHex } from '../../lib/codec/bytes';
import { encodeParams } from '../../lib/evm/abi';
import type { EvmNetwork } from '../../lib/networks';
import { dnsEncode, isAllowedGatewayUrl, namehash, resolveEns } from '../../lib/providers/evm';
import { setFetch } from '../../lib/providers/http';

const NET: EvmNetwork = { family: 'evm', id: 'ethereum', chainId: 1, name: 'Ethereum', symbol: 'ETH', rpc: ['https://rpc.test'] };
const REGISTRY = '0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e';
const RESOLVER = '0x1111111111111111111111111111111111111111';
const TARGET = '0x2211d1D0020DAEA8039E46Cf1367962070d77DA9';
const word = (hex: string) => hex.replace(/^0x/, '').padStart(64, '0');

test('namehash and DNS encoding (ENS spec vectors)', () => {
  assert.equal(namehash(''), `0x${'0'.repeat(64)}`);
  assert.equal(namehash('eth'), '0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae');
  assert.equal(namehash('foo.eth'), '0xde9b09fd7c5f901e23a3f19fecc54828e9c848539801e86591bd9801b019f84f');
  assert.equal(dnsEncode('vitalik.eth'), '0x07766974616c696b0365746800');
  assert.throws(() => dnsEncode('a..eth'));
});

test('gateway URLs: public https hostnames only', () => {
  assert.ok(isAllowedGatewayUrl('https://gateway.example.com/{sender}/{data}.json'));
  assert.ok(isAllowedGatewayUrl('https://api.example.org/lookup'));
  for (const bad of [
    'http://gateway.example.com/{data}',
    'https://169.254.169.254/latest/{data}',
    'https://127.0.0.1/{data}',
    'https://[::1]/{data}',
    'https://localhost/{data}',
    'https://metadata.google.internal/{data}',
    'https://printer.local/{data}',
    'https://user:pw@example.com/{data}',
    'https://example.com:8443/{data}',
    'not a url',
  ]) {
    assert.ok(!isAllowedGatewayUrl(bad), bad);
  }
});

/** A fake chain + gateway: the resolver is wildcard-capable and answers via OffchainLookup. */
function mockChain({ sender = RESOLVER, gatewayUrl = 'https://gw.example.com/{sender}/{data}.json' } = {}) {
  const calls: string[] = [];
  const offchainLookup = `0x556f1830${bytesToHex(encodeParams(['address', 'string[]', 'bytes', 'bytes4', 'bytes'], [sender, [gatewayUrl], '0xabcd', '0x12345678', '0xbeef']), false)}`;
  setFetch(async (input, init) => {
    const url = String(input);
    calls.push(url);
    if (url.startsWith('https://gw.example.com/')) {
      // The gateway's answer: ABI bytes wrapping the ABI-encoded address.
      const inner = bytesToHex(encodeParams(['address'], [TARGET]));
      return Response.json({ data: bytesToHex(encodeParams(['bytes'], [inner])) });
    }
    const parsed = JSON.parse(String(init?.body));
    const answer = (body: { id: number; params: { to: string; data: string }[] }) => {
      const { to, data } = body.params[0];
      const reply = (result: string) => ({ jsonrpc: '2.0', id: body.id, result });
      if (to.toLowerCase() === REGISTRY) {
        // Only the parent (base.eth) has a resolver: forces the ENSIP-10 wildcard path.
        return reply(`0x${word(data.endsWith(namehash('base.eth').slice(2)) ? RESOLVER : '0x0')}`);
      }
      if (data.startsWith('0x01ffc9a7')) return reply(`0x${word('1')}`); // supportsInterface → true
      if (data.startsWith('0x9061b923')) return { jsonrpc: '2.0', id: body.id, error: { code: 3, message: 'execution reverted', data: offchainLookup } };
      // Callback: the resolver verifies the gateway's response and returns the resolved bytes.
      if (data.startsWith('0x12345678')) return reply(bytesToHex(encodeParams(['bytes'], [bytesToHex(encodeParams(['address'], [TARGET]))])));
      return reply('0x');
    };
    return Response.json(Array.isArray(parsed) ? parsed.map(answer) : answer(parsed));
  });
  return calls;
}

test('CCIP-read: wildcard resolver → gateway → on-chain callback', async () => {
  const calls = mockChain();
  try {
    assert.equal(await resolveEns(NET, 'jesse.base.eth'), TARGET);
    assert.ok(calls.some((u) => u.startsWith(`https://gw.example.com/${RESOLVER}/0xabcd.json`)), 'gateway called with {sender}/{data}');
  } finally {
    setFetch(null);
  }
});

test('CCIP-read refuses a lookup raised by a different contract', async () => {
  mockChain({ sender: '0x9999999999999999999999999999999999999999' });
  try {
    await assert.rejects(resolveEns(NET, 'jesse.base.eth'), /unexpected contract/);
  } finally {
    setFetch(null);
  }
});

test('CCIP-read never calls a gateway on an internal host', async () => {
  const calls = mockChain({ gatewayUrl: 'https://169.254.169.254/{data}' });
  try {
    await assert.rejects(resolveEns(NET, 'jesse.base.eth'), /does not call/);
    assert.ok(!calls.some((u) => u.includes('169.254')));
  } finally {
    setFetch(null);
  }
});
