/** Bech32 / Bech32m (BIP-173, BIP-350): Bitcoin SegWit, Litecoin, Cosmos-SDK chains, Cardano. */

const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

function polymod(values: number[]): number {
  let chk = 1;
  for (const v of values) {
    const top = chk >>> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) if ((top >>> i) & 1) chk ^= GEN[i];
  }
  return chk >>> 0;
}

function hrpExpand(hrp: string): number[] {
  const out: number[] = [];
  for (const c of hrp) out.push(c.charCodeAt(0) >> 5);
  out.push(0);
  for (const c of hrp) out.push(c.charCodeAt(0) & 31);
  return out;
}

export type Bech32Decoded = { hrp: string; words: number[]; variant: 'bech32' | 'bech32m' };

/**
 * Decodes and checksum-verifies a bech32/bech32m string. `limit` is 90 for BIP-173; Cardano and
 * Lightning use longer strings, so callers can raise it.
 */
export function bech32Decode(input: string, limit = 90): Bech32Decoded | null {
  if (input.length > limit) return null;
  if (input !== input.toLowerCase() && input !== input.toUpperCase()) return null;
  const s = input.toLowerCase();
  const pos = s.lastIndexOf('1');
  if (pos < 1 || pos + 7 > s.length) return null;
  const hrp = s.slice(0, pos);
  for (const c of hrp) {
    const code = c.charCodeAt(0);
    if (code < 33 || code > 126) return null;
  }
  const data: number[] = [];
  for (const c of s.slice(pos + 1)) {
    const v = CHARSET.indexOf(c);
    if (v < 0) return null;
    data.push(v);
  }
  const check = polymod([...hrpExpand(hrp), ...data]);
  const variant = check === 1 ? 'bech32' : check === 0x2bc830a3 ? 'bech32m' : null;
  if (!variant) return null;
  return { hrp, words: data.slice(0, -6), variant };
}

/** Regroups 5-bit words into bytes (strict: no leftover non-zero padding). */
export function fromWords(words: number[]): Uint8Array | null {
  let acc = 0;
  let bits = 0;
  const out: number[] = [];
  for (const w of words) {
    acc = (acc << 5) | w;
    bits += 5;
    while (bits >= 8) {
      bits -= 8;
      out.push((acc >> bits) & 0xff);
    }
  }
  if (bits >= 5 || (acc << (8 - bits)) & 0xff) return null;
  return Uint8Array.from(out);
}

/** Validates a SegWit address (BIP-173/350) for the given human-readable part (bc, tb, ltc…). */
export function isSegwitAddress(address: string, hrp: string): boolean {
  const d = bech32Decode(address);
  if (!d || d.hrp !== hrp || d.words.length < 1) return false;
  const version = d.words[0];
  if (version > 16) return false;
  const program = fromWords(d.words.slice(1));
  if (!program || program.length < 2 || program.length > 40) return false;
  if (version === 0 && program.length !== 20 && program.length !== 32) return false;
  return version === 0 ? d.variant === 'bech32' : d.variant === 'bech32m';
}
