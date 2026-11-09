import assert from 'node:assert/strict';
import { test } from 'node:test';
import explorersJson from '../../data/explorers.json';
import retiredJson from '../../data/chains-retired.json';
import { allExplorerRoutes, CHAINS, EXTRA_CHAINS, explorerRoutes, formatChainIds, getChain, getRetiredChain, routeOwnerId, type Chain } from '../../lib/chains';
import { chainsByName, filterChains } from '../../lib/chain-meta';
import { detectAll } from '../../lib/detect';
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

test('hand-verified routes for NEO and Waves (batch 5)', () => {
  assert.equal(href('neo', 'Nb7pfeqsqhjFJa2ALDfqsTGA4bw43kpEwT'), 'https://neotube.io/address/Nb7pfeqsqhjFJa2ALDfqsTGA4bw43kpEwT');
  assert.equal(href('neo', `0x${'ab'.repeat(32)}`), `https://neotube.io/transaction/0x${'ab'.repeat(32)}`);
  // The legacy Waves route used /address/; the explorer serves /addresses/.
  assert.equal(href('waves', '3PPfYtEw8dSNdmw2pV18BySmTZrTEaMNQDE'), 'https://wavesexplorer.com/addresses/3PPfYtEw8dSNdmw2pV18BySmTZrTEaMNQDE');
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
  const steem = resolveExplorer(getChain('steem')!, 'x');
  assert.equal(steem.fallback, true);
  const ppc = resolveExplorer(getChain('peercoin')!, 'g');
  assert.equal(ppc.kind, 'search');
  assert.equal(ppc.action.kind === 'url' && ppc.action.href, 'https://chainz.cryptoid.info/ppc/search.dws?q=g');
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
  for (const c of EXTRA_CHAINS) {
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

// ---------------------------------------------------------------------------------------------
// November 2026 chain audit

const ADDR = '0x52908400098527886E0F7030069857D2E4169EE7';

test('retired chains are gone from the list, each with a reason', () => {
  const retired = (retiredJson as { chains: { id: string; name: string; reason: string; retiredAt: string }[] }).chains;
  assert.ok(retired.length > 100);
  const ids = new Set(CHAINS.map((c) => c.id));
  for (const r of retired) {
    assert.ok(!ids.has(r.id), `${r.id} is retired but still listed`);
    assert.ok(r.reason.length > 20 && /^\d{4}-\d{2}-\d{2}$/.test(r.retiredAt), r.id);
  }
  assert.equal(new Set(retired.map((r) => r.id)).size, retired.length);
  assert.equal(getRetiredChain('bitconnect')?.name, 'BitConnect');
  assert.equal(getChain('bitconnect'), undefined);
});

test('every chain has somewhere to go: routes, an inherited host, or a legacy template', () => {
  for (const c of CHAINS) {
    const routes = explorerRoutes(c);
    assert.ok(routes.length > 0 || c.explorer.kind !== 'google' || c.fallback, `${c.id} has only a web search`);
  }
});

test('inherit prefixes point at chains that have routes', () => {
  const inherit = (explorersJson as { inherit: Record<string, string> }).inherit;
  for (const [prefix, id] of Object.entries(inherit)) {
    assert.ok(allExplorerRoutes()[id]?.length, `${prefix} → ${id} has no routes`);
    assert.deepEqual(templateProblems(prefix, { requireQ: false }), [], prefix);
  }
  // Waves and Stellar assets, Kin on Solana, GAS on Neo, ZEN on Base.
  assert.equal(routeOwnerId(getChain('mercury')!), 'waves');
  assert.equal(routeOwnerId(getChain('mobius')!), 'stellar');
  assert.equal(routeOwnerId(getChain('kin')!), 'solana');
  assert.equal(routeOwnerId(getChain('gas')!), 'neo');
  assert.equal(routeOwnerId(getChain('zencash')!), 'base');
  assert.equal(href('zencash', ADDR), `https://basescan.org/address/${ADDR}`);
});

test('EVM chain ids are unique and every EVM chain opens 0x addresses on its address page', () => {
  const evm = CHAINS.filter((c) => c.evmChainId);
  assert.ok(evm.length > 70);
  const seen = new Map<number, string>();
  for (const c of evm) {
    assert.ok(!seen.has(c.evmChainId!), `${c.id} and ${seen.get(c.evmChainId!)} share chain id ${c.evmChainId}`);
    seen.set(c.evmChainId!, c.id);
    assert.ok(formatChainIds(c).includes('ethereum') || c.id === 'ethereum', c.id);
    const r = resolveExplorer(c, ADDR);
    if (explorerRoutes(c).some((x) => x.address)) assert.equal(r.kind, 'address', c.id);
  }
  // A chain outside the detector's short 0x candidate list still gets the address page.
  assert.equal(href('swellchain', ADDR), `https://explorer.swellnetwork.io/address/${ADDR}`);
  assert.equal(href('hyperliquid', ADDR), `https://app.hyperliquid.xyz/explorer/address/${ADDR}`);
});

test('re-routed chains go to their current explorers', () => {
  assert.equal(href('nano', 'nano_1abc'), 'https://nanexplorer.com/nano/account/nano_1abc');
  assert.equal(href('namecoin', 'N1'), 'https://chainz.cryptoid.info/nmc/search.dws?q=N1');
  assert.equal(href('lisk', ADDR), `https://blockscout.lisk.com/address/${ADDR}`);
  assert.equal(href('tomochain', ADDR), `https://www.vicscan.xyz/address/${ADDR}`);
  assert.match(href('polkadot', '15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5'), /^https:\/\/assethub-polkadot\.subscan\.io\/account\//);
  assert.equal(getChain('zcoin')?.name, 'Firo');
  assert.equal(getChain('ripple')?.name, 'XRP Ledger');
});

test('new Cosmos prefixes are detected and routed to their chain', () => {
  // Valid bech32 (BIP-173) encodings of one 20-byte payload under each prefix.
  const vectors: [string, string[]][] = [
    ['dydx1pvc9275lcn5suv6c0k3v0mq3xedcpfw2wnxgdv', ['dydx']],
    ['terra1pvc9275lcn5suv6c0k3v0mq3xedcpfw2pwjv0m', ['terra', 'terraclassic']],
    ['noble1pvc9275lcn5suv6c0k3v0mq3xedcpfw20fay44', ['noble']],
    ['bbn1pvc9275lcn5suv6c0k3v0mq3xedcpfw2s5eajz', ['babylon']],
    ['thor1pvc9275lcn5suv6c0k3v0mq3xedcpfw2pd3hcy', ['thorchain']],
  ];
  for (const [address, chains] of vectors) {
    const d = detectAll(address)[0];
    assert.equal(d?.checksum, 'valid', address);
    assert.deepEqual(d.chains, chains, address);
    for (const id of chains) assert.ok(getChain(id), id);
  }
  assert.equal(href('dydx', vectors[0][0]), `https://www.mintscan.io/dydx/address/${vectors[0][0]}`);
  // One character changed: the checksum fails.
  assert.equal(detectAll('dydx1pvc9275lcn5suv6c0k3v0mq3xedcpfw2wnxgdw')[0]?.checksum, 'invalid');
});

test('the picker filter matches tickers and the full list is sorted by name', () => {
  assert.equal(filterChains(CHAINS, 'hype')[0]?.id, 'hyperliquid');
  assert.equal(filterChains(CHAINS, 'arb')[0]?.id, 'arbitrum');
  assert.ok(filterChains(CHAINS, 'xrp').some((c) => c.id === 'ripple'));
  const sorted = chainsByName(CHAINS);
  assert.equal(sorted.length, CHAINS.length);
  for (let i = 1; i < sorted.length; i++) assert.ok(sorted[i - 1].name.localeCompare(sorted[i].name, 'en', { sensitivity: 'base' }) <= 0);
});
