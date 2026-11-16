/**
 * Public changelog shown on /changelog, newest first. Write for users: what changed for them, not how. Only list
 * what is live; Pro and accounts get their entry when TODO.md §1 is done and they are switched on. Extension
 * releases also go in CHANGELOG.md (the store submission notes).
 */
export type ChangelogEntry = {
  /** YYYY-MM-DD */
  date: string;
  title: string;
  /** Extension version, when the entry is an extension release. */
  version?: string;
  area: 'Website' | 'Extension' | 'Website and extension';
  items: string[];
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: '2026-11-12',
    title: 'A friendlier contact page',
    area: 'Website',
    items: ['The contact page fits on one screen and says what to include for a missing chain, a broken explorer link or a bug report.', 'Buttons and links show a pointer cursor everywhere.'],
  },
  {
    date: '2026-11-09',
    title: '123 more chains, and every explorer checked',
    area: 'Website and extension',
    items: [
      'Every chain was audited: 123 current chains added, explorer links fixed, and chains with nothing left to search retired.',
      'The "Add to browser" buttons now match your browser: Chrome, Firefox or Edge.',
    ],
  },
  {
    date: '2026-11-06',
    title: 'Six illustrated how-to guides',
    area: 'Website',
    items: ['New blog guides walk through common lookups step by step.', 'The gas tracker no longer shifts while prices load, with clearer link contrast.'],
  },
  {
    date: '2026-11-04',
    title: 'Extension 1.0.1 on Chrome, Firefox and Edge',
    version: '1.0.1',
    area: 'Extension',
    items: ['Web3Lens is published on the Chrome Web Store, Firefox Add-ons and Edge Add-ons.', 'A narrower 720px popup that fits more screens.'],
  },
  {
    date: '2026-11-03',
    title: 'Blog, and the extension in 15 languages',
    area: 'Website and extension',
    items: ['A blog with 15 guides to block explorers, addresses and transactions.', 'The browser extension speaks 15 languages.', 'Faster pages and richer search results.'],
  },
  {
    date: '2026-11-02',
    title: 'Web3Lens becomes a multichain lookup tool',
    area: 'Website and extension',
    items: [
      'Balances, tokens, transaction details and risk checks right on Web3Lens for the major chains, with the source and time of every answer.',
      'A page for every chain listing its block explorers, plus a live gas tracker.',
      'Developer tools: unit converter, calldata and transaction decoders, checksum and timestamp tools, QR codes.',
      'Off-chain ENS names and wider token coverage.',
      'A light theme for the site and the extension.',
      'The browser extension: right-click any address, or type w3 in the address bar.',
    ],
  },
  {
    date: '2026-11-01',
    title: 'New design and smart search',
    area: 'Website',
    items: ['Rebuilt from the ground up with one search box that recognises addresses, hashes, blocks and names as you type.', 'A cleaner design with coin logos for every major chain.'],
  },
];
