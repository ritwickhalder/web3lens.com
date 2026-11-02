/**
 * Chains Web3Lens can read natively (balances, transactions) from free public endpoints, and
 * where from. Server-side code may override an RPC with an env var (RPC_URL_<ID>, e.g.
 * RPC_URL_ETHEREUM) for a private provider; those URLs never reach the browser.
 */
import type { QueryKind } from '@/lib/chains';

export type EvmNetwork = {
  family: 'evm';
  /** Chain id in data/chains*.json. */
  id: string;
  chainId: number;
  name: string;
  symbol: string;
  rpc: string[];
  /** Blockscout instance (token holdings, history, contract verification); absent where none is public. */
  blockscout?: string;
  /** Routescan covers this chain (holdings, history, logs) when there's no public Blockscout. */
  routescan?: boolean;
  coingecko?: string;
};

export type UtxoNetwork = {
  family: 'utxo';
  id: string;
  name: string;
  symbol: string;
  /** mempool.space-compatible (Esplora) REST APIs, tried in order. */
  esplora: string[];
  coingecko?: string;
};

export type SolanaNetwork = { family: 'solana'; id: 'solana'; name: string; symbol: string; rpc: string[]; coingecko: string };

export type Network = EvmNetwork | UtxoNetwork | SolanaNetwork;

const pn = (slug: string) => `https://${slug}.publicnode.com`;

export const EVM_NETWORKS: EvmNetwork[] = [
  { family: 'evm', id: 'ethereum', chainId: 1, name: 'Ethereum', symbol: 'ETH', rpc: [pn('ethereum-rpc')], blockscout: 'https://eth.blockscout.com', coingecko: 'ethereum' },
  { family: 'evm', id: 'base', chainId: 8453, name: 'Base', symbol: 'ETH', rpc: [pn('base-rpc'), 'https://mainnet.base.org'], blockscout: 'https://base.blockscout.com', coingecko: 'ethereum' },
  { family: 'evm', id: 'arbitrum', chainId: 42161, name: 'Arbitrum One', symbol: 'ETH', rpc: [pn('arbitrum-one-rpc'), 'https://arb1.arbitrum.io/rpc'], blockscout: 'https://arbitrum.blockscout.com', coingecko: 'ethereum' },
  { family: 'evm', id: 'optimism', chainId: 10, name: 'OP Mainnet', symbol: 'ETH', rpc: [pn('optimism-rpc'), 'https://mainnet.optimism.io'], blockscout: 'https://explorer.optimism.io', coingecko: 'ethereum' },
  { family: 'evm', id: 'polygon', chainId: 137, name: 'Polygon', symbol: 'POL', rpc: [pn('polygon-bor-rpc'), 'https://polygon-rpc.com'], blockscout: 'https://polygon.blockscout.com', coingecko: 'polygon-ecosystem-token' },
  { family: 'evm', id: 'binancecoin', chainId: 56, name: 'BNB Smart Chain', symbol: 'BNB', rpc: [pn('bsc-rpc'), 'https://bsc-dataseed.bnbchain.org'], coingecko: 'binancecoin' },
  { family: 'evm', id: 'avalanche', chainId: 43114, name: 'Avalanche C-Chain', symbol: 'AVAX', rpc: [pn('avalanche-c-chain-rpc'), 'https://api.avax.network/ext/bc/C/rpc'], routescan: true, coingecko: 'avalanche-2' },
  { family: 'evm', id: 'linea', chainId: 59144, name: 'Linea', symbol: 'ETH', rpc: [pn('linea-rpc'), 'https://rpc.linea.build'], coingecko: 'ethereum' },
  { family: 'evm', id: 'zksync', chainId: 324, name: 'zkSync Era', symbol: 'ETH', rpc: ['https://mainnet.era.zksync.io'], blockscout: 'https://zksync.blockscout.com', coingecko: 'ethereum' },
  { family: 'evm', id: 'scroll', chainId: 534352, name: 'Scroll', symbol: 'ETH', rpc: [pn('scroll-rpc'), 'https://rpc.scroll.io'], blockscout: 'https://scroll.blockscout.com', coingecko: 'ethereum' },
  { family: 'evm', id: 'gnosischain', chainId: 100, name: 'Gnosis Chain', symbol: 'xDAI', rpc: [pn('gnosis-rpc'), 'https://rpc.gnosischain.com'], blockscout: 'https://gnosis.blockscout.com', coingecko: 'xdai' },
];

export const UTXO_NETWORKS: UtxoNetwork[] = [
  { family: 'utxo', id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', esplora: ['https://mempool.space/api', 'https://blockstream.info/api'], coingecko: 'bitcoin' },
  { family: 'utxo', id: 'litecoin', name: 'Litecoin', symbol: 'LTC', esplora: ['https://litecoinspace.org/api'], coingecko: 'litecoin' },
];

export const SOLANA_NETWORK: SolanaNetwork = {
  family: 'solana',
  id: 'solana',
  name: 'Solana',
  symbol: 'SOL',
  rpc: ['https://solana-rpc.publicnode.com', 'https://api.mainnet-beta.solana.com'],
  coingecko: 'solana',
};

export const NETWORKS: Network[] = [...EVM_NETWORKS, ...UTXO_NETWORKS, SOLANA_NETWORK];
const BY_ID = new Map<string, Network>(NETWORKS.map((n) => [n.id, n]));

export function getNetwork(id: string): Network | undefined {
  return BY_ID.get(id);
}

export function getEvmNetwork(id: string): EvmNetwork | undefined {
  const n = BY_ID.get(id);
  return n?.family === 'evm' ? n : undefined;
}

/** Whether Web3Lens can show its own result page for this chain and query type. */
export function hasNativeSupport(chainId: string, kind: QueryKind): boolean {
  const n = BY_ID.get(chainId);
  if (!n) return false;
  if (kind === 'address' || kind === 'tx') return true;
  // ENS names resolve on Ethereum.
  return kind === 'name' && chainId === 'ethereum';
}
