/** Byte helpers shared by the codecs. Pure, no Node or DOM APIs, so the extensions can bundle them. */

export function isHex(s: string, { prefix = true }: { prefix?: boolean } = {}): boolean {
  const body = prefix ? s.replace(/^0x/i, '') : s;
  return /^[0-9a-f]*$/i.test(body);
}

export function hexToBytes(hex: string): Uint8Array {
  let h = hex.trim().replace(/^0x/i, '');
  if (!/^[0-9a-f]*$/i.test(h)) throw new Error('Not a hex string');
  if (h.length % 2) h = `0${h}`;
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function bytesToHex(bytes: Uint8Array, prefix = true): string {
  let s = '';
  for (const b of bytes) s += b.toString(16).padStart(2, '0');
  return prefix ? `0x${s}` : s;
}

export function utf8ToBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

/** Decodes UTF-8; returns null when the bytes aren't valid UTF-8. */
export function bytesToUtf8(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

export function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export function bytesToBigInt(bytes: Uint8Array): bigint {
  let n = BigInt(0);
  for (const b of bytes) n = (n << BigInt(8)) | BigInt(b);
  return n;
}

export function bigIntToBytes(n: bigint, length?: number): Uint8Array {
  if (n < BigInt(0)) throw new Error('Negative');
  let hex = n.toString(16);
  if (hex.length % 2) hex = `0${hex}`;
  const raw = hexToBytes(hex === '00' && length === 0 ? '' : hex);
  if (length === undefined) return raw;
  if (raw.length > length) throw new Error('Number too large');
  const out = new Uint8Array(length);
  out.set(raw, length - raw.length);
  return out;
}
