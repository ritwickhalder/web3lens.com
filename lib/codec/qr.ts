/**
 * QR code encoder (ISO/IEC 18004): byte mode, error correction level M, versions 1–10 (up to 213
 * bytes, enough for any address, hash or payment URI). Pure, no dependencies; the site and the
 * extensions render the matrix as SVG. Verified module-for-module against a reference implementation
 * in scripts/test/qr.test.ts.
 */
import { utf8ToBytes } from '@/lib/codec/bytes';

// Level M block structure per version: [ec codewords per block, [blocks, data codewords per block][]]
const BLOCKS: [number, [number, number][]][] = [
  [10, [[1, 16]]],
  [16, [[1, 28]]],
  [26, [[1, 44]]],
  [18, [[2, 32]]],
  [24, [[2, 43]]],
  [16, [[4, 27]]],
  [18, [[4, 31]]],
  [22, [[2, 38], [2, 39]]],
  [22, [[3, 36], [2, 37]]],
  [26, [[4, 43], [1, 44]]],
];
const ALIGN: number[][] = [[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
const REMAINDER_BITS = [0, 7, 7, 7, 7, 7, 0, 0, 0, 0];
const MAX_VERSION = 10;

// GF(256) with the QR polynomial x^8 + x^4 + x^3 + x^2 + 1.
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();
const mul = (a: number, b: number) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

function generator(degree: number): number[] {
  let g = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) {
      next[j] ^= g[j];
      next[j + 1] ^= mul(g[j], EXP[i]);
    }
    g = next;
  }
  return g;
}

function ecCodewords(data: number[], degree: number): number[] {
  const gen = generator(degree);
  const rem = [...data, ...new Array(degree).fill(0)];
  for (let i = 0; i < data.length; i++) {
    const coef = rem[i];
    if (coef !== 0) for (let j = 0; j < gen.length; j++) rem[i + j] ^= mul(gen[j], coef);
  }
  return rem.slice(data.length);
}

const dataCapacity = (v: number) => BLOCKS[v - 1][1].reduce((n, [blocks, dc]) => n + blocks * dc, 0);

function encodeData(bytes: Uint8Array, version: number): number[] {
  const bits: number[] = [];
  const push = (value: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  push(0b0100, 4); // byte mode
  push(bytes.length, version < 10 ? 8 : 16);
  for (const b of bytes) push(b, 8);
  const capacityBits = dataCapacity(version) * 8;
  push(0, Math.min(4, capacityBits - bits.length)); // terminator
  while (bits.length % 8) bits.push(0);
  const out: number[] = [];
  for (let i = 0; i < bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  for (let pad = 0xec; out.length < dataCapacity(version); pad = pad === 0xec ? 0x11 : 0xec) out.push(pad);
  return out;
}

function interleave(data: number[], version: number): number[] {
  const [ecLen, groups] = BLOCKS[version - 1];
  const blocks: number[][] = [];
  let offset = 0;
  for (const [count, dc] of groups) {
    for (let i = 0; i < count; i++) {
      blocks.push(data.slice(offset, offset + dc));
      offset += dc;
    }
  }
  const ecs = blocks.map((b) => ecCodewords(b, ecLen));
  const out: number[] = [];
  const maxData = Math.max(...blocks.map((b) => b.length));
  for (let i = 0; i < maxData; i++) for (const b of blocks) if (i < b.length) out.push(b[i]);
  for (let i = 0; i < ecLen; i++) for (const e of ecs) out.push(e[i]);
  return out;
}

function bch(value: number, poly: number, polyBits: number): number {
  let v = value << (polyBits - 1);
  for (let i = 31 - Math.clz32(v); i >= polyBits - 1; i--) if ((v >>> i) & 1) v ^= poly << (i - (polyBits - 1));
  return v;
}

type Grid = { size: number; dark: Uint8Array; reserved: Uint8Array };

function newGrid(version: number): Grid {
  const size = version * 4 + 17;
  return { size, dark: new Uint8Array(size * size), reserved: new Uint8Array(size * size) };
}

function set(g: Grid, x: number, y: number, dark: boolean, reserve = true) {
  g.dark[y * g.size + x] = dark ? 1 : 0;
  if (reserve) g.reserved[y * g.size + x] = 1;
}

function placeFunctionPatterns(g: Grid, version: number) {
  const { size } = g;
  const finder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        set(g, x, y, d !== 2 && d !== 4);
      }
    }
  };
  finder(3, 3);
  finder(size - 4, 3);
  finder(3, size - 4);
  for (let i = 8; i < size - 8; i++) {
    set(g, i, 6, i % 2 === 0);
    set(g, 6, i, i % 2 === 0);
  }
  const pos = ALIGN[version - 1];
  for (const ay of pos) {
    for (const ax of pos) {
      if ((ax === 6 && ay === 6) || (ax === 6 && ay === size - 7) || (ax === size - 7 && ay === 6)) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(g, ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }
  // Reserve format areas (filled later) and the always-dark module.
  for (let i = 0; i < 9; i++) {
    g.reserved[8 * size + i] = 1;
    g.reserved[i * size + 8] = 1;
  }
  for (let i = 0; i < 8; i++) {
    g.reserved[8 * size + (size - 1 - i)] = 1;
    g.reserved[(size - 1 - i) * size + 8] = 1;
  }
  set(g, 8, size - 8, true);
  if (version >= 7) {
    const bits = (version << 12) | bch(version, 0x1f25, 13);
    for (let i = 0; i < 18; i++) {
      const dark = ((bits >>> i) & 1) === 1;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      set(g, a, b, dark);
      set(g, b, a, dark);
    }
  }
}

function placeData(g: Grid, codewords: number[], remainder: number) {
  const { size } = g;
  const bits: number[] = [];
  for (const c of codewords) for (let i = 7; i >= 0; i--) bits.push((c >>> i) & 1);
  for (let i = 0; i < remainder; i++) bits.push(0);
  let i = 0;
  let upward = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      const y = upward ? size - 1 - vert : vert;
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        if (g.reserved[y * size + x]) continue;
        g.dark[y * size + x] = i < bits.length ? bits[i] : 0;
        i++;
      }
    }
    upward = !upward;
  }
}

