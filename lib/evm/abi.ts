/**
 * Solidity ABI encoding/decoding (head/tail layout) without dependencies: function selectors,
 * human-readable signatures ("transfer(address,uint256)"), JSON ABIs, static and dynamic types,
 * fixed and dynamic arrays and tuples. Decoding is bounds-checked so hostile calldata can't hang it.
 */
import { bigIntToBytes, bytesToBigInt, bytesToHex, bytesToUtf8, concatBytes, hexToBytes, utf8ToBytes } from '@/lib/codec/bytes';
import { keccak256 } from '@/lib/codec/keccak';
import { toChecksumAddress } from '@/lib/evm/address';

export type AbiType =
  | { kind: 'address' | 'bool' | 'string' | 'bytes' }
  | { kind: 'uint' | 'int'; bits: number }
  | { kind: 'fixedbytes'; size: number }
  | { kind: 'array'; item: AbiType; length: number | null }
  | { kind: 'tuple'; components: AbiParam[] };

export type AbiParam = { name?: string; type: AbiType; indexed?: boolean };

export type DecodedValue =
  | { type: string; name?: string; value: string }
  | { type: string; name?: string; items: DecodedValue[] };

export type AbiFunction = { name: string; inputs: AbiParam[]; outputs: AbiParam[]; signature: string; selector: string; stateMutability?: string };
export type AbiEvent = { name: string; inputs: AbiParam[]; signature: string; topic: string };

// ---------------------------------------------------------------------------------------------
// Type parsing

function splitTopLevel(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  if (depth !== 0) throw new Error('Unbalanced parentheses');
  return out.map((x) => x.trim());
}

/** Parses "uint256", "address[]", "(address,uint256)[2]", "tuple(uint a,bool b)" etc. A param may carry a name: "address to". */
export function parseParam(input: string): AbiParam {
  let s = input.trim();
  let name: string | undefined;
  let indexed = false;
  // Peel the trailing name (and "indexed"), unless the string ends with a type character.
  const m = /^(.*?[\])a-z0-9])\s+(indexed\s+)?([A-Za-z_$][\w$]*)$/.exec(s);
  if (m && !/^(u?int\d*|address|bool|string|bytes\d*|tuple|function)$/.test(m[3])) {
    s = m[1].trim();
    indexed = Boolean(m[2]);
    name = m[3];
  } else if (/\s+indexed$/.test(s)) {
    s = s.replace(/\s+indexed$/, '');
    indexed = true;
  }
  return { name, type: parseType(s), indexed: indexed || undefined };
}

