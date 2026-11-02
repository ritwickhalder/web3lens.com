/**
 * Decodes a signed raw EVM transaction (legacy, EIP-2930, EIP-1559, EIP-4844 blob, EIP-7702) and
 * recovers the sender from the signature. Runs entirely locally; nothing is broadcast.
 */
import { bigIntToBytes, bytesToBigInt, bytesToHex, concatBytes, hexToBytes } from '@/lib/codec/bytes';
import { keccak256 } from '@/lib/codec/keccak';
import { rlpDecode, rlpEncode, type RlpItem } from '@/lib/codec/rlp';
import { CURVE_N, recoverPublicKey } from '@/lib/codec/secp256k1';
import { toChecksumAddress } from '@/lib/evm/address';
import { decodeCalldata, type DecodedCall } from '@/lib/evm/signatures';
import { formatUnits } from '@/lib/tools/units';

export type DecodedTx = {
  type: number;
  typeName: string;
  hash: string;
  chainId: number | null;
  nonce: string;
  to: string | null;
  valueWei: string;
  value: string;
  gasLimit: string;
  gasPriceWei?: string;
  maxFeePerGasWei?: string;
  maxPriorityFeePerGasWei?: string;
  maxFeePerBlobGasWei?: string;
  blobHashes?: string[];
  accessList?: { address: string; storageKeys: string[] }[];
  authorizations?: { chainId: string; address: string; nonce: string; signer: string | null }[];
  data: string;
  from: string | null;
  /** Upper bound on the fee: gas limit × (max) gas price. */
  maxFeeWei: string;
  signature: { v: string; r: string; s: string };
  warnings: string[];
  call: DecodedCall[];
};

const TYPE_NAMES: Record<number, string> = {
  0: 'Legacy',
  1: 'EIP-2930 (access list)',
  2: 'EIP-1559',
  3: 'EIP-4844 (blob)',
  4: 'EIP-7702 (set code)',
};

const asBytes = (i: RlpItem | undefined, field: string): Uint8Array => {
  if (!(i instanceof Uint8Array)) throw new Error(`Field ${field} should be a value, not a list`);
  return i;
};
const asList = (i: RlpItem | undefined, field: string): RlpItem[] => {
  if (!Array.isArray(i)) throw new Error(`Field ${field} should be a list`);
  return i;
};
const num = (i: RlpItem | undefined, field: string) => bytesToBigInt(asBytes(i, field));
const addr = (i: RlpItem | undefined, field: string): string | null => {
  const b = asBytes(i, field);
  if (b.length === 0) return null;
  if (b.length !== 20) throw new Error(`Field ${field} is not a 20-byte address`);
  return toChecksumAddress(bytesToHex(b));
};

function recoverAddress(payload: Uint8Array, recovery: number, r: bigint, s: bigint): string | null {
  const hash = bytesToBigInt(keccak256(payload));
  const pub = recoverPublicKey(hash, r, s, recovery);
  if (!pub) return null;
  const raw = concatBytes(bigIntToBytes(pub[0], 32), bigIntToBytes(pub[1], 32));
  return toChecksumAddress(bytesToHex(keccak256(raw).slice(12)));
}

