/** Blog categories. Each post's frontmatter `category` must be one of these slugs (tested). */
export const BLOG_CATEGORIES = [
  {
    slug: 'explorer-basics',
    name: 'Explorer basics',
    description: 'How block explorers work, how to pick the right one for a chain, and how Bitcoin, Ethereum and EVM explorers differ.',
  },
  {
    slug: 'addresses-and-transactions',
    name: 'Addresses & transactions',
    description: 'Recognising address and hash formats, checking checksums, reading transactions and resolving ENS names.',
  },
  {
    slug: 'browser-extension',
    name: 'Browser extension',
    description: 'Getting the most from the Web3Lens extension for Chrome, Firefox and Edge: right-click lookups, page scans and privacy.',
  },
  {
    slug: 'developer-tools',
    name: 'Developer tools',
    description: 'Unit conversion, calldata and raw transaction decoding, batch searches, CSV exports and multichain workflows.',
  },
  {
    slug: 'security',
    name: 'Security & risk',
    description: 'Sanctions screening, scam reports, contract checks and token approvals: what risk checks can and cannot tell you.',
  },
] as const;

export type BlogCategorySlug = (typeof BLOG_CATEGORIES)[number]['slug'];

export function getCategory(slug: string) {
  return BLOG_CATEGORIES.find((c) => c.slug === slug);
}

export const BLOG = {
  title: 'Web3Lens Blog',
  description:
    'Practical guides to blockchain explorers, addresses, transactions, risk checks and developer tools, written by the developer who builds Web3Lens.',
  wordsPerMinute: 220,
} as const;

/** Blog guides linked from product pages (internal linking). Slugs are checked by the blog tests. */
export const GUIDES_FOR_PAGE: Record<string, string[]> = {
  '/tools': ['web3lens-developer-tools-guide', 'multichain-blockchain-explorer-for-developers', 'verify-crypto-wallet-address-checksums'],
  '/tools/unit-converter': ['web3lens-developer-tools-guide', 'multichain-blockchain-explorer-for-developers'],
  '/tools/address-validator': ['verify-crypto-wallet-address-checksums', 'identify-blockchain-addresses-and-transaction-hashes'],
  '/tools/hex-converter': ['web3lens-developer-tools-guide', 'find-and-investigate-blockchain-transactions'],
  '/tools/timestamp-converter': ['web3lens-developer-tools-guide', 'find-and-investigate-blockchain-transactions'],
  '/tools/gas-calculator': ['web3lens-developer-tools-guide', 'bitcoin-ethereum-evm-block-explorers-explained'],
  '/tools/abi-decoder': ['find-and-investigate-blockchain-transactions', 'web3lens-developer-tools-guide'],
  '/tools/transaction-decoder': ['find-and-investigate-blockchain-transactions', 'web3lens-developer-tools-guide'],
  '/batch': ['bulk-blockchain-search-csv-export', 'blockchain-address-risk-checks'],
  '/extension': ['web3lens-browser-extension-features-privacy', 'browser-context-menu-blockchain-lookups', 'scan-webpages-for-blockchain-addresses'],
  '/explorer': ['how-to-find-the-right-block-explorer', 'exploring-700-blockchain-networks', 'what-is-a-blockchain-explorer'],
  '/explorer/[chain]': ['how-to-find-the-right-block-explorer', 'bitcoin-ethereum-evm-block-explorers-explained', 'identify-blockchain-addresses-and-transaction-hashes'],
  '/blockchain-guide': ['what-is-a-blockchain-explorer', 'identify-blockchain-addresses-and-transaction-hashes', 'ens-domains-wallet-addresses-web3-identity'],
};

/** `::cta <preset>` directives available in posts (rendered by components/blog/ArticleCta.tsx). */
export const CTA_PRESETS = ['search', 'tools', 'batch', 'risk', 'extension'] as const;
export type CtaPreset = (typeof CTA_PRESETS)[number];

/** `icon:` values for post covers (components/blog/PostCover.tsx). */
export const COVER_ICON_NAMES = ['book', 'code', 'compass', 'cursor', 'fingerprint', 'identity', 'search', 'puzzle', 'receipt', 'scan', 'seal', 'shield', 'stack', 'table', 'tree', 'wrench'] as const;
export type CoverIcon = (typeof COVER_ICON_NAMES)[number];
