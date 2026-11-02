/**
 * BLAKE2b (RFC 7693), unkeyed, variable output length. Used for Polkadot/Kusama SS58 checksums.
 * 64-bit words are emulated with lo/hi 32-bit halves.
 */
import { utf8ToBytes } from '@/lib/codec/bytes';

const IV = new Uint32Array([
  0xf3bcc908, 0x6a09e667, 0x84caa73b, 0xbb67ae85, 0xfe94f82b, 0x3c6ef372, 0x5f1d36f1, 0xa54ff53a, 0xade682d1,
  0x510e527f, 0x2b3e6c1f, 0x9b05688c, 0xfb41bd6b, 0x1f83d9ab, 0x137e2179, 0x5be0cd19,
]);

const SIGMA = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  [14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3],
  [11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4],
  [7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8],
  [9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13],
  [2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9],
  [12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11],
  [13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10],
  [6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5],
  [10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0],
];

// v and m are arrays of lo/hi pairs: word i is (lo = a[2i], hi = a[2i+1]).
function add64(v: Uint32Array, a: number, b: number) {
  const lo = v[a] + v[b];
  const hi = v[a + 1] + v[b + 1] + (lo >= 0x100000000 ? 1 : 0);
  v[a] = lo;
  v[a + 1] = hi;
}
function addM(v: Uint32Array, a: number, m: Uint32Array, i: number) {
  const lo = v[a] + m[i];
  const hi = v[a + 1] + m[i + 1] + (lo >= 0x100000000 ? 1 : 0);
  v[a] = lo;
  v[a + 1] = hi;
}
function xorRot(v: Uint32Array, a: number, b: number, n: number) {
  const xlo = v[a] ^ v[b];
  const xhi = v[a + 1] ^ v[b + 1];
  if (n === 32) {
    v[a] = xhi;
    v[a + 1] = xlo;
  } else if (n < 32) {
    v[a] = (xlo >>> n) | (xhi << (32 - n));
    v[a + 1] = (xhi >>> n) | (xlo << (32 - n));
  } else {
    const k = n - 32;
    v[a] = (xhi >>> k) | (xlo << (32 - k));
    v[a + 1] = (xlo >>> k) | (xhi << (32 - k));
  }
}

function G(v: Uint32Array, m: Uint32Array, a: number, b: number, c: number, d: number, x: number, y: number) {
  a *= 2;
  b *= 2;
  c *= 2;
  d *= 2;
  add64(v, a, b);
  addM(v, a, m, x * 2);
  xorRot(v, d, a, 32);
  add64(v, c, d);
  xorRot(v, b, c, 24);
  add64(v, a, b);
  addM(v, a, m, y * 2);
  xorRot(v, d, a, 16);
  add64(v, c, d);
  xorRot(v, b, c, 63);
}

export function blake2b(input: Uint8Array | string, outLen = 64): Uint8Array {
  const data = typeof input === 'string' ? utf8ToBytes(input) : input;
  const h = new Uint32Array(IV);
  h[0] ^= 0x01010000 ^ outLen;
  const v = new Uint32Array(32);
  const m = new Uint32Array(32);
  const block = new Uint8Array(128);
  let t = 0;

  const compress = (last: boolean) => {
    for (let i = 0; i < 16; i++) v[i] = h[i];
    for (let i = 0; i < 16; i++) v[i + 16] = IV[i];
    v[24] ^= t >>> 0;
    v[25] ^= Math.floor(t / 0x100000000);
    if (last) {
      v[28] = ~v[28];
      v[29] = ~v[29];
    }
    for (let i = 0; i < 32; i++) {
      m[i] = block[i * 4] | (block[i * 4 + 1] << 8) | (block[i * 4 + 2] << 16) | (block[i * 4 + 3] << 24);
    }
    for (let r = 0; r < 12; r++) {
      const s = SIGMA[r % 10];
      G(v, m, 0, 4, 8, 12, s[0], s[1]);
      G(v, m, 1, 5, 9, 13, s[2], s[3]);
      G(v, m, 2, 6, 10, 14, s[4], s[5]);
      G(v, m, 3, 7, 11, 15, s[6], s[7]);
      G(v, m, 0, 5, 10, 15, s[8], s[9]);
      G(v, m, 1, 6, 11, 12, s[10], s[11]);
      G(v, m, 2, 7, 8, 13, s[12], s[13]);
      G(v, m, 3, 4, 9, 14, s[14], s[15]);
    }
    for (let i = 0; i < 16; i++) h[i] ^= v[i] ^ v[i + 16];
  };

  let off = 0;
  // Every full block except the final one is compressed as non-final.
  while (data.length - off > 128) {
    block.set(data.subarray(off, off + 128));
    t += 128;
    compress(false);
    off += 128;
  }
  block.fill(0);
  block.set(data.subarray(off));
  t += data.length - off;
  compress(true);

  const out = new Uint8Array(outLen);
  for (let i = 0; i < outLen; i++) out[i] = (h[i >> 2] >>> (8 * (i & 3))) & 0xff;
  return out;
}