export function decodeRawTransaction(input: string): DecodedTx {
  const raw = hexToBytes(input.trim());
  if (raw.length < 3) throw new Error('Too short to be a transaction');
  const warnings: string[] = [];
  const type = raw[0] >= 0xc0 ? 0 : raw[0];
  if (type > 0x7f) throw new Error('Not a transaction');
  if (!(type in TYPE_NAMES)) throw new Error(`Unknown transaction type 0x${type.toString(16)}`);
  const body = type === 0 ? raw : raw.subarray(1);
  let fields = asList(rlpDecode(body), 'transaction');

  // EIP-4844 network form wraps [tx, blobs, commitments, proofs]; keep only the tx.
  if (type === 3 && Array.isArray(fields[0])) {
    fields = fields[0];
    warnings.push('This is the network (blob-carrying) form; blobs were ignored.');
  }

  const expected = { 0: 9, 1: 11, 2: 12, 3: 14, 4: 13 }[type as 0 | 1 | 2 | 3 | 4];
  if (fields.length !== expected) throw new Error(`A ${TYPE_NAMES[type]} transaction has ${expected} fields; this has ${fields.length}`);

  const sigStart = fields.length - 3;
  const vRaw = num(fields[sigStart], 'v');
  const r = num(fields[sigStart + 1], 'r');
  const s = num(fields[sigStart + 2], 's');
  if (s > CURVE_N / BigInt(2)) warnings.push('Signature s is in the upper half (not allowed since Homestead); nodes will reject it.');

  let chainId: bigint | null;
  let recovery: number;
  let payload: Uint8Array;
  const unsigned = fields.slice(0, sigStart);
  if (type === 0) {
    if (vRaw === BigInt(27) || vRaw === BigInt(28)) {
      chainId = null;
      recovery = Number(vRaw - BigInt(27));
      payload = rlpEncode(unsigned);
      warnings.push('No chain id (pre-EIP-155): this signature is valid on every EVM chain.');
    } else if (vRaw >= BigInt(35)) {
      chainId = (vRaw - BigInt(35)) / BigInt(2);
      recovery = Number((vRaw - BigInt(35)) % BigInt(2));
      payload = rlpEncode([...unsigned, bigIntToBytes(chainId), new Uint8Array(0), new Uint8Array(0)]);
    } else throw new Error(`Invalid legacy v value ${vRaw}`);
  } else {
    chainId = num(fields[0], 'chainId');
    recovery = Number(vRaw);
    payload = concatBytes(Uint8Array.of(type), rlpEncode(unsigned));
  }
  const from = recoverAddress(payload, recovery, r, s);
  if (!from) warnings.push('The signature is invalid: no sender could be recovered.');

  const at = type === 0 ? 0 : 1; // field offset after chainId
  const nonce = num(fields[at], 'nonce');
  let gasLimit: bigint;
  let to: string | null;
  let value: bigint;
  let data: Uint8Array;
  const out: Partial<DecodedTx> = {};
  let maxPrice: bigint;
  if (type === 0 || type === 1) {
    const gasPrice = num(fields[at + 1], 'gasPrice');
    gasLimit = num(fields[at + 2], 'gasLimit');
    to = addr(fields[at + 3], 'to');
    value = num(fields[at + 4], 'value');
    data = asBytes(fields[at + 5], 'data');
    out.gasPriceWei = gasPrice.toString();
    maxPrice = gasPrice;
    if (type === 1) out.accessList = parseAccessList(fields[at + 6]);
  } else {
    const prio = num(fields[2], 'maxPriorityFeePerGas');
    const maxFee = num(fields[3], 'maxFeePerGas');
    gasLimit = num(fields[4], 'gasLimit');
    to = addr(fields[5], 'to');
    value = num(fields[6], 'value');
    data = asBytes(fields[7], 'data');
    out.accessList = parseAccessList(fields[8]);
    out.maxPriorityFeePerGasWei = prio.toString();
    out.maxFeePerGasWei = maxFee.toString();
    maxPrice = maxFee;
    if (prio > maxFee) warnings.push('maxPriorityFeePerGas is higher than maxFeePerGas; nodes will reject it.');
    if (type === 3) {
      out.maxFeePerBlobGasWei = num(fields[9], 'maxFeePerBlobGas').toString();
      out.blobHashes = asList(fields[10], 'blobVersionedHashes').map((h) => bytesToHex(asBytes(h, 'blob hash')));
    }
    if (type === 4) {
      out.authorizations = asList(fields[9], 'authorizationList').map((a, i) => {
        const t = asList(a, `authorization ${i}`);
        const aChain = num(t[0], 'auth chainId');
        const aAddr = addr(t[1], 'auth address');
        const aNonce = num(t[2], 'auth nonce');
        const yParity = Number(num(t[3], 'auth yParity'));
        const signer = recoverAddress(
          concatBytes(Uint8Array.of(0x05), rlpEncode([asBytes(t[0], 'c'), asBytes(t[1], 'a'), asBytes(t[2], 'n')])),
          yParity,
          num(t[4], 'auth r'),
          num(t[5], 'auth s'),
        );
        return { chainId: aChain.toString(), address: aAddr ?? '', nonce: aNonce.toString(), signer };
      });
      warnings.push('EIP-7702: the signers below hand control of their accounts to the listed contract code. Only sign this if you trust that code.');
    }
  }
  if (!to && type !== 3 && type !== 4) warnings.push('No recipient: this transaction deploys a contract.');

  const dataHex = bytesToHex(data);
  return {
    type,
    typeName: TYPE_NAMES[type],
    hash: bytesToHex(keccak256(raw)),
    chainId: chainId === null ? null : Number(chainId),
    nonce: nonce.toString(),
    to,
    valueWei: value.toString(),
    value: formatUnits(value, 18),
    gasLimit: gasLimit.toString(),
    ...out,
    data: dataHex,
    from,
    maxFeeWei: (gasLimit * maxPrice).toString(),
    signature: { v: vRaw.toString(), r: bytesToHex(bigIntToBytes(r, 32)), s: bytesToHex(bigIntToBytes(s, 32)) },
    warnings,
    call: dataHex !== '0x' ? decodeCalldata(dataHex) : [],
  };
}

function parseAccessList(item: RlpItem | undefined): { address: string; storageKeys: string[] }[] {
  return asList(item, 'accessList').map((entry, i) => {
    const e = asList(entry, `access list ${i}`);
    return {
      address: addr(e[0], 'access list address') ?? '',
      storageKeys: asList(e[1], 'storage keys').map((k) => bytesToHex(asBytes(k, 'storage key'))),
    };
  });
}
