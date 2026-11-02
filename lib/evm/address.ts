/** EVM address helpers: EIP-55 checksums. */
import { keccak256 } from '@/lib/codec/keccak';
import { bytesToHex, utf8ToBytes } from '@/lib/codec/bytes';

export function isEvmAddress(s: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(s);
}

/** EIP-55 mixed-case checksum form of an address (input in any case). */
export function toChecksumAddress(address: string): string {
  if (!isEvmAddress(address)) throw new Error('Not an EVM address');
  const lower = address.slice(2).toLowerCase();
  const hash = bytesToHex(keccak256(utf8ToBytes(lower)), false);
  let out = '0x';
  for (let i = 0; i < 40; i++) out += parseInt(hash[i], 16) >= 8 ? lower[i].toUpperCase() : lower[i];
  return out;
}

/**
 * `valid`: mixed case and matches EIP-55. `invalid`: mixed case that doesn't match (likely a typo).
 * `none`: all lower or all upper case, which carries no checksum.
 */
export function evmChecksumStatus(address: string): 'valid' | 'invalid' | 'none' {
  const body = address.slice(2);
  if (body === body.toLowerCase() || body === body.toUpperCase()) return 'none';
  return toChecksumAddress(address) === address ? 'valid' : 'invalid';
}
