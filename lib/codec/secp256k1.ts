/**
 * secp256k1 public-key recovery (ecrecover), for showing who signed a raw transaction. Verification
 * only, never signing, so constant-time arithmetic isn't needed. BigInt via BigInt() calls because
 * the project targets ES2017 (no `1n` literals).
 */
const B = (v: string | number) => BigInt(v);
const P = B('0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f');
export const CURVE_N = B('0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141');
const GX = B('0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798');
const GY = B('0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8');
const ZERO = B(0);
const ONE = B(1);
const TWO = B(2);
const THREE = B(3);
const SEVEN = B(7);

const mod = (a: bigint, m: bigint) => {
  const r = a % m;
  return r >= ZERO ? r : r + m;
};

function pow(base: bigint, exp: bigint, m: bigint): bigint {
  let result = ONE;
  let b = mod(base, m);
  let e = exp;
  while (e > ZERO) {
    if (e & ONE) result = (result * b) % m;
    b = (b * b) % m;
    e >>= ONE;
  }
  return result;
}

const inv = (a: bigint, m: bigint) => pow(a, m - TWO, m);

type J = [bigint, bigint, bigint]; // Jacobian X, Y, Z
const INF: J = [ZERO, ONE, ZERO];

function double([x, y, z]: J): J {
  if (z === ZERO || y === ZERO) return INF;
  const ysq = mod(y * y, P);
  const s = mod(B(4) * x * ysq, P);
  const m = mod(THREE * x * x, P);
  const nx = mod(m * m - TWO * s, P);
  const ny = mod(m * (s - nx) - B(8) * ysq * ysq, P);
  const nz = mod(TWO * y * z, P);
  return [nx, ny, nz];
}

function add(p: J, q: J): J {
  if (p[2] === ZERO) return q;
  if (q[2] === ZERO) return p;
  const z1z1 = mod(p[2] * p[2], P);
  const z2z2 = mod(q[2] * q[2], P);
  const u1 = mod(p[0] * z2z2, P);
  const u2 = mod(q[0] * z1z1, P);
  const s1 = mod(p[1] * q[2] * z2z2, P);
  const s2 = mod(q[1] * p[2] * z1z1, P);
  if (u1 === u2) return s1 === s2 ? double(p) : INF;
  const h = mod(u2 - u1, P);
  const r = mod(s2 - s1, P);
  const h2 = mod(h * h, P);
  const h3 = mod(h * h2, P);
  const u1h2 = mod(u1 * h2, P);
  const nx = mod(r * r - h3 - TWO * u1h2, P);
  const ny = mod(r * (u1h2 - nx) - s1 * h3, P);
  const nz = mod(h * p[2] * q[2], P);
  return [nx, ny, nz];
}

function mul(p: J, k: bigint): J {
  let result = INF;
  let addend = p;
  let n = k;
  while (n > ZERO) {
    if (n & ONE) result = add(result, addend);
    addend = double(addend);
    n >>= ONE;
  }
  return result;
}

function toAffine([x, y, z]: J): [bigint, bigint] | null {
  if (z === ZERO) return null;
  const zi = inv(z, P);
  const zi2 = mod(zi * zi, P);
  return [mod(x * zi2, P), mod(y * zi2 * zi, P)];
}

/** Recovers the uncompressed public key (x, y) from a signature over a 32-byte hash, or null if invalid. */
export function recoverPublicKey(hash: bigint, r: bigint, s: bigint, recovery: number): [bigint, bigint] | null {
  if (r <= ZERO || r >= CURVE_N || s <= ZERO || s >= CURVE_N || (recovery !== 0 && recovery !== 1)) return null;
  const x = r;
  const alpha = mod(x * x * x + SEVEN, P);
  let y = pow(alpha, (P + ONE) / B(4), P);
  if (mod(y * y, P) !== alpha) return null;
  if (Number(y & ONE) !== recovery) y = P - y;
  const e = mod(hash, CURVE_N);
  const rInv = inv(r, CURVE_N);
  const u1 = mod(-e * rInv, CURVE_N);
  const u2 = mod(s * rInv, CURVE_N);
  const q = add(mul([GX, GY, ONE], u1), mul([x, y, ONE], u2));
  return toAffine(q);
}
