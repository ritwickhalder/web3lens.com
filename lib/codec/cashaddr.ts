/** Bitcoin Cash CashAddr checksum (40-bit BCH code, different from bech32). */

const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const GEN = [BigInt('0x98f2bc8e61'), BigInt('0x79b76d99e2'), BigInt('0xf33e5fb3c4'), BigInt('0xae2eabe2a8'), BigInt('0x1e4f43e470')];

function polymod(values: number[]): bigint {
  let c = BigInt(1);
  for (const d of values) {
    const c0 = c >> BigInt(35);
    c = ((c & BigInt('0x07ffffffff')) << BigInt(5)) ^ BigInt(d);
    for (let i = 0; i < 5; i++) if ((c0 >> BigInt(i)) & BigInt(1)) c ^= GEN[i];
  }
  return c ^ BigInt(1);
}

/** True when `address` (with or without the `bitcoincash:` prefix) has a valid CashAddr checksum. */
export function isCashAddr(address: string): boolean {
  const lower = address.toLowerCase();
  if (address !== lower && address !== address.toUpperCase()) return false;
  const [prefix, payload] = lower.includes(':') ? lower.split(':') : ['bitcoincash', lower];
  if (prefix !== 'bitcoincash' || !payload) return false;
  const data: number[] = [];
  for (const ch of payload) {
    const v = CHARSET.indexOf(ch);
    if (v < 0) return false;
    data.push(v);
  }
  const pre = [...prefix].map((c) => c.charCodeAt(0) & 0x1f);
  return polymod([...pre, 0, ...data]) === BigInt(0);
}
