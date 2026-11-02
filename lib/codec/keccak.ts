/**
 * Keccak-256 (the pre-NIST padding Ethereum uses, not SHA3-256). 64-bit lanes are kept as
 * pairs of 32-bit halves so it runs fast without BigInt. Verified against the standard vectors
 * in scripts/test/codec.test.ts.
 */
import { utf8ToBytes } from '@/lib/codec/bytes';

const RC_HI = new Uint32Array(24);
const RC_LO = new Uint32Array(24);
(() => {
  // Round constants from the LFSR in the Keccak reference.
  let r = 1;
  for (let i = 0; i < 24; i++) {
    let hi = 0;
    let lo = 0;
    for (let j = 0; j < 7; j++) {
      r = ((r << 1) ^ ((r >> 7) * 0x71)) % 256;
      if (r & 2) {
        const bit = (1 << j) - 1;
        if (bit < 32) lo ^= 1 << bit;
        else hi ^= 1 << (bit - 32);
      }
    }
    RC_HI[i] = hi >>> 0;
    RC_LO[i] = lo >>> 0;
  }
})();

// Rotation offsets and lane permutation (rho + pi), in the order the lanes are visited.
const ROT: number[] = [];
const PI: number[] = [];
(() => {
  let x = 1;
  let y = 0;
  for (let t = 0; t < 24; t++) {
    ROT.push((((t + 1) * (t + 2)) / 2) % 64);
    [x, y] = [y, (2 * x + 3 * y) % 5];
    PI.push(x + 5 * y);
  }
})();

function keccakF(s: Uint32Array) {
  // s holds 25 lanes as [lo, hi] pairs.
  const c = new Uint32Array(10);
  for (let round = 0; round < 24; round++) {
    // theta
    for (let x = 0; x < 5; x++) {
      c[x * 2] = s[x * 2] ^ s[x * 2 + 10] ^ s[x * 2 + 20] ^ s[x * 2 + 30] ^ s[x * 2 + 40];
      c[x * 2 + 1] = s[x * 2 + 1] ^ s[x * 2 + 11] ^ s[x * 2 + 21] ^ s[x * 2 + 31] ^ s[x * 2 + 41];
    }
    for (let x = 0; x < 5; x++) {
      const nx = ((x + 1) % 5) * 2;
      const px = ((x + 4) % 5) * 2;
      const lo = c[px] ^ ((c[nx] << 1) | (c[nx + 1] >>> 31));
      const hi = c[px + 1] ^ ((c[nx + 1] << 1) | (c[nx] >>> 31));
      for (let y = 0; y < 25; y += 5) {
        s[(x + y) * 2] ^= lo;
        s[(x + y) * 2 + 1] ^= hi;
      }
    }
    // rho + pi
    let curLo = s[2];
    let curHi = s[3];
    for (let t = 0; t < 24; t++) {
      const j = PI[t];
      const tmpLo = s[j * 2];
      const tmpHi = s[j * 2 + 1];
      const r = ROT[t];
      let lo: number;
      let hi: number;
      if (r === 0) {
        lo = curLo;
        hi = curHi;
      } else if (r < 32) {
        lo = (curLo << r) | (curHi >>> (32 - r));
        hi = (curHi << r) | (curLo >>> (32 - r));
      } else if (r === 32) {
        lo = curHi;
        hi = curLo;
      } else {
        const k = r - 32;
        lo = (curHi << k) | (curLo >>> (32 - k));
        hi = (curLo << k) | (curHi >>> (32 - k));
      }
      s[j * 2] = lo;
      s[j * 2 + 1] = hi;
      curLo = tmpLo;
      curHi = tmpHi;
    }
    // chi
    for (let y = 0; y < 25; y += 5) {
      for (let x = 0; x < 5; x++) {
        c[x * 2] = s[(y + x) * 2];
        c[x * 2 + 1] = s[(y + x) * 2 + 1];
      }
      for (let x = 0; x < 5; x++) {
        const a = ((x + 1) % 5) * 2;
        const b = ((x + 2) % 5) * 2;
        s[(y + x) * 2] ^= ~c[a] & c[b];
        s[(y + x) * 2 + 1] ^= ~c[a + 1] & c[b + 1];
      }
    }
    // iota
    s[0] ^= RC_LO[round];
    s[1] ^= RC_HI[round];
  }
}

export function keccak256(input: Uint8Array | string): Uint8Array {
  const data = typeof input === 'string' ? utf8ToBytes(input) : input;
  const rate = 136;
  const s = new Uint32Array(50);
  const padded = new Uint8Array(Math.ceil((data.length + 1) / rate) * rate);
  padded.set(data);
  padded[data.length] ^= 0x01;
  padded[padded.length - 1] ^= 0x80;
  for (let off = 0; off < padded.length; off += rate) {
    for (let i = 0; i < rate / 4; i++) {
      const p = off + i * 4;
      s[i] ^= padded[p] | (padded[p + 1] << 8) | (padded[p + 2] << 16) | (padded[p + 3] << 24);
    }
    keccakF(s);
  }
  const out = new Uint8Array(32);
  for (let i = 0; i < 8; i++) {
    const w = s[i];
    out[i * 4] = w & 0xff;
    out[i * 4 + 1] = (w >>> 8) & 0xff;
    out[i * 4 + 2] = (w >>> 16) & 0xff;
    out[i * 4 + 3] = (w >>> 24) & 0xff;
  }
  return out;
}
