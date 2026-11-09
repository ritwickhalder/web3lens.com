import extraJson from '@/data/chains-extra.json';
import chainsJson from '@/data/chains.json';
import retiredJson from '@/data/chains-retired.json';
import explorersJson from '@/data/explorers.json';

/**
 * How a chain's search is handed off to an outside block explorer (the legacy, one-template routing).
 * - `url`: open `url` with `{q}` replaced by the query
 * - `form`: submit a form with the query as `param` (some explorers only accept POST)
 * - `google`: no known explorer; search Google for `terms` plus the query
 */
export type Explorer =
  | { kind: 'url'; url: string }
  | { kind: 'form'; action: string; method: 'get' | 'post'; param: string }
  | { kind: 'google'; terms: string };

/** What a query is, for picking an explorer page. `search` = we don't know, use the explorer's search. */
export type QueryKind = 'address' | 'tx' | 'block' | 'name' | 'search';

/** One explorer for a chain with a URL template per page type (data/explorers.json). */
export type ExplorerRoute = {
  name: string;
  home: string;
  address?: string;
  tx?: string;
  block?: string;
  /** Name-service lookups (ENS etc.). */
  names?: string;
  search?: string;
};

export type Chain = {
  id: string;
  name: string;
  /** The single explorer template (the pre-2026 routing); per-type routes in data/explorers.json take precedence. */
  explorer: Explorer;
  /** The explorer is a substitute (another chain's explorer or a general one); shown as "limited". */
  fallback?: boolean;
  /** Ticker, where chain-meta has none. */
  symbol?: string;
  /** EIP-155 chain id for EVM chains. */
  evmChainId?: number;
};

/** A chain removed from the list because nothing is left to search (data/chains-retired.json). */
export type RetiredChain = { id: string; name: string; reason: string; retiredAt: string };

/** The original chain list (hand-edited since the November 2026 audit; data/chains.json), in its original order. */
export const LEGACY_CHAINS = chainsJson as Chain[];
/** Chains added since the migration (data/chains-extra.json). */
export const EXTRA_CHAINS = extraJson as Chain[];
export const CHAINS: Chain[] = [...LEGACY_CHAINS, ...EXTRA_CHAINS];
/** A count as shown to people: rounded down to the hundred ("700+") rather than an exact, odd-looking number. */
export function countLabel(n: number): string {
  return n < 100 ? String(n) : `${Math.floor(n / 100) * 100}+`;
}
/** The chain count for copy: "700+". */
export const CHAIN_COUNT_LABEL = countLabel(CHAINS.length);

const BY_ID = new Map(CHAINS.map((c) => [c.id, c]));

export function getChain(id: string): Chain | undefined {
  return BY_ID.get(id);
}

const RETIRED = new Map((retiredJson as { chains: RetiredChain[] }).chains.map((c) => [c.id, c]));

/** Why a chain id that used to be listed was removed, for old links and saved items. */
export function getRetiredChain(id: string): RetiredChain | undefined {
  return RETIRED.get(id);
}

const EXPLORERS = explorersJson as { inherit: Record<string, string>; routes: Record<string, ExplorerRoute[]> };
const ROUTES = EXPLORERS.routes;

/**
 * Legacy template prefixes whose chains are tokens on another chain and borrow its per-type routes:
 * 400+ ERC-20 tokens pointed at Etherscan search, so their addresses and transactions are Ethereum ones.
 */
const INHERIT_BY_PREFIX = Object.entries(EXPLORERS.inherit);

/** Tokens with their own routes whose addresses and hashes belong to other chains. */
const TOKEN_HOSTS: Record<string, string[]> = {
  usdc: ['ethereum'],
  tether: ['ethereum', 'tron'],
};

function inheritedFrom(chain: Chain): string | undefined {
  if (ROUTES[chain.id] || chain.explorer.kind !== 'url') return undefined;
  const url = chain.explorer.url;
  return INHERIT_BY_PREFIX.find(([prefix]) => url.startsWith(prefix))?.[1];
}

/** The chain whose entry in data/explorers.json supplies `chain`'s routes (itself, or the host chain for tokens). */
export function routeOwnerId(chain: Chain): string | undefined {
  return ROUTES[chain.id] ? chain.id : inheritedFrom(chain);
}

/** Explorers with per-type templates for this chain, default first. Empty when only the legacy explorer is known. */
export function explorerRoutes(chain: Chain): ExplorerRoute[] {
  const own = ROUTES[chain.id];
  if (own) return own;
  const parent = inheritedFrom(chain);
  return parent ? (ROUTES[parent] ?? []) : [];
}

/**
 * Chain ids whose address/hash formats apply to `chain`: itself, plus the host chain for tokens
 * (an ERC-20 token's addresses are Ethereum addresses), plus Ethereum for every EVM chain, so a
 * 0x address opens the address page on chains that aren't in the detector's short candidate list.
 */
export function formatChainIds(chain: Chain): string[] {
  const parent = inheritedFrom(chain);
  return [chain.id, ...(TOKEN_HOSTS[chain.id] ?? []), ...(parent ? [parent] : []), ...(chain.evmChainId && chain.id !== 'ethereum' ? ['ethereum'] : [])];
}

export function allExplorerRoutes(): Record<string, ExplorerRoute[]> {
  return ROUTES;
}
