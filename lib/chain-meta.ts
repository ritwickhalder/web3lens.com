/**
 * Display details for the chains people pick most. Everything else in data/chains.json
 * gets a neutral glyph. Colours are each project's brand colour, nudged for a dark background.
 */
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
];

export function chainMeta(id: string, name: string): ChainMeta {
  return CHAIN_META[id] ?? { symbol: name.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase(), color: '#8d93a6' };
}
