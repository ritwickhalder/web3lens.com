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
  author: { name: 'Ritwick Halder', url: 'https://www.ritwick.com', github: 'https://github.com/ritwickhalder', youtube: 'https://www.youtube.com/@ritwick.halder/' },
  twitter: '@BSearchEngine',
  facebook: 'https://www.facebook.com/BlockSearchEngine/',
  email: 'web3lensapp@gmail.com',
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
  { label: 'Blog', href: '/blog' },
  { label: 'About', href: '/about' },
];

/**
 * Browser extension store listings. A null `url` falls back to the install steps on /extension (anchor
 * `install-<id>`), so nothing points at a store page that doesn't exist.
 */
export const EXTENSION_STORES = [
  { id: 'chrome', name: 'Chrome', url: 'https://chromewebstore.google.com/detail/blockchain-explorer-web3/bigcbkdjbbmgdicfejljnklmgbpmajlf' as string | null },
  { id: 'firefox', name: 'Firefox', url: 'https://addons.mozilla.org/en-US/firefox/addon/blockchain-explorer-web3-lens/' as string | null },
  { id: 'edge', name: 'Microsoft Edge', url: 'https://microsoftedge.microsoft.com/addons/detail/cadpfffbbdjebfjjibmbbnjbcmajajdd' as string | null },
] as const;

export function extensionInstallHref(id: (typeof EXTENSION_STORES)[number]['id']): string {
  return EXTENSION_STORES.find((s) => s.id === id)?.url ?? `/extension#install-${id}`;
}

/** The developer's other products, cross-linked where they're genuinely relevant (footer, blog). */
export const OTHER_PRODUCTS = [
  { name: 'CentPage', href: 'https://www.centpage.com', description: 'Productivity startpage and browser dashboard' },
  { name: 'SummaryTube', href: 'https://summarytube.com', description: 'Summaries of YouTube videos' },
  { name: 'Super Session Manager', href: 'https://sessionmanager.net', description: 'Save and restore browser sessions and tabs' },
  { name: 'Web Developer Tools', href: 'https://webdevelopertools.dev', description: 'Everyday web developer utilities' },
  { name: 'Web Archive Viewer', href: 'https://webinternetarchive.com', description: 'Search the Wayback Machine and more web archives' },
  { name: 'Edit Page', href: 'https://editpage.dev', description: 'Edit text, CSS and HTML on any webpage visually' },
] as const;

export const MARKET_LINK: NavLink = { label: 'CoinMarketCap', href: 'https://coinmarketcap.com/', external: true };

export const INFO_LINKS: NavLink[] = [
  { label: 'Bookmark this page', href: '/bookmark' },
  { label: 'Terms of use', href: '/terms' },
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Sitemap', href: '/site-map' },
  { label: 'Settings', href: '/settings' },
  { label: 'About', href: '/about' },
];

/** Pro is on sale on this deployment (Paddle's client token is set at build time). Until then /pricing is noindex. */
export const PRO_ON_SALE = !!process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;

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
  { label: 'Pricing', href: '/pricing' },
  { label: 'Browser Extension', href: '/extension' },
  { label: 'Saved Addresses', href: '/saved' },
  { label: 'Settings', href: '/settings' },
  { label: 'Crypto/Blockchain Directory', href: '/directory' },
  { label: 'Blockchain Guide', href: '/blockchain-guide' },
  { label: 'Blog', href: '/blog' },
  { label: 'Bookmark this page', href: '/bookmark' },
  { label: 'Terms of Use', href: '/terms' },
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'About Us Page', href: '/about' },
  { label: 'Contact Us Page', href: '/contact' },
  { label: 'Sitemap', href: '/site-map' },
] as const;
