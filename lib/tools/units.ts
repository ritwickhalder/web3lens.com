/**
 * Exact decimal ↔ integer unit conversion with BigInt (no floating point): wei/gwei/ether,
 * sats/BTC, lamports/SOL, or any token's decimals.
 */

export const UNIT_PRESETS = {
  wei: 0,
  kwei: 3,
  mwei: 6,
  gwei: 9,
  szabo: 12,
  finney: 15,
  ether: 18,
  sat: 0,
  btc: 8,
  lamport: 0,
  sol: 9,
} as const;

const TEN = BigInt(10);

/** "1.5" with 18 decimals → 1500000000000000000n. Throws on bad input or too many decimals. */
export function parseUnits(value: string, decimals: number): bigint {
  const v = value.trim().replace(/_/g, '').replace(/,/g, '');
  if (!/^-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(v)) throw new Error('Not a number');
  const negative = v.startsWith('-');
  let body = negative ? v.slice(1) : v;
  // Expand scientific notation exactly.
  const exp = /e([+-]?\d+)$/i.exec(body);
  let shift = 0;
  if (exp) {
    shift = Number(exp[1]);
    body = body.slice(0, exp.index);
  }
  let [int, frac = ''] = body.split('.');
  int = int || '0';
  const totalDecimals = decimals + shift;
  if (totalDecimals < 0) throw new Error('Exponent too small');
  if (frac.length > totalDecimals) {
    if (/[1-9]/.test(frac.slice(totalDecimals))) throw new Error(`More than ${decimals} decimal places`);
    frac = frac.slice(0, totalDecimals);
  }
  const digits = `${int}${frac.padEnd(totalDecimals, '0')}`.replace(/^0+(?=\d)/, '');
  const n = BigInt(digits || '0');
  return negative ? -n : n;
}

/** 1500000000000000000n with 18 decimals → "1.5". Exact, trailing zeros trimmed. */
export function formatUnits(value: bigint | string | number, decimals: number): string {
  let n = typeof value === 'bigint' ? value : BigInt(value);
  const negative = n < BigInt(0);
  if (negative) n = -n;
  const base = TEN ** BigInt(decimals);
  const int = n / base;
  const frac = (n % base).toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${negative ? '-' : ''}${int.toString()}${frac ? `.${frac}` : ''}`;
}

/** Groups the integer part with thin separators for display and caps the fraction, without rounding up. */
export function displayAmount(decimal: string, maxFraction = 6): string {
  const negative = decimal.startsWith('-');
  const [int, frac = ''] = (negative ? decimal.slice(1) : decimal).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const f = frac.slice(0, maxFraction).replace(/0+$/, '');
  if (!f && /[1-9]/.test(frac) && int === '0') {
    // Tiny non-zero amounts: show "<0.000001" instead of "0".
    return `${negative ? '-' : ''}<0.${'0'.repeat(maxFraction - 1)}1`;
  }
  return `${negative ? '-' : ''}${grouped}${f ? `.${f}` : ''}`;
}

/** Converts between two units with different decimals, exactly. */
export function convertUnits(value: string, fromDecimals: number, toDecimals: number): string {
  return formatUnits(parseUnits(value, fromDecimals), toDecimals);
}

/** Multiplies a decimal amount by a float price, for approximate fiat values only. */
export function fiatValue(decimal: string, price: number): number {
  return Number(decimal) * price;
}
