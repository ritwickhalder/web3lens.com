/**
 * Display details for the chains people pick most. Everything else in data/chains.json
 * gets a neutral glyph. Colours are each project's brand colour, nudged for a dark background.
 */
import { getChain, type Chain } from '@/lib/chains';

export type ChainMeta = { symbol: string; color: string };

export const CHAIN_META: Record<string, ChainMeta> = {
  bitcoin: { symbol: 'BTC', color: '#f7931a' },
  ethereum: { symbol: 'ETH', color: '#8a9cf5' },
  solana: { symbol: 'SOL', color: '#14f195' },
  binancecoin: { symbol: 'BNB', color: '#f3ba2f' },
  polygon: { symbol: 'POL', color: '#a47cf3' },
  tron: { symbol: 'TRX', color: '#ff4d5a' },
  ripple: { symbol: 'XRP', color: '#d6dbe4' },
  cardano: { symbol: 'ADA', color: '#4d8bf5' },
  cosmos: { symbol: 'ATOM', color: '#a3a8ff' },
  litecoin: { symbol: 'LTC', color: '#a6b9de' },
  dogecoin: { symbol: 'DOGE', color: '#d9b84a' },
  polkadot: { symbol: 'DOT', color: '#ff4fa3' },
  stellar: { symbol: 'XLM', color: '#c7d0dd' },
  monero: { symbol: 'XMR', color: '#ff7a1a' },
  bitcoincash: { symbol: 'BCH', color: '#4cc947' },
  tether: { symbol: 'USDT', color: '#26a17b' },
  usdc: { symbol: 'USDC', color: '#4b8fe0' },
  arbitrum: { symbol: 'ARB', color: '#4fa3f7' },
  optimism: { symbol: 'OP', color: '#ff5a66' },
  base: { symbol: 'ETH', color: '#3d7bff' },
  avalanche: { symbol: 'AVAX', color: '#ff5c5c' },
  linea: { symbol: 'ETH', color: '#d9e2ec' },
  zksync: { symbol: 'ETH', color: '#a9b4ff' },
  scroll: { symbol: 'ETH', color: '#f5c58a' },
  gnosischain: { symbol: 'xDAI', color: '#3fb58a' },
  celo: { symbol: 'CELO', color: '#f5e663' },
  mantle: { symbol: 'MNT', color: '#d9e2ec' },
  osmosis: { symbol: 'OSMO', color: '#b07cf5' },
  celestia: { symbol: 'TIA', color: '#9b7cf5' },
  injective: { symbol: 'INJ', color: '#4fc3f7' },
  kusama: { symbol: 'KSM', color: '#d9e2ec' },
  near: { symbol: 'NEAR', color: '#d9e2ec' },
  tezos: { symbol: 'XTZ', color: '#4d8bf5' },
  toncoin: { symbol: 'TON', color: '#4fb3ff' },
  sui: { symbol: 'SUI', color: '#6fb8ff' },
  aptos: { symbol: 'APT', color: '#d9e2ec' },
  algorand: { symbol: 'ALGO', color: '#d9e2ec' },
};

/** Shown first in the chain picker and as quick picks under the search bar. */
export const POPULAR_CHAIN_IDS = [
  'bitcoin',
  'ethereum',
  'solana',
  'binancecoin',
  'polygon',
  'tron',
  'ripple',
  'cardano',
  'cosmos',
  'litecoin',
  'dogecoin',
  'polkadot',
  'base',
];

export function chainMeta(id: string, name: string): ChainMeta {
  return CHAIN_META[id] ?? { symbol: getChain(id)?.symbol ?? name.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase(), color: '#8d93a6' };
}

/** The chain's real ticker when one is known (not the placeholder chainMeta derives from the name). */
export function chainTicker(chain: Chain): string | undefined {
  return CHAIN_META[chain.id]?.symbol ?? chain.symbol;
}

/**
 * Picker filter: an exact ticker or name first ("ARB" → Arbitrum), then names starting with the
 * text, then names, ids and tickers containing it. Shared by the site and the extensions.
 */
export function filterChains(chains: Chain[], filter: string): Chain[] {
  const f = filter.trim().toLowerCase();
  const exact: Chain[] = [];
  const starts: Chain[] = [];
  const contains: Chain[] = [];
  for (const c of chains) {
    const name = c.name.toLowerCase();
    const ticker = chainTicker(c)?.toLowerCase();
    if (ticker === f || name === f) exact.push(c);
    else if (name.startsWith(f)) starts.push(c);
    else if (name.includes(f) || c.id.includes(f) || ticker?.startsWith(f)) contains.push(c);
  }
  return [...exact, ...starts, ...contains];
}

/** The "All chains" list in the picker, by name. */
export function chainsByName(chains: Chain[]): Chain[] {
  return [...chains].sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
}
