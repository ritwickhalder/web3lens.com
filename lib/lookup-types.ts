/**
 * Result shapes for native lookups, shared by the server (lib/server/lookup.ts), the API
 * (/api/v1/*), the result pages and the browser extensions. Every section carries its source and
 * fetch time, and says when it is stale (served from cache after a provider failed) or unavailable.
 */
import type { ActivityItem, AddressInfo, BsTxDetail, ContractInfo, TokenHolding } from '@/lib/providers/blockscout';
import type { EvmTx } from '@/lib/providers/evm';
import type { UtxoAccount, UtxoTx, UtxoTxSummary } from '@/lib/providers/esplora';
import type { SolanaAccount, SolanaSignature, SolanaTx, SplHolding } from '@/lib/providers/solana';

export type { ActivityItem, AddressInfo, BsTxDetail, ContractInfo, EvmTx, SolanaAccount, SolanaSignature, SolanaTx, SplHolding, TokenHolding, UtxoAccount, UtxoTx, UtxoTxSummary };

export type Source = { name: string; url?: string };

export type Section<T> =
  | { status: 'ok'; data: T; source: Source; fetchedAt: string; stale: boolean }
  | { status: 'unavailable'; reason: string; source?: Source };

export type ChainRef = { id: string; name: string; symbol: string };

export type DecodedInput = {
  /** `verified` = from the contract's verified ABI (Blockscout); `known` = matched a common signature. */
  via: 'verified' | 'known';
  signature: string;
  params: { name: string; type: string; value: string }[];
};

export type EvmAddressResult = {
  family: 'evm';
  chain: ChainRef;
  address: string;
  /** Set when the query was an ENS name. */
  resolvedFrom?: string;
  ensName: Section<string | null>;
  account: Section<{ balanceWei: string; balance: string; nonce: number; isContract: boolean; codeSize: number; delegatedTo: string | null; block: number }>;
  priceUsd: Section<number>;
  tokens: Section<{ items: TokenHolding[]; more: boolean }>;
  info: Section<AddressInfo>;
  activity: Section<{ txCount: number | null; transfers: number | null; recent: ActivityItem[] }>;
};

export type UtxoAddressResult = {
  family: 'utxo';
  chain: ChainRef;
  address: string;
  account: Section<UtxoAccount & { balance: string }>;
  priceUsd: Section<number>;
  recent: Section<UtxoTxSummary[]>;
};

export type SolanaAddressResult = {
  family: 'solana';
  chain: ChainRef;
  address: string;
  account: Section<SolanaAccount & { balance: string }>;
  priceUsd: Section<number>;
  tokens: Section<{ items: SplHolding[]; partial: boolean }>;
  recent: Section<SolanaSignature[]>;
};

export type AddressResult = EvmAddressResult | UtxoAddressResult | SolanaAddressResult;

export type EvmTxResult = {
  family: 'evm';
  chain: ChainRef;
  hash: string;
  tx: Section<EvmTx | null>;
  detail: Section<BsTxDetail>;
  decoded: DecodedInput[];
  priceUsd: Section<number>;
};

export type UtxoTxResult = { family: 'utxo'; chain: ChainRef; hash: string; tx: Section<UtxoTx | null>; priceUsd: Section<number> };
export type SolanaTxResult = { family: 'solana'; chain: ChainRef; hash: string; tx: Section<SolanaTx | null>; priceUsd: Section<number> };
export type TxResult = EvmTxResult | UtxoTxResult | SolanaTxResult;

export type MultichainRow = {
  chain: ChainRef;
  status: 'ok' | 'unavailable';
  reason?: string;
  balance?: string;
  balanceWei?: string;
  nonce?: number;
  isContract?: boolean;
  usd?: number | null;
  stale?: boolean;
};

export type MultichainResult = { address: string; rows: MultichainRow[]; fetchedAt: string; priceSource: Source | null };

export type LocateRow = { chain: ChainRef; status: 'found' | 'not-found' | 'unavailable'; reason?: string };
export type LocateResult = { hash: string; rows: LocateRow[]; fetchedAt: string };

export type GasRow = {
  chain: ChainRef;
  status: 'ok' | 'unavailable';
  reason?: string;
  gasPriceGwei?: string;
  baseFeeGwei?: string | null;
  priorityFeeGwei?: string | null;
  stale?: boolean;
};
export type GasResult = {
  evm: GasRow[];
  bitcoin: Section<{ fastest: number; halfHour: number; hour: number; economy: number; minimum: number }>;
  prices: Record<string, number>;
  fetchedAt: string;
};

export type { ContractInfo as ContractVerification };

// ---------------------------------------------------------------------------------------------
// Security

export type SanctionsResult = { listed: boolean; lists: string[]; snapshotAt: string; source: string; sourceUrl: string };

export type ContractChecks = {
  verification: {
    blockscout: Section<{ verified: boolean; name: string | null; compiler: string | null; verifiedAt: string | null }>;
    sourcify: Section<{ match: string | null }>;
  };
  proxy: Section<{ implementation: string | null; admin: string | null; beacon: string | null; detectedBy?: string }>;
  owner: Section<{ owner: string | null; ownerIsContract: boolean | null; renounced: boolean } | null>;
  /** State-changing functions in the verified ABI that usually need a privileged caller. */
  privileged: string[] | null;
};

export type GoPlusAddress = { flags: string[]; dataSource: string | null };
export type GoPlusToken = { flags: string[]; buyTax: string | null; sellTax: string | null; openSource: boolean | null } | null;

export type SecurityReport = {
  chain: ChainRef;
  address: string;
  sanctions: SanctionsResult;
  reputation: Section<{ isScam: boolean; reputation: string | null; tags: string[] }>;
  goplus: Section<GoPlusAddress>;
  goplusToken: Section<GoPlusToken>;
  isContract: boolean | null;
  contract: ContractChecks | null;
  /** Count of risk signals across sources; 0 never means "safe". */
  flagCount: number;
};

export type ApprovalRow = {
  token: string;
  symbol: string | null;
  decimals: number | null;
  spender: string;
  spenderLabel: string | null;
  spenderIsContract: boolean | null;
  allowanceRaw: string;
  allowance: string | null;
  unlimited: boolean;
  lastApprovedBlock: number;
};

export type NftApprovalRow = { collection: string; operator: string; operatorLabel: string | null; operatorIsContract: boolean | null };

export type ApprovalsResult = {
  chain: ChainRef;
  owner: string;
  approvals: Section<{ erc20: ApprovalRow[]; nft: NftApprovalRow[]; nftChecked: boolean; logsScanned: number; capped: boolean }>;
  revokeUrl: string;
};
