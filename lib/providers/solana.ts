/** Solana JSON-RPC over public endpoints. Server-side only. */
import type { SolanaNetwork } from '@/lib/networks';
import { fetchJson, ProviderError } from '@/lib/providers/http';

async function call<T>(net: SolanaNetwork, method: string, params: unknown[], urls = net.rpc): Promise<{ value: T; host: string }> {
  let last: unknown;
  for (const url of urls) {
    const host = new URL(url).hostname;
    try {
      const res = await fetchJson<{ result?: T; error?: { message: string } }>(host, url, {
        method: 'POST',
        body: { jsonrpc: '2.0', id: 1, method, params },
        timeoutMs: 9000,
      });
      if (res.error) throw new ProviderError(host, res.error.message);
      return { value: res.result as T, host };
    } catch (e) {
      last = e;
    }
  }
  throw last;
}

export const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
export const TOKEN_2022_PROGRAM = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PEnvyx5H3gs2XG';

export type SolanaAccount = { lamports: number; owner: string | null; executable: boolean; space: number | null; exists: boolean };

export async function getSolanaAccount(net: SolanaNetwork, address: string): Promise<{ value: SolanaAccount; host: string }> {
  const { value, host } = await call<{ value: { lamports: number; owner: string; executable: boolean; space?: number; data: unknown } | null }>(
    net,
    'getAccountInfo',
    [address, { encoding: 'base64', dataSlice: { offset: 0, length: 0 } }],
  );
  const a = value.value;
  return {
    host,
    value: a
      ? { lamports: a.lamports, owner: a.owner, executable: a.executable, space: a.space ?? null, exists: true }
      : { lamports: 0, owner: null, executable: false, space: null, exists: false },
  };
}

export type SplHolding = { mint: string; amount: string; decimals: number; program: 'token' | 'token-2022' };

/**
 * SPL token balances. Some public RPCs refuse indexed queries, so the endpoints are tried in reverse
 * order (Solana's own RPC first). Token-2022 isn't accepted everywhere; when it fails the result is
 * marked `partial` rather than failing the whole lookup.
 */
export async function getSplTokens(net: SolanaNetwork, owner: string): Promise<{ items: SplHolding[]; partial: boolean; host: string }> {
  type Parsed = { value: { account: { data: { parsed: { info: { mint: string; tokenAmount: { uiAmountString: string; decimals: number; amount: string } } } } } }[] };
  const urls = [...net.rpc].reverse();
  const items: SplHolding[] = [];
  const collect = (value: Parsed, program: SplHolding['program']) => {
    for (const acc of value.value) {
      const info = acc.account.data.parsed.info;
      if (info.tokenAmount.amount === '0') continue;
      items.push({ mint: info.mint, amount: info.tokenAmount.uiAmountString, decimals: info.tokenAmount.decimals, program });
    }
  };
  const classic = await call<Parsed>(net, 'getTokenAccountsByOwner', [owner, { programId: TOKEN_PROGRAM }, { encoding: 'jsonParsed' }], urls);
  collect(classic.value, 'token');
  let partial = false;
  try {
    const t22 = await call<Parsed>(net, 'getTokenAccountsByOwner', [owner, { programId: TOKEN_2022_PROGRAM }, { encoding: 'jsonParsed' }], urls);
    collect(t22.value, 'token-2022');
  } catch {
    partial = true;
  }
  return { items: items.slice(0, 100), partial, host: classic.host };
}

export type SolanaSignature = { signature: string; slot: number; time: number | null; failed: boolean; memo: string | null };

export async function getSolanaSignatures(net: SolanaNetwork, address: string, limit = 10): Promise<SolanaSignature[]> {
  const { value } = await call<{ signature: string; slot: number; blockTime: number | null; err: unknown; memo: string | null }[]>(
    net,
    'getSignaturesForAddress',
    [address, { limit }],
  );
  return value.map((s) => ({ signature: s.signature, slot: s.slot, time: s.blockTime, failed: s.err !== null, memo: s.memo }));
}

export type SolanaTx = {
  signature: string;
  slot: number;
  time: number | null;
  failed: boolean;
  feeLamports: number;
  signers: string[];
  /** Native SOL balance changes per account, in lamports. */
  balanceChanges: { account: string; deltaLamports: number }[];
  programs: string[];
};

type RawSolTx = {
  slot: number;
  blockTime: number | null;
  meta: { err: unknown; fee: number; preBalances: number[]; postBalances: number[] } | null;
  transaction: { message: { accountKeys: (string | { pubkey: string; signer: boolean })[]; instructions: { programIdIndex?: number; programId?: string }[]; header?: { numRequiredSignatures: number } }; signatures: string[] };
};

export async function getSolanaTx(net: SolanaNetwork, signature: string): Promise<{ value: SolanaTx; host: string } | null> {
  const { value: t, host } = await call<RawSolTx | null>(net, 'getTransaction', [signature, { encoding: 'json', maxSupportedTransactionVersion: 0 }]);
  if (!t) return null;
  const keys = t.transaction.message.accountKeys.map((k) => (typeof k === 'string' ? k : k.pubkey));
  const numSigners = t.transaction.message.header?.numRequiredSignatures ?? 1;
  const pre = t.meta?.preBalances ?? [];
  const post = t.meta?.postBalances ?? [];
  const changes = keys
    .map((account, i) => ({ account, deltaLamports: (post[i] ?? 0) - (pre[i] ?? 0) }))
    .filter((c) => c.deltaLamports !== 0)
    .slice(0, 30);
  const programs = [
    ...new Set(t.transaction.message.instructions.map((ix) => ix.programId ?? (ix.programIdIndex !== undefined ? keys[ix.programIdIndex] : '')).filter(Boolean)),
  ];
  return {
    host,
    value: {
      signature,
      slot: t.slot,
      time: t.blockTime,
      failed: t.meta?.err != null,
      feeLamports: t.meta?.fee ?? 0,
      signers: keys.slice(0, numSigners),
      balanceChanges: changes,
      programs,
    },
  };
}
