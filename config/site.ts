/** Site-wide constants: brand, canonical URL, navigation and donation details. */

export const SITE = {
  name: 'Web3Lens',
  domain: 'Web3Lens.com',
  url: 'https://web3lens.com',
  title: 'Web3Lens - Blockchain Explorer | Blockchain Search Engine',
  tagline: 'Look up anything, on any chain.',
  description:
    "Web3Lens.com is a search engine and blockchain explorer for all cryptocurrencies. You can search any cryptocurrency addresses, transaction hash, history / details, data, blocks, etc. It's also a web directory of all crypto related groups, news channels and communities.",
  shortDescription:
    'Web3Lens.com is a search engine and blockchain explorer for all cryptocurrencies. You can search any cryptocurrency addresses, transaction hash, history / details, data, blocks, etc.',
  keywords: ['Blockchain Explorer', 'Blockchain Search Engine', 'Cryptocurrency Search Engine', 'Cryptocurrency Explorer'],
  author: { name: 'Ritwick Halder', url: 'https://www.ritwick.com' },
  twitter: '@BSearchEngine',
  facebook: 'https://www.facebook.com/BlockSearchEngine/',
} as const;

export const DONATION_ADDRESSES = [
  { label: 'Ethereum / Polygon', address: '0x0E678aCf9988e284f448C6224Ea36bb9E9d56803' },
  { label: 'Cosmos', address: 'cosmos18hjgges2wkmntaewy84974yqdeh45u40z2wxug' },
] as const;

export type NavLink = { label: string; href: string; external?: boolean; description?: string };

export const NEWS_LINKS: NavLink[] = [
  { label: 'Reddit - Bitcoin', href: 'https://www.reddit.com/r/Bitcoin/' },
  { label: 'Reddit - Cryptocurrency', href: 'https://www.reddit.com/r/CryptoCurrency/' },
  { label: 'Twitter - Cryptocurrency', href: 'https://twitter.com/search?q=cryptocurrency' },
  { label: 'Coin Telegraph', href: 'https://cointelegraph.com/' },
  { label: 'CoinDesk', href: 'https://www.coindesk.com' },
  { label: 'Cryptopanic', href: 'https://cryptopanic.com/' },
  { label: 'CoinSpectator', href: 'https://coinspectator.com/' },
  { label: 'BitcoinTalk Forum', href: 'https://bitcointalk.org/index.php' },
  { label: 'CCN Altcoin News', href: 'https://www.ccn.com/altcoin-news/' },
  { label: 'Bitcoinist.com', href: 'https://bitcoinist.com/' },
  { label: 'Cryptonews.com', href: 'https://cryptonews.com/' },
  { label: 'Tradingview - Cryptocurrencies', href: 'https://www.tradingview.com/markets/cryptocurrencies/?sort=recent' },
  { label: 'Livemint Cryptocurrency News', href: 'https://www.livemint.com/Search/Link/Keyword/cryptocurrency' },
  { label: 'Investing Cryptocurrency News', href: 'https://www.investing.com/news/cryptocurrency-news' },
  { label: 'Entrepreneur Cryptocurrency News', href: 'https://www.entrepreneur.com/topic/cryptocurrency' },
].map((l) => ({ ...l, external: true }));

/** Primary navigation. */
export const MAIN_NAV: NavLink[] = [
  { label: 'Search', href: '/' },
  { label: 'Tools', href: '/tools' },
  { label: 'Saved', href: '/saved' },
  { label: 'Extension', href: '/extension' },
  { label: 'Directory', href: '/directory' },
  { label: 'Learn', href: '/blockchain-guide' },
  { label: 'About', href: '/about' },
];

export const MARKET_LINK: NavLink = { label: 'CoinMarketCap', href: 'https://coinmarketcap.com/', external: true };

export const INFO_LINKS: NavLink[] = [
  { label: 'Bookmark this page', href: '/bookmark' },
  { label: 'Terms of use', href: '/terms' },
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Sitemap', href: '/site-map' },
  { label: 'Settings', href: '/settings' },
  { label: 'About', href: '/about' },
];

/** Internal pages, in sitemap order. Shared by the HTML sitemap and app/sitemap.ts. */
export const PAGES = [
  { label: 'Index/Home Page', href: '/' },
  { label: 'Search', href: '/search' },
  { label: 'Block Explorers by Chain', href: '/explorer' },
  { label: 'Gas Tracker', href: '/gas' },
  { label: 'Developer Tools', href: '/tools' },
  { label: 'Unit Converter', href: '/tools/unit-converter' },
  { label: 'Address Validator', href: '/tools/address-validator' },
  { label: 'Hex, Text and Hashes', href: '/tools/hex-converter' },
  { label: 'Timestamp Converter', href: '/tools/timestamp-converter' },
  { label: 'Gas and Fee Calculator', href: '/tools/gas-calculator' },
  { label: 'Calldata and ABI Decoder', href: '/tools/abi-decoder' },
  { label: 'Raw Transaction Decoder', href: '/tools/transaction-decoder' },
  { label: 'Batch Address Search', href: '/batch' },
  { label: 'Browser Extension', href: '/extension' },
  { label: 'Saved Addresses', href: '/saved' },
  { label: 'Settings', href: '/settings' },
  { label: 'Crypto/Blockchain Directory', href: '/directory' },
  { label: 'Blockchain Guide', href: '/blockchain-guide' },
  { label: 'Bookmark this page', href: '/bookmark' },
  { label: 'Terms of Use', href: '/terms' },
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'About Us Page', href: '/about' },
  { label: 'Contact Us Page', href: '/contact' },
  { label: 'Sitemap', href: '/site-map' },
] as const;
