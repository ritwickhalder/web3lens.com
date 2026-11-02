/** Number and text conversions for the developer tools (exact, BigInt-based). */
import { bytesToHex, bytesToUtf8, hexToBytes, utf8ToBytes } from '@/lib/codec/bytes';
import { keccak256 } from '@/lib/codec/keccak';
import { sha256 } from '@/lib/codec/sha256';

const MAX_DIGITS = 400;

/** "0xff" / "ff" → "255". Negative input with a leading "-" is allowed. */
export function hexToDecimal(input: string): string {
  const s = input.trim().replace(/_/g, '');
  const neg = s.startsWith('-');
  const body = (neg ? s.slice(1) : s).replace(/^0x/i, '');
  if (!body || !/^[0-9a-f]+$/i.test(body) || body.length > MAX_DIGITS) throw new Error('Not a hex number');
  const n = BigInt(`0x${body}`);
  return `${neg && n !== BigInt(0) ? '-' : ''}${n.toString(10)}`;
}

/** "255" → "0xff". Also accepts scientific notation like 1e18. */
export function decimalToHex(input: string): string {
  const s = input.trim().replace(/[_,\s]/g, '');
  const sci = /^(-?)(\d+)(?:\.(\d+))?e\+?(\d+)$/i.exec(s);
  let n: bigint;
  if (sci) {
    const [, sign, int, frac = '', exp] = sci;
    const e = Number(exp);
    if (frac.length > e || e > MAX_DIGITS) throw new Error('Not a whole number');
    n = BigInt(`${sign}${int}${frac}${'0'.repeat(e - frac.length)}`);
  } else {
    if (!/^-?\d+$/.test(s) || s.length > MAX_DIGITS) throw new Error('Not a whole decimal number');
    n = BigInt(s);
  }
  return n < BigInt(0) ? `-0x${(-n).toString(16)}` : `0x${n.toString(16)}`;
}

/** Two's-complement view of a 256-bit word (as Solidity int256 sees it). */
export function hexToSignedInt256(input: string): string {
  const body = input.trim().replace(/^0x/i, '');
  if (!/^[0-9a-f]{1,64}$/i.test(body)) throw new Error('Not a 256-bit hex word');
  let n = BigInt(`0x${body}`);
  if (body.length === 64 && n >> BigInt(255)) n -= BigInt(1) << BigInt(256);
  return n.toString();
}

export function textToHex(text: string): string {
  return bytesToHex(utf8ToBytes(text));
}

export function hexToText(hex: string): string {
  const text = bytesToUtf8(hexToBytes(hex));
  if (text === null) throw new Error('Not valid UTF-8');
  return text;
}

export type HashInput = { kind: 'text' | 'hex'; value: string };

export function hashes(input: HashInput): { keccak256: string; sha256: string; selector: string | null } {
  const bytes = input.kind === 'hex' ? hexToBytes(input.value) : utf8ToBytes(input.value);
  const k = bytesToHex(keccak256(bytes));
  return {
    keccak256: k,
    sha256: bytesToHex(sha256(bytes)),
    // A function selector only makes sense for a signature text like transfer(address,uint256).
    selector: input.kind === 'text' && /^[A-Za-z_$][\w$]*\(.*\)$/.test(input.value.trim()) ? k.slice(0, 10) : null,
  };
}
