/** Blockscout v2 REST API (free, no key): token holdings, history, labels, contract verification. */
import { fetchJson } from '@/lib/providers/http';
import { formatUnits } from '@/lib/tools/units';

const SRC = 'Blockscout';

type BsAddressRef = { hash: string; name?: string | null; is_contract?: boolean; ens_domain_name?: string | null };

export type TokenHolding = {
  contract: string;
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  balanceRaw: string;
  /** Decimal string when decimals are known. */
  balance: string | null;
  /** USD price per token as reported by Blockscout, when it has one. */
  priceUsd: number | null;
  /** Blockscout flags tokens it considers scams/spam. */
  flagged: boolean;
  type: string;
};

type BsTokenItem = {
  token: {
    address_hash?: string;
    address?: string;
    name: string | null;
    symbol: string | null;
    decimals: string | null;
    exchange_rate: string | null;
    type: string;
    reputation?: string | null;
    is_scam?: boolean;
  };
  value: string;
};

export async function getTokens(base: string, address: string): Promise<{ items: TokenHolding[]; more: boolean }> {
  const res = await fetchJson<{ items: BsTokenItem[]; next_page_params: unknown }>(SRC, `${base}/api/v2/addresses/${address}/tokens?type=ERC-20`, {
    timeoutMs: 8000,
  });
  const items = res.items.map((i): TokenHolding => {
    const decimals = i.token.decimals === null ? null : Number(i.token.decimals);
    return {
      contract: i.token.address_hash ?? i.token.address ?? '',
      name: i.token.name,
      symbol: i.token.symbol,
      decimals,
      balanceRaw: i.value,
      balance: decimals === null || !Number.isFinite(decimals) ? null : formatUnits(BigInt(i.value), decimals),
      priceUsd: i.token.exchange_rate ? Number(i.token.exchange_rate) : null,
      flagged: i.token.is_scam === true || (i.token.reputation != null && i.token.reputation !== 'ok'),
      type: i.token.type,
    };
  });
  return { items, more: Boolean(res.next_page_params) };
}

export type AddressInfo = {
  isContract: boolean;
  isVerified: boolean;
  isScam: boolean;
  reputation: string | null;
  name: string | null;
  ensName: string | null;
  tags: string[];
  proxyType: string | null;
  implementations: { address: string; name: string | null }[];
  creator: string | null;
  creationTx: string | null;
  token: { name: string | null; symbol: string | null; type: string; holders: string | null } | null;
};

type BsAddress = {
  is_contract: boolean;
  is_verified: boolean | null;
  is_scam?: boolean;
  reputation?: string | null;
  name: string | null;
  ens_domain_name: string | null;
  public_tags?: { label?: string; display_name?: string }[];
  metadata?: { tags?: { name: string; tagType?: string }[] } | null;
  proxy_type: string | null;
  implementations?: { address_hash?: string; address?: string; name: string | null }[];
  creator_address_hash: string | null;
  creation_transaction_hash?: string | null;
  creation_tx_hash?: string | null;
  token: { name: string | null; symbol: string | null; type: string; holders_count?: string; holders?: string } | null;
};

export async function getAddressInfo(base: string, address: string): Promise<AddressInfo> {
  const a = await fetchJson<BsAddress>(SRC, `${base}/api/v2/addresses/${address}`, { timeoutMs: 8000 });
  const tags = [
    ...(a.public_tags ?? []).map((t) => t.display_name ?? t.label ?? ''),
    ...(a.metadata?.tags ?? []).filter((t) => t.tagType !== 'protocol' || true).map((t) => t.name),
  ].filter(Boolean);
  return {
    isContract: a.is_contract,
    isVerified: Boolean(a.is_verified),
    isScam: a.is_scam === true,
    reputation: a.reputation ?? null,
    name: a.name,
    ensName: a.ens_domain_name,
    tags: [...new Set(tags)].slice(0, 12),
    proxyType: a.proxy_type,
    implementations: (a.implementations ?? []).map((i) => ({ address: i.address_hash ?? i.address ?? '', name: i.name })),
    creator: a.creator_address_hash,
    creationTx: a.creation_transaction_hash ?? a.creation_tx_hash ?? null,
    token: a.token
      ? { name: a.token.name, symbol: a.token.symbol, type: a.token.type, holders: a.token.holders_count ?? a.token.holders ?? null }
      : null,
  };
}

export async function getCounters(base: string, address: string): Promise<{ txCount: number | null; transfers: number | null }> {
  const c = await fetchJson<{ transactions_count?: string; token_transfers_count?: string }>(SRC, `${base}/api/v2/addresses/${address}/counters`, {
    timeoutMs: 8000,
  });
  return {
    txCount: c.transactions_count ? Number(c.transactions_count) : null,
    transfers: c.token_transfers_count ? Number(c.token_transfers_count) : null,
  };
}

export type ActivityItem = {
  hash: string;
  timestamp: string | null;
  from: string;
  to: string | null;
  valueWei: string;
  method: string | null;
  status: 'success' | 'failed' | 'pending';
  feeWei: string | null;
};

