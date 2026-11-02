/** Developer tools: one entry per /tools/<slug> page (also listed in the extensions). */
export const TOOLS = [
  {
    slug: 'unit-converter',
    title: 'Unit converter',
    short: 'wei · gwei · ETH, sats · BTC, any decimals',
    description: 'Convert between wei, gwei and ether, satoshis and bitcoin, lamports and SOL, or any token decimals, exactly (no rounding).',
  },
  {
    slug: 'address-validator',
    title: 'Address validator',
    short: 'Checksums for 25+ address formats',
    description: 'Check whether an address is valid for its chain: EIP-55 checksums, base58check, bech32, CashAddr, SS58, Stellar and TON, plus the OFAC sanctions snapshot.',
  },
  {
    slug: 'hex-converter',
    title: 'Hex, text and hashes',
    short: 'hex ↔ decimal, UTF-8, keccak256, SHA-256',
    description: 'Convert hex to decimal and back, text to hex, read int256 words, and hash text or bytes with keccak256 and SHA-256 (with function selectors).',
  },
  {
    slug: 'timestamp-converter',
    title: 'Timestamp converter',
    short: 'Unix seconds, ms, hex ↔ date',
    description: 'Convert Unix timestamps (seconds, milliseconds, hex block timestamps) to dates in UTC and your time zone, and dates back to timestamps.',
  },
  {
    slug: 'gas-calculator',
    title: 'Gas and fee calculator',
    short: 'EIP-1559 fees with live gas prices',
    description: 'Work out transaction fees from gas limit, base fee and tip, with live gas prices for 11 EVM chains and Bitcoin fee rates.',
  },
  {
    slug: 'abi-decoder',
    title: 'Calldata and ABI decoder',
    short: 'Decode or encode function calls',
    description: 'Decode Ethereum calldata with a contract ABI, a function signature or the built-in list of common functions, and encode calls from a signature.',
  },
  {
    slug: 'transaction-decoder',
    title: 'Raw transaction decoder',
    short: 'Signed tx → fields and sender',
    description: 'Decode a signed raw EVM transaction (legacy, EIP-1559, blob, EIP-7702) locally and recover the sender, without broadcasting it.',
  },
] as const;

export type ToolSlug = (typeof TOOLS)[number]['slug'];
