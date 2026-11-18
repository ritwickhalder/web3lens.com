/**
 * English metadata for the pages published in every language. The English routes use it as it is; the `/<locale>`
 * routes run each string through `tx` (placeholders: `{chains}` = the chain count label).
 */
export const HOME_META = {
  description:
    'Search any crypto address, transaction hash, block or ENS name on {chains} blockchains. Web3Lens detects the chain, verifies checksums and finds the right explorer.',
};

export const PRICING_META = {
  title: 'Pricing: Free and Pro',
  description:
    'Web3Lens is free for searching, explorers, developer tools and safety checks. Pro adds large batches with balances, cloud-synced saved addresses, investigations, JSON export and API keys.',
};
