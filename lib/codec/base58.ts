/** Base58 and base58check (Bitcoin family, Tron, XRP, Tezos, Solana). */
import { concatBytes, equalBytes } from '@/lib/codec/bytes';
import { sha256 } from '@/lib/codec/sha256';

export const BITCOIN_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export const RIPPLE_ALPHABET = 'rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz';

export function base58Decode(s: string, alphabet = BITCOIN_ALPHABET): Uint8Array | null {
  if (!s) return null;
  const bytes: number[] = [0];
  for (const ch of s) {
    const v = alphabet.indexOf(ch);
    if (v < 0) return null;
    let carry = v;
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  // Leading "zero" characters are leading zero bytes.
  let zeros = 0;
  while (zeros < s.length && s[zeros] === alphabet[0]) zeros++;
  const body = bytes.reverse();
  // Drop the placeholder 0 when the number itself isn't zero.
  let start = 0;
  while (start < body.length && body[start] === 0) start++;
  return concatBytes(new Uint8Array(zeros), Uint8Array.from(body.slice(start)));
}

export function base58Encode(bytes: Uint8Array, alphabet = BITCOIN_ALPHABET): string {
  const digits: number[] = [];
  for (const b of bytes) {
    let carry = b;
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i] << 8;
      digits[i] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let out = '';
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) out += alphabet[0];
  for (let i = digits.length - 1; i >= 0; i--) out += alphabet[digits[i]];
  return out;
}

/** Decodes base58check and verifies the 4-byte double-SHA-256 checksum. Returns the payload (version byte included). */
export function base58CheckDecode(s: string, alphabet = BITCOIN_ALPHABET): Uint8Array | null {
  const raw = base58Decode(s, alphabet);
  if (!raw || raw.length < 5) return null;
  const payload = raw.slice(0, -4);
  const check = sha256(sha256(payload)).slice(0, 4);
  return equalBytes(check, raw.slice(-4)) ? payload : null;
}