export function parseType(input: string): AbiType {
  let s = input.trim().replace(/^tuple(?=\()/, '');
  const arr = /\[(\d*)\]$/.exec(s);
  if (arr) {
    s = s.slice(0, arr.index);
    const length = arr[1] === '' ? null : Number(arr[1]);
    if (length !== null && (length < 1 || length > 1_000_000)) throw new Error('Bad array length');
    return { kind: 'array', item: parseType(s), length };
  }
  if (s.startsWith('(') && s.endsWith(')')) {
    return { kind: 'tuple', components: splitTopLevel(s.slice(1, -1)).map(parseParam) };
  }
  if (s === 'address' || s === 'bool' || s === 'string' || s === 'bytes') return { kind: s };
  if (s === 'function') return { kind: 'fixedbytes', size: 24 };
  const int = /^(u?)int(\d*)$/.exec(s);
  if (int) {
    const bits = int[2] ? Number(int[2]) : 256;
    if (bits % 8 || bits < 8 || bits > 256) throw new Error(`Bad integer size: ${s}`);
    return { kind: int[1] ? 'uint' : 'int', bits };
  }
  const fb = /^bytes(\d+)$/.exec(s);
  if (fb) {
    const size = Number(fb[1]);
    if (size < 1 || size > 32) throw new Error(`Bad bytes size: ${s}`);
    return { kind: 'fixedbytes', size };
  }
  throw new Error(`Unknown type: ${input}`);
}

/** Canonical type string used in signatures, e.g. "(address,uint256)[]". */
export function typeString(t: AbiType): string {
  switch (t.kind) {
    case 'uint':
    case 'int':
      return `${t.kind}${t.bits}`;
    case 'fixedbytes':
      return `bytes${t.size}`;
    case 'array':
      return `${typeString(t.item)}[${t.length ?? ''}]`;
    case 'tuple':
      return `(${t.components.map((c) => typeString(c.type)).join(',')})`;
    default:
      return t.kind;
  }
}

function isDynamic(t: AbiType): boolean {
  if (t.kind === 'string' || t.kind === 'bytes') return true;
  if (t.kind === 'array') return t.length === null || isDynamic(t.item);
  if (t.kind === 'tuple') return t.components.some((c) => isDynamic(c.type));
  return false;
}

function headSize(t: AbiType): number {
  if (isDynamic(t)) return 32;
  if (t.kind === 'array') return (t.length ?? 0) * headSize(t.item);
  if (t.kind === 'tuple') return t.components.reduce((n, c) => n + headSize(c.type), 0);
  return 32;
}

/** "transfer(address to, uint256 amount)" → function with canonical signature and selector. */
export function parseSignature(sig: string): AbiFunction {
  const m = /^\s*(?:function\s+)?([A-Za-z_$][\w$]*)\s*\(/.exec(sig);
  if (!m) throw new Error('Expected a signature like transfer(address,uint256)');
  // Take the parameter list up to its matching ")", ignoring modifiers and "returns (…)" after it.
  const start = m[0].length;
  let depth = 1;
  let end = start;
  for (; end < sig.length && depth > 0; end++) {
    if (sig[end] === '(') depth++;
    if (sig[end] === ')') depth--;
  }
  if (depth !== 0) throw new Error('Unbalanced parentheses');
  const inputs = splitTopLevel(sig.slice(start, end - 1)).map(parseParam);
  return makeFunction(m[1], inputs, []);
}

function makeFunction(name: string, inputs: AbiParam[], outputs: AbiParam[], stateMutability?: string): AbiFunction {
  const signature = `${name}(${inputs.map((i) => typeString(i.type)).join(',')})`;
  return { name, inputs, outputs, signature, selector: bytesToHex(keccak256(signature)).slice(0, 10), stateMutability };
}

export function eventSignature(name: string, inputs: AbiParam[]): AbiEvent {
  const signature = `${name}(${inputs.map((i) => typeString(i.type)).join(',')})`;
  return { name, inputs, signature, topic: bytesToHex(keccak256(signature)) };
}

type JsonParam = { name?: string; type: string; components?: JsonParam[]; indexed?: boolean };
type JsonItem = { type?: string; name?: string; inputs?: JsonParam[]; outputs?: JsonParam[]; stateMutability?: string };

function fromJsonParam(p: JsonParam): AbiParam {
  const type = p.type.startsWith('tuple')
    ? parseType(`(${(p.components ?? []).map((c) => typeString(fromJsonParam(c).type)).join(',')})${p.type.slice(5)}`)
    : parseType(p.type);
  // Keep component names for display.
  const named = p.components ? attachNames(type, p.components.map(fromJsonParam)) : type;
  return { name: p.name || undefined, type: named, indexed: p.indexed || undefined };
}

function attachNames(t: AbiType, comps: AbiParam[]): AbiType {
  if (t.kind === 'array') return { ...t, item: attachNames(t.item, comps) };
  if (t.kind === 'tuple') return { kind: 'tuple', components: comps };
  return t;
}

/** Parses a JSON ABI (array, or an object with an `abi` field as Hardhat/Foundry artifacts have). */
export function parseJsonAbi(json: string | unknown): { functions: AbiFunction[]; events: AbiEvent[] } {
  const raw = typeof json === 'string' ? JSON.parse(json) : json;
  const items: JsonItem[] = Array.isArray(raw) ? raw : Array.isArray((raw as { abi?: unknown })?.abi) ? (raw as { abi: JsonItem[] }).abi : [];
  if (!items.length) throw new Error('No ABI entries found');
  const functions: AbiFunction[] = [];
  const events: AbiEvent[] = [];
  for (const item of items) {
    if ((item.type ?? 'function') === 'function' && item.name) {
      functions.push(makeFunction(item.name, (item.inputs ?? []).map(fromJsonParam), (item.outputs ?? []).map(fromJsonParam), item.stateMutability));
    } else if (item.type === 'event' && item.name) {
      events.push(eventSignature(item.name, (item.inputs ?? []).map(fromJsonParam)));
    }
  }
  return { functions, events };
}

// ---------------------------------------------------------------------------------------------
// Decoding

const MAX_DEPTH = 16;
const MAX_ITEMS = 10_000;

class Reader {
  constructor(readonly data: Uint8Array) {}
  word(offset: number): Uint8Array {
    if (offset < 0 || offset + 32 > this.data.length) throw new Error('Data too short');
    return this.data.subarray(offset, offset + 32);
  }
  uint(offset: number): bigint {
    return bytesToBigInt(this.word(offset));
  }
  safeNumber(offset: number): number {
    const n = this.uint(offset);
    if (n > BigInt(this.data.length)) throw new Error('Offset or length out of range');
    return Number(n);
  }
}

function decodeOne(r: Reader, t: AbiType, base: number, offset: number, depth: number, name?: string): DecodedValue {
  if (depth > MAX_DEPTH) throw new Error('Nesting too deep');
  const type = typeString(t);
  if (isDynamic(t) && !(t.kind === 'array' && t.length !== null && !isDynamic(t.item))) {
    // Head holds an offset relative to the enclosing block.
    const ptr = base + r.safeNumber(offset);
    return decodeAt(r, t, ptr, depth, name, type);
  }
  return decodeAt(r, t, offset, depth, name, type);
}

function decodeAt(r: Reader, t: AbiType, at: number, depth: number, name: string | undefined, type: string): DecodedValue {
  switch (t.kind) {
    case 'address': {
      const w = r.word(at);
      return { type, name, value: toChecksumAddress(bytesToHex(w.subarray(12))) };
    }
    case 'bool':
      return { type, name, value: r.uint(at) === BigInt(0) ? 'false' : 'true' };
    case 'uint':
      return { type, name, value: r.uint(at).toString() };
    case 'int': {
      let n = r.uint(at);
      if (n >> BigInt(255)) n -= BigInt(1) << BigInt(256);
      return { type, name, value: n.toString() };
    }
    case 'fixedbytes':
      return { type, name, value: bytesToHex(r.word(at).subarray(0, t.size)) };
    case 'bytes':
    case 'string': {
      const len = r.safeNumber(at);
      if (at + 32 + len > r.data.length) throw new Error('Data too short');
      const bytes = r.data.subarray(at + 32, at + 32 + len);
      if (t.kind === 'string') return { type, name, value: bytesToUtf8(bytes) ?? bytesToHex(bytes) };
      return { type, name, value: bytesToHex(bytes) };
    }
    case 'array': {
      let len = t.length;
      let start = at;
      if (len === null) {
        len = r.safeNumber(at);
        start = at + 32;
      }
      if (len > MAX_ITEMS) throw new Error('Array too long');
      const step = isDynamic(t.item) ? 32 : headSize(t.item);
      const items: DecodedValue[] = [];
      for (let i = 0; i < len; i++) items.push(decodeOne(r, t.item, start, start + i * step, depth + 1));
      return { type, name, items };
    }
    case 'tuple': {
      const items: DecodedValue[] = [];
      let off = at;
      for (const c of t.components) {
        items.push(decodeOne(r, c.type, at, off, depth + 1, c.name));
        off += headSize(c.type);
      }
      return { type, name, items };
    }
  }
}

/** Decodes ABI-encoded `data` (no selector) as the given params. */
export function decodeParams(params: AbiParam[], data: Uint8Array | string): DecodedValue[] {
  const r = new Reader(typeof data === 'string' ? hexToBytes(data) : data);
  const out: DecodedValue[] = [];
  let off = 0;
  for (const p of params) {
    out.push(decodeOne(r, p.type, 0, off, 0, p.name));
    off += headSize(p.type);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Encoding (enough for eth_call and round-trip tests)

export type EncodableValue = string | number | bigint | boolean | EncodableValue[];

function encodeOne(t: AbiType, v: EncodableValue): Uint8Array {
  switch (t.kind) {
    case 'address': {
      const s = String(v);
      if (!/^0x[0-9a-fA-F]{40}$/.test(s)) throw new Error(`Not an address: ${s}`);
      return concatBytes(new Uint8Array(12), hexToBytes(s));
    }
    case 'bool':
      return bigIntToBytes(v === true || v === 'true' || v === 1 ? BigInt(1) : BigInt(0), 32);
    case 'uint': {
      const n = BigInt(v as string);
      if (n < BigInt(0) || n >> BigInt(t.bits)) throw new Error('uint out of range');
      return bigIntToBytes(n, 32);
    }
    case 'int': {
      let n = BigInt(v as string);
      if (n < BigInt(0)) n += BigInt(1) << BigInt(256);
      return bigIntToBytes(n, 32);
    }
    case 'fixedbytes': {
      const b = hexToBytes(String(v));
      if (b.length > t.size) throw new Error('bytes too long');
      const out = new Uint8Array(32);
      out.set(b);
      return out;
    }
    case 'bytes':
    case 'string': {
      const b = t.kind === 'string' ? utf8ToBytes(String(v)) : hexToBytes(String(v));
      const padded = new Uint8Array(Math.ceil(b.length / 32) * 32);
      padded.set(b);
      return concatBytes(bigIntToBytes(BigInt(b.length), 32), padded);
    }
    case 'array': {
      const items = v as EncodableValue[];
      if (t.length !== null && items.length !== t.length) throw new Error('Wrong array length');
      const body = encodeTuple(items.map(() => t.item), items);
      return t.length === null ? concatBytes(bigIntToBytes(BigInt(items.length), 32), body) : body;
    }
    case 'tuple':
      return encodeTuple(
        t.components.map((c) => c.type),
        v as EncodableValue[],
      );
  }
}

function encodeTuple(types: AbiType[], values: EncodableValue[]): Uint8Array {
  if (types.length !== values.length) throw new Error(`Expected ${types.length} values, got ${values.length}`);
  const heads: Uint8Array[] = [];
  const tails: Uint8Array[] = [];
  let headLen = types.reduce((n, t) => n + headSize(t), 0);
  for (let i = 0; i < types.length; i++) {
    const enc = encodeOne(types[i], values[i]);
    if (isDynamic(types[i])) {
      heads.push(bigIntToBytes(BigInt(headLen), 32));
      tails.push(enc);
      headLen += enc.length;
    } else heads.push(enc);
  }
  return concatBytes(...heads, ...tails);
}

export function encodeParams(types: (AbiType | string)[], values: EncodableValue[]): Uint8Array {
  return encodeTuple(
    types.map((t) => (typeof t === 'string' ? parseType(t) : t)),
    values,
  );
}

/** Calldata for `signature` with `values`, as 0x-hex. */
export function encodeCall(signature: string, values: EncodableValue[] = []): string {
  const fn = parseSignature(signature);
  return `${fn.selector}${bytesToHex(encodeTuple(fn.inputs.map((i) => i.type), values), false)}`;
}

/** Flattens a decoded value to a single display string (tuples/arrays as JSON-ish). */
export function formatDecoded(v: DecodedValue): string {
  return 'items' in v ? `[${v.items.map(formatDecoded).join(', ')}]` : v.value;
}