type BsTx = {
  hash: string;
  timestamp: string | null;
  from: BsAddressRef;
  to: BsAddressRef | null;
  created_contract?: BsAddressRef | null;
  value: string;
  method: string | null;
  status: string | null;
  result?: string;
  fee?: { value: string | null } | null;
};

export async function getRecentTransactions(base: string, address: string, limit = 10): Promise<ActivityItem[]> {
  const res = await fetchJson<{ items: BsTx[] }>(SRC, `${base}/api/v2/addresses/${address}/transactions`, { timeoutMs: 8000 });
  return res.items.slice(0, limit).map((t) => ({
    hash: t.hash,
    timestamp: t.timestamp,
    from: t.from.hash,
    to: t.to?.hash ?? t.created_contract?.hash ?? null,
    valueWei: t.value,
    method: t.method,
    status: t.status === 'ok' ? 'success' : t.status === 'error' ? 'failed' : 'pending',
    feeWei: t.fee?.value ?? null,
  }));
}

export type ContractInfo = {
  isVerified: boolean;
  fullyVerified: boolean;
  name: string | null;
  compiler: string | null;
  language: string | null;
  license: string | null;
  verifiedAt: string | null;
  viaSourcify: boolean;
  proxyType: string | null;
  implementations: { address: string; name: string | null }[];
  abi: unknown[] | null;
};

type BsContract = {
  is_verified?: boolean;
  is_fully_verified?: boolean;
  name?: string | null;
  compiler_version?: string | null;
  language?: string | null;
  license_type?: string | null;
  verified_at?: string | null;
  is_verified_via_sourcify?: boolean;
  proxy_type?: string | null;
  implementations?: { address_hash?: string; address?: string; name: string | null }[];
  abi?: unknown[] | null;
};

export async function getContract(base: string, address: string): Promise<ContractInfo> {
  const c = await fetchJson<BsContract>(SRC, `${base}/api/v2/smart-contracts/${address}`, { timeoutMs: 8000 });
  return {
    isVerified: Boolean(c.is_verified),
    fullyVerified: Boolean(c.is_fully_verified),
    name: c.name ?? null,
    compiler: c.compiler_version ?? null,
    language: c.language ?? null,
    license: c.license_type ?? null,
    verifiedAt: c.verified_at ?? null,
    viaSourcify: Boolean(c.is_verified_via_sourcify),
    proxyType: c.proxy_type ?? null,
    implementations: (c.implementations ?? []).map((i) => ({ address: i.address_hash ?? i.address ?? '', name: i.name })),
    abi: Array.isArray(c.abi) ? c.abi : null,
  };
}

export type BsLog = { address: string; topics: (string | null)[]; data: string; blockNumber: string; transactionHash: string; timeStamp: string };

/** Etherscan-compatible log search (Blockscout caps it at 1000 results). */
export async function getLogs(base: string, topics: { topic0: string; topic1?: string; topic2?: string }): Promise<{ logs: BsLog[]; capped: boolean }> {
  const params = new URLSearchParams({ module: 'logs', action: 'getLogs', fromBlock: '0', toBlock: 'latest', topic0: topics.topic0 });
  if (topics.topic1) {
    params.set('topic1', topics.topic1);
    params.set('topic0_1_opr', 'and');
  }
  if (topics.topic2) {
    params.set('topic2', topics.topic2);
    params.set('topic0_2_opr', 'and');
  }
  const res = await fetchJson<{ status: string; message: string; result: BsLog[] | null }>(SRC, `${base}/api?${params}`, { timeoutMs: 25000 });
  const logs = Array.isArray(res.result) ? res.result : [];
  return { logs, capped: logs.length >= 1000 };
}

export type BsTxDetail = {
  method: string | null;
  decoded: { method_call: string; method_id: string; parameters: { name: string; type: string; value: unknown }[] } | null;
  tokenTransfers: { from: string; to: string; token: { address: string; symbol: string | null; decimals: number | null; type: string }; amount: string | null }[];
  l1Fee: string | null;
};

type BsTxRaw = {
  method: string | null;
  decoded_input: BsTxDetail['decoded'];
  token_transfers?: {
    from: BsAddressRef;
    to: BsAddressRef;
    token: { address_hash?: string; address?: string; symbol: string | null; decimals: string | null; type: string };
    total: { value?: string; decimals?: string | null } | null;
  }[];
  fee?: { value: string | null };
  l1_fee?: string | null;
};

export async function getTransactionDetail(base: string, hash: string): Promise<BsTxDetail> {
  const t = await fetchJson<BsTxRaw>(SRC, `${base}/api/v2/transactions/${hash}`, { timeoutMs: 8000 });
  return {
    method: t.method,
    decoded: t.decoded_input,
    tokenTransfers: (t.token_transfers ?? []).slice(0, 50).map((tt) => {
      const decimals = tt.token.decimals === null ? null : Number(tt.token.decimals);
      return {
        from: tt.from.hash,
        to: tt.to.hash,
        token: { address: tt.token.address_hash ?? tt.token.address ?? '', symbol: tt.token.symbol, decimals, type: tt.token.type },
        amount: tt.total?.value != null && decimals !== null ? formatUnits(BigInt(tt.total.value), decimals) : (tt.total?.value ?? null),
      };
    }),
    l1Fee: t.l1_fee ?? null,
  };
}