const MASKS: ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

function applyMask(g: Grid, mask: number): Uint8Array {
  const out = g.dark.slice();
  for (let y = 0; y < g.size; y++) for (let x = 0; x < g.size; x++) if (!g.reserved[y * g.size + x] && MASKS[mask](x, y)) out[y * g.size + x] ^= 1;
  return out;
}

function placeFormat(dark: Uint8Array, size: number, mask: number) {
  // Level M = 0b00.
  const data = (0b00 << 3) | mask;
  const bits = ((data << 10) | bch(data, 0x537, 11)) ^ 0x5412;
  const at = (x: number, y: number, i: number) => (dark[y * size + x] = (bits >>> i) & 1);
  for (let i = 0; i <= 5; i++) at(8, i, i);
  at(8, 7, 6);
  at(8, 8, 7);
  at(7, 8, 8);
  for (let i = 9; i < 15; i++) at(14 - i, 8, i);
  for (let i = 0; i < 8; i++) at(size - 1 - i, 8, i);
  for (let i = 8; i < 15; i++) at(8, size - 15 + i, i);
  dark[(size - 8) * size + 8] = 1;
}

/** ISO 18004 penalty score; the mask with the lowest score is used. */
function penalty(dark: Uint8Array, size: number): number {
  let score = 0;
  const get = (x: number, y: number) => dark[y * size + x];
  for (let pass = 0; pass < 2; pass++) {
    for (let a = 0; a < size; a++) {
      let run = 1;
      for (let b = 1; b < size; b++) {
        const cur = pass ? get(a, b) : get(b, a);
        const prev = pass ? get(a, b - 1) : get(b - 1, a);
        if (cur === prev) run++;
        else {
          if (run >= 5) score += run - 2;
          run = 1;
        }
      }
      if (run >= 5) score += run - 2;
    }
  }
  for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) {
    const c = get(x, y);
    if (c === get(x + 1, y) && c === get(x, y + 1) && c === get(x + 1, y + 1)) score += 3;
  }
  const patterns = [
    [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1],
  ];
  for (let a = 0; a < size; a++) {
    for (let b = 0; b <= size - 11; b++) {
      for (const p of patterns) {
        let h = true;
        let v = true;
        for (let k = 0; k < 11; k++) {
          if (get(b + k, a) !== p[k]) h = false;
          if (get(a, b + k) !== p[k]) v = false;
        }
        if (h) score += 40;
        if (v) score += 40;
      }
    }
  }
  const darkCount = dark.reduce((n, d) => n + d, 0);
  score += Math.floor(Math.abs((darkCount * 100) / (size * size) - 50) / 5) * 10;
  return score;
}

export type QrMatrix = { size: number; version: number; mask: number; modules: boolean[][] };

/** Encodes `text` (UTF-8). `mask` forces a mask pattern (tests); otherwise the lowest-penalty one is chosen. */
export function encodeQr(text: string, { mask: forcedMask, version: forcedVersion }: { mask?: number; version?: number } = {}): QrMatrix {
  const bytes = utf8ToBytes(text);
  let version = forcedVersion ?? 1;
  const fits = (v: number) => 4 + (v < 10 ? 8 : 16) + bytes.length * 8 <= dataCapacity(v) * 8;
  while (version <= MAX_VERSION && !fits(version)) version++;
  if (version > MAX_VERSION) throw new Error(`Too long for a QR code here (max ${dataCapacity(MAX_VERSION) - 2} bytes)`);
  const g = newGrid(version);
  placeFunctionPatterns(g, version);
  placeData(g, interleave(encodeData(bytes, version), version), REMAINDER_BITS[version - 1]);
  let best: { mask: number; dark: Uint8Array; score: number } | null = null;
  for (let m = 0; m < 8; m++) {
    if (forcedMask !== undefined && m !== forcedMask) continue;
    const dark = applyMask(g, m);
    placeFormat(dark, g.size, m);
    const score = forcedMask !== undefined ? 0 : penalty(dark, g.size);
    if (!best || score < best.score) best = { mask: m, dark, score };
  }
  const modules = Array.from({ length: g.size }, (_, y) => Array.from({ length: g.size }, (_, x) => best!.dark[y * g.size + x] === 1));
  return { size: g.size, version, mask: best!.mask, modules };
}

/** SVG path data ("M x y h1 v1 h-1 z" per dark module), with a 4-module quiet zone included in the viewBox. */
export function qrSvgPath(m: QrMatrix): { path: string; viewBox: string } {
  let path = '';
  for (let y = 0; y < m.size; y++) for (let x = 0; x < m.size; x++) if (m.modules[y][x]) path += `M${x + 4} ${y + 4}h1v1h-1z`;
  return { path, viewBox: `0 0 ${m.size + 8} ${m.size + 8}` };
}
