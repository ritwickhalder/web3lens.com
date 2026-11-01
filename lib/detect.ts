/**
 * Guesses what a pasted query is (address, transaction hash, name, block) and which chains it
 * could belong to, so people don't have to pick a chain first. Pure and dependency-free so the
 * browser extensions can reuse it (ROADMAP Phase 5).
 *
 * Patterns are checked in order; the first match wins. Chain ids refer to data/chains.json.
 */
export type Detection = {
  kind: 'address' | 'transaction' | 'name' | 'block';
  /** Short human label, e.g. "EVM address". */
  label: string;
  /** Candidate chain ids, best guess first. */
  chains: string[];
};

const B58 = '1-9A-HJ-NP-Za-km-z';
const EVM = ['ethereum', 'binancecoin', 'polygon', 'ethereumclassic'];

const RULES: { test: RegExp; detection: Detection }[] = [
  { test: /^0x[0-9a-f]{40}$/i, detection: { kind: 'address', label: 'EVM address', chains: EVM } },
  { test: /^0x[0-9a-f]{64}$/i, detection: { kind: 'transaction', label: 'EVM transaction hash', chains: EVM } },
  { test: /^[a-z0-9-]+(\.[a-z0-9-]+)*\.eth$/i, detection: { kind: 'name', label: 'ENS name', chains: ['ethereum'] } },
  { test: /^[a-z0-9-]+\.sol$/i, detection: { kind: 'name', label: 'Solana name', chains: ['solana'] } },
  { test: /^bc1[02-9ac-hj-np-z]{11,87}$/i, detection: { kind: 'address', label: 'Bitcoin address', chains: ['bitcoin'] } },
  { test: /^ltc1[02-9ac-hj-np-z]{11,87}$/i, detection: { kind: 'address', label: 'Litecoin address', chains: ['litecoin'] } },
  {
    test: /^(bitcoincash:)?[qp][02-9ac-hj-np-z]{41}$/i,
    detection: { kind: 'address', label: 'Bitcoin Cash address', chains: ['bitcoincash'] },
  },
  { test: /^cosmos1[02-9ac-hj-np-z]{38}$/, detection: { kind: 'address', label: 'Cosmos address', chains: ['cosmos'] } },
  { test: /^(addr1|stake1)[02-9ac-hj-np-z]{50,}$/, detection: { kind: 'address', label: 'Cardano address', chains: ['cardano'] } },
  { test: new RegExp(`^T[${B58}]{33}$`), detection: { kind: 'address', label: 'Tron address', chains: ['tron'] } },
  { test: new RegExp(`^r[${B58}]{24,34}$`), detection: { kind: 'address', label: 'XRP address', chains: ['ripple'] } },
  {
    test: new RegExp(`^D[5-9A-HJ-NP-U][${B58}]{32}$`),
    detection: { kind: 'address', label: 'Dogecoin address', chains: ['dogecoin'] },
  },
  { test: new RegExp(`^[LM][${B58}]{26,33}$`), detection: { kind: 'address', label: 'Litecoin address', chains: ['litecoin'] } },
  {
    test: new RegExp(`^[13][${B58}]{25,34}$`),
    detection: { kind: 'address', label: 'Bitcoin address', chains: ['bitcoin', 'bitcoincash'] },
  },
  { test: /^G[A-Z2-7]{55}$/, detection: { kind: 'address', label: 'Stellar address', chains: ['stellar'] } },
  {
    test: /^[0-9a-f]{64}$/i,
    detection: { kind: 'transaction', label: 'Transaction hash', chains: ['bitcoin', 'litecoin', 'bitcoincash', 'dogecoin'] },
  },
  {
    test: new RegExp(`^[${B58}]{86,88}$`),
    detection: { kind: 'transaction', label: 'Solana signature', chains: ['solana'] },
  },
  { test: new RegExp(`^[${B58}]{32,44}$`), detection: { kind: 'address', label: 'Solana address', chains: ['solana'] } },
  { test: /^\d{1,10}$/, detection: { kind: 'block', label: 'Block number', chains: ['bitcoin', 'ethereum'] } },
];

export function detectQuery(query: string): Detection | null {
  const q = query.trim();
  if (q.length < 1) return null;
  for (const { test, detection } of RULES) {
    if (test.test(q)) return detection;
  }
  return null;
}

/** Example queries shown on the home page; each must be detected as `expect`. */
export const EXAMPLES = [
  { query: 'vitalik.eth', expect: 'ENS name', note: 'ENS name' },
  { query: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', expect: 'EVM address', note: 'USDC contract' },
  { query: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', expect: 'Bitcoin address', note: 'Bitcoin genesis address' },
  // Not a Tron example yet: the legacy Tron route always opens /transaction/ (fixed in ROADMAP Phase 1).
  { query: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh', expect: 'XRP address', note: 'XRP genesis account' },
] as const;
