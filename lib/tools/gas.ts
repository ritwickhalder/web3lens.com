/** Transaction fee maths (exact, in wei) for legacy and EIP-1559 transactions. */
import { formatUnits, parseUnits } from '@/lib/tools/units';

export type FeeInput = {
  gasLimit: string;
  /** Legacy gas price, or EIP-1559 base fee, in gwei. */
  baseFeeGwei: string;
  /** EIP-1559 priority fee (tip) in gwei; empty for legacy. */
  priorityFeeGwei?: string;
  /** EIP-1559 max fee in gwei; caps base + tip. */
  maxFeeGwei?: string;
  /** Native token price in USD, optional. */
  priceUsd?: number | null;
};

export type FeeResult = {
  effectiveGasPriceGwei: string;
  feeWei: string;
  fee: string;
  /** What the sender must have available: gasLimit × maxFee. */
  maxFeeWei: string | null;
  maxFee: string | null;
  feeUsd: number | null;
  /** Of the fee, how much is burned (base fee) and how much goes to the block producer (tip). */
  burnedWei: string | null;
  tipWei: string | null;
};

export function calculateFee(input: FeeInput): FeeResult {
  const gas = BigInt(input.gasLimit.trim().replace(/[_,]/g, '') || '0');
  if (gas <= BigInt(0)) throw new Error('Gas limit must be positive');
  const base = parseUnits(input.baseFeeGwei || '0', 9);
  const tip = input.priorityFeeGwei ? parseUnits(input.priorityFeeGwei, 9) : null;
  const max = input.maxFeeGwei ? parseUnits(input.maxFeeGwei, 9) : null;
  let price = tip === null ? base : base + tip;
  if (max !== null && price > max) price = max;
  const fee = gas * price;
  const burned = tip === null ? null : gas * (price < base ? price : base);
  return {
    effectiveGasPriceGwei: formatUnits(price, 9),
    feeWei: fee.toString(),
    fee: formatUnits(fee, 18),
    maxFeeWei: max === null ? null : (gas * max).toString(),
    maxFee: max === null ? null : formatUnits(gas * max, 18),
    feeUsd: input.priceUsd ? Number(formatUnits(fee, 18)) * input.priceUsd : null,
    burnedWei: burned === null ? null : burned.toString(),
    tipWei: burned === null ? null : (fee - burned).toString(),
  };
}

/** Typical gas limits, for the calculator's presets. */
export const GAS_PRESETS = [
  { label: 'ETH transfer', gas: '21000' },
  { label: 'ERC-20 transfer', gas: '65000' },
  { label: 'ERC-20 approve', gas: '46000' },
  { label: 'Uniswap swap', gas: '180000' },
  { label: 'NFT mint', gas: '150000' },
] as const;

/** Bitcoin fee: vbytes × sat/vB. */
export function bitcoinFee(vbytes: number, satPerVb: number): { sats: number; btc: string } {
  const sats = Math.ceil(vbytes * satPerVb);
  return { sats, btc: formatUnits(BigInt(sats), 8) };
}
