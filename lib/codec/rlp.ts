/** RLP (Ethereum's Recursive Length Prefix) encode/decode, bounds-checked. */
import { concatBytes } from '@/lib/codec/bytes';

export type RlpItem = Uint8Array | RlpItem[];

function encodeLength(len: number, offset: number): Uint8Array {
  if (len < 56) return Uint8Array.of(offset + len);
  const hex = len.toString(16);
  const lenBytes = Uint8Array.from((hex.length % 2 ? `0${hex}` : hex).match(/../g)!.map((b) => parseInt(b, 16)));
  return concatBytes(Uint8Array.of(offset + 55 + lenBytes.length), lenBytes);
}

export function rlpEncode(item: RlpItem): Uint8Array {
  if (item instanceof Uint8Array) {
    if (item.length === 1 && item[0] < 0x80) return item;
    return concatBytes(encodeLength(item.length, 0x80), item);
  }
  const body = concatBytes(...item.map(rlpEncode));
  return concatBytes(encodeLength(body.length, 0xc0), body);
}

function readLength(data: Uint8Array, pos: number, n: number): number {
  if (pos + n > data.length) throw new Error('RLP: truncated length');
  let len = 0;
  for (let i = 0; i < n; i++) len = len * 256 + data[pos + i];
  return len;
}

function decodeAt(data: Uint8Array, pos: number, depth: number): [RlpItem, number] {
  if (depth > 32) throw new Error('RLP: nesting too deep');
  if (pos >= data.length) throw new Error('RLP: unexpected end');
  const b = data[pos];
  if (b < 0x80) return [data.subarray(pos, pos + 1), pos + 1];
  if (b < 0xb8) {
    const len = b - 0x80;
    if (pos + 1 + len > data.length) throw new Error('RLP: string too long');
    return [data.subarray(pos + 1, pos + 1 + len), pos + 1 + len];
  }
  if (b < 0xc0) {
    const ll = b - 0xb7;
    const len = readLength(data, pos + 1, ll);
    const start = pos + 1 + ll;
    if (start + len > data.length) throw new Error('RLP: string too long');
    return [data.subarray(start, start + len), start + len];
  }
  let len: number;
  let start: number;
  if (b < 0xf8) {
    len = b - 0xc0;
    start = pos + 1;
  } else {
    const ll = b - 0xf7;
    len = readLength(data, pos + 1, ll);
    start = pos + 1 + ll;
  }
  const end = start + len;
  if (end > data.length) throw new Error('RLP: list too long');
  const items: RlpItem[] = [];
  let p = start;
  while (p < end) {
    const [item, next] = decodeAt(data, p, depth + 1);
    items.push(item);
    p = next;
  }
  if (p !== end) throw new Error('RLP: list length mismatch');
  return [items, end];
}

export function rlpDecode(data: Uint8Array): RlpItem {
  const [item, end] = decodeAt(data, 0, 0);
  if (end !== data.length) throw new Error('RLP: trailing bytes');
  return item;
}
