/**
 * Routescan free API (no key): ERC-20 holdings with prices, and an Etherscan-compatible endpoint
 * for transaction lists and log search. Used for chains without a public Blockscout (Avalanche).
 */
import type { ActivityItem, TokenHolding } from '@/lib/providers/blockscout';
import { fetchJson } from '@/lib/providers/http';
import { formatUnits } from '@/lib/tools/units';

const SRC = 'Routescan';
export const routescanBase = (chainId: number) => `https://api.routescan.io/v2/network/mainnet/evm/${chainId}`;
/** Etherscan-compatible base: `${base}/api?module=…` (same shape bs.getLogs expects). */
export const routescanEtherscanBase = (chainId: number) => `${routescanBase(chainId)}/etherscan`;

type RsHolding = { tokenAddress: string; tokenName?: string | null; tokenSymbol?: string | null; tokenDecimals?: number | null; tokenQuantity?: string; tokenPrice?: string | null };

export async function getRoutescanTokens(chainId: number, address: string): Promise<{ items: TokenHolding[]; more: boolean }> {
  const res = await fetchJson<{ items: RsHolding[]; link?: { next?: string } }>(SRC, `${routescanBase(chainId)}/address/${address}/erc20-holdings?limit=50`, { timeoutMs: 8000 });
  return {
    items: res.items.map((t) => {
      const decimals = typeof t.tokenDecimals === 'number' ? t.tokenDecimals : null;
      const quantity: string = t.tokenQuantity && /^\d+$/.test(t.tokenQuantity) ? t.tokenQuantity : '0';
      return {
        contract: t.tokenAddress,
        name: t.tokenName ?? null,
        symbol: t.tokenSymbol ?? null,
        decimals,
        balanceRaw: quantity,
        balance: decimals === null ? null : formatUnits(BigInt(quantity), decimals),
        priceUsd: t.tokenPrice ? Number(t.tokenPrice) : null,
        // Routescan has no spam flag; tokens without any name/symbol/decimals are typically airdrop spam, so they're hidden (and listed as hidden).
        flagged: !t.tokenSymbol && !t.tokenName && decimals === null,
        type: 'ERC-20',
      };
    }),
    more: Boolean(res.link?.next),
  };
}

type EsTx = { hash: string; timeStamp: string; from: string; to: string; contractAddress: string; value: string; isError: string; functionName?: string; gasUsed: string; gasPrice: string };

export async function getRoutescanTransactions(chainId: number, address: string, limit = 10): Promise<ActivityItem[]> {
  const params = new URLSearchParams({ module: 'account', action: 'txlist', address, page: '1', offset: String(limit), sort: 'desc' });
  const res = await fetchJson<{ status: string; result: EsTx[] | string }>(SRC, `${routescanEtherscanBase(chainId)}/api?${params}`, { timeoutMs: 8000 });
  if (!Array.isArray(res.result)) return [];
  return res.result.slice(0, limit).map((t) => ({
    hash: t.hash,
    timestamp: new Date(Number(t.timeStamp) * 1000).toISOString(),
    from: t.from,
    to: t.to || t.contractAddress || null,
    valueWei: t.value,
    method: t.functionName ? t.functionName.split('(')[0] || null : null,
    status: t.isError === '1' ? 'failed' : 'success',
    feeWei: (BigInt(t.gasUsed || '0') * BigInt(t.gasPrice || '0')).toString(),
  }));
}
