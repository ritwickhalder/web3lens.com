/** Token coverage for chains without Blockscout: Routescan parsing and the verified known-token list. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import knownJson from '../../data/known-tokens.json';
import { getChain } from '../../lib/chains';
import { getEvmNetwork } from '../../lib/networks';
import { setFetch } from '../../lib/providers/http';
import { knownTokensFor } from '../../lib/providers/known-tokens';
import { getRoutescanTokens } from '../../lib/providers/routescan';

test('every EVM network has a token source: Blockscout, Routescan or a verified known-token list', () => {
  for (const id of ['ethereum', 'base', 'arbitrum', 'optimism', 'polygon', 'binancecoin', 'avalanche', 'linea', 'zksync', 'scroll', 'gnosischain']) {
    const n = getEvmNetwork(id)!;
    assert.ok(n.blockscout || n.routescan || knownTokensFor(id).length, id);
  }
});

test('known-token list is well-formed and was verified on-chain', () => {
  const data = knownJson as { verifiedAt: string; chains: Record<string, { address: string; symbol: string; decimals: number }[]> };
  assert.match(data.verifiedAt, /^\d{4}-\d\d-\d\dT/);
  for (const [chain, list] of Object.entries(data.chains)) {
    assert.ok(getChain(chain), chain);
    assert.ok(list.length > 0, chain);
    const seen = new Set<string>();
    for (const t of list) {
      assert.match(t.address, /^0x[0-9a-fA-F]{40}$/);
      assert.ok(!seen.has(t.address.toLowerCase()), `${chain} duplicate ${t.symbol}`);
      seen.add(t.address.toLowerCase());
      assert.ok(Number.isInteger(t.decimals) && t.decimals >= 0 && t.decimals <= 36);
    }
  }
});

test('Routescan holdings: metadata-less tokens are hidden, malformed fields never crash', async () => {
  setFetch(async () =>
    Response.json({
      items: [
        { tokenAddress: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', tokenName: 'Wrapped AVAX', tokenSymbol: 'WAVAX', tokenDecimals: 18, tokenQuantity: '11971608400000000000', tokenPrice: '8.57' },
        { tokenAddress: '0xae8E32c794693448882B8ED18458C3bE985510Dd', tokenQuantity: '5000000000000000000' },
        { tokenAddress: '0x0000000000000000000000000000000000000001', tokenSymbol: 'ODD', tokenDecimals: 6, tokenQuantity: 'not-a-number' },
      ],
      link: {},
    }),
  );
  try {
    const r = await getRoutescanTokens(43114, '0x9f8c163cBA728e99993ABe7495F06c0A3c8Ac8b9');
    assert.equal(r.items.length, 3);
    assert.deepEqual(r.items[0], {
      contract: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
      name: 'Wrapped AVAX',
      symbol: 'WAVAX',
      decimals: 18,
      balanceRaw: '11971608400000000000',
      balance: '11.9716084',
      priceUsd: 8.57,
      flagged: false,
      type: 'ERC-20',
    });
    assert.equal(r.items[1].flagged, true, 'no name/symbol/decimals → hidden as likely spam');
    assert.equal(r.items[2].balanceRaw, '0', 'malformed quantity is treated as zero, not guessed');
    assert.equal(r.more, false);
  } finally {
    setFetch(null);
  }
});
