/**
 * Guesses what a pasted query is (address, transaction hash, name, block) and which chains it
 * could belong to, so people don't have to pick a chain first. Checksums are verified where the
 * format has one (EIP-55, base58check, bech32/bech32m, CashAddr, SS58, Stellar and TON CRC16).
 *
 * Pure and dependency-free: the browser extensions bundle this same file.
 * Chain ids refer to data/chains.json + data/chains-extra.json.
 */
import { base32Decode, crc16xmodem } from '@/lib/codec/base32';
import { base58CheckDecode, base58Decode, RIPPLE_ALPHABET } from '@/lib/codec/base58';
import { bech32Decode, isSegwitAddress } from '@/lib/codec/bech32';
import { blake2b } from '@/lib/codec/blake2b';
import { concatBytes, equalBytes, utf8ToBytes } from '@/lib/codec/bytes';
import { isCashAddr } from '@/lib/codec/cashaddr';
import { evmChecksumStatus, toChecksumAddress } from '@/lib/evm/address';

export type DetectionKind = 'address' | 'transaction' | 'name' | 'block' | 'secret';

export type Detection = {
  kind: DetectionKind;
  /** Short human label, e.g. "EVM address". */
  label: string;
  /** Candidate chain ids, best guess first. */
  chains: string[];
  /** Stable machine id of the format, e.g. `evm-address`. */
  format: string;
  /** The query as it should be searched (checksummed EVM address, URI prefix removed, …). */
  normalized: string;
  /**
   * `valid`/`invalid`: the format's checksum was verified. `none`: the format (or this spelling of it,
   * e.g. an all-lowercase EVM address) carries no checksum. `unverified`: it has one we don't check.
   */
  checksum: 'valid' | 'invalid' | 'none' | 'unverified';
  network?: 'testnet';
  /** Warning to show next to the result. */
  note?: string;
};

/** EVM chains an `0x` address or hash may live on, most used first. */
export const EVM_CHAINS = [
  'ethereum',
  'base',
  'arbitrum',
  'optimism',
  'polygon',
  'binancecoin',
  'avalanche',
  'linea',
  'zksync',
  'scroll',
  'gnosischain',
  'celo',
  'mantle',
  'ethereumclassic',
];

const B58 = /^[1-9A-HJ-NP-Za-km-z]+$/;
const BAD_CHECKSUM = 'The checksum does not match. The value may contain a typo; check it before sending funds.';

type Partial = Omit<Detection, 'normalized' | 'checksum'> & { normalized?: string; checksum?: Detection['checksum'] };

function make(q: string, d: Partial): Detection {
  return { checksum: 'none', ...d, normalized: d.normalized ?? q };
}

/** base58check version byte → what the address is. */
const BASE58_VERSIONS: Record<number, { label: string; chains: string[]; format: string; testnet?: boolean }> = {
  0x00: { label: 'Bitcoin address', chains: ['bitcoin', 'bitcoincash'], format: 'btc-p2pkh' },
  0x05: { label: 'Bitcoin address', chains: ['bitcoin', 'bitcoincash'], format: 'btc-p2sh' },
  0x6f: { label: 'Bitcoin testnet address', chains: ['bitcoin'], format: 'btc-testnet', testnet: true },
  0xc4: { label: 'Bitcoin testnet address', chains: ['bitcoin'], format: 'btc-testnet', testnet: true },
  0x30: { label: 'Litecoin address', chains: ['litecoin'], format: 'ltc-p2pkh' },
  0x32: { label: 'Litecoin address', chains: ['litecoin'], format: 'ltc-p2sh' },
  0x1e: { label: 'Dogecoin address', chains: ['dogecoin'], format: 'doge-p2pkh' },
  0x16: { label: 'Dogecoin address', chains: ['dogecoin'], format: 'doge-p2sh' },
  0x4c: { label: 'Dash address', chains: ['dash'], format: 'dash-p2pkh' },
  0x10: { label: 'Dash address', chains: ['dash'], format: 'dash-p2sh' },
  0x41: { label: 'Tron address', chains: ['tron'], format: 'tron-address' },
};

/** First characters each base58check version produces, to label an address whose checksum fails. */
const BASE58_LEADS: [RegExp, number][] = [
  [/^1/, 0x00],
  [/^3/, 0x05],
  [/^[mn]/, 0x6f],
  [/^2/, 0xc4],
  [/^L/, 0x30],
  [/^M/, 0x32],
  [/^D/, 0x1e],
  [/^X/, 0x4c],
  [/^T/, 0x41],
];

const BECH32_HRPS: Record<string, { label: string; chains: string[]; format: string; testnet?: boolean; segwit?: boolean }> = {
  bc: { label: 'Bitcoin address', chains: ['bitcoin'], format: 'btc-segwit', segwit: true },
  tb: { label: 'Bitcoin testnet address', chains: ['bitcoin'], format: 'btc-testnet', testnet: true, segwit: true },
  ltc: { label: 'Litecoin address', chains: ['litecoin'], format: 'ltc-segwit', segwit: true },
  cosmos: { label: 'Cosmos address', chains: ['cosmos'], format: 'cosmos-address' },
  osmo: { label: 'Osmosis address', chains: ['osmosis'], format: 'osmosis-address' },
  celestia: { label: 'Celestia address', chains: ['celestia'], format: 'celestia-address' },
  inj: { label: 'Injective address', chains: ['injective'], format: 'injective-address' },
  addr: { label: 'Cardano address', chains: ['cardano'], format: 'cardano-address' },
  stake: { label: 'Cardano stake address', chains: ['cardano'], format: 'cardano-stake' },
  addr_test: { label: 'Cardano testnet address', chains: ['cardano'], format: 'cardano-address', testnet: true },
};

function detectBech32(q: string): Detection | null {
  const m = /^([a-z_]{1,20})1[02-9ac-hj-np-z]{6,}$/i.exec(q);
  if (!m) return null;
  const hrp = m[1].toLowerCase();
  const known = BECH32_HRPS[hrp];
  const decoded = bech32Decode(q, 130);
  const normalized = q.toLowerCase();
  if (known) {
    const ok = decoded !== null && (!known.segwit || isSegwitAddress(q, hrp));
    return make(q, {
      kind: 'address',
      label: known.label,
      chains: known.chains,
      format: known.format,
      normalized,
      checksum: ok ? 'valid' : 'invalid',
      network: known.testnet ? 'testnet' : undefined,
      note: ok ? undefined : BAD_CHECKSUM,
    });
  }
  if (!decoded) return null;
  return make(q, {
    kind: 'address',
    label: `Bech32 address (${hrp})`,
    chains: [],
    format: 'bech32',
    normalized,
    checksum: 'valid',
    note: `A valid bech32 address for "${hrp}", a network Web3Lens doesn't list yet.`,
  });
}

const SS58_PREFIX = utf8ToBytes('SS58PRE');

function detectBase58(q: string): Detection | null {
  if (!B58.test(q)) return null;

  // XRP uses its own base58 alphabet.
  if (q.startsWith('r') && q.length >= 25 && q.length <= 35) {
    const p = base58CheckDecode(q, RIPPLE_ALPHABET);
    if (p && p.length === 21 && p[0] === 0) {
      return make(q, { kind: 'address', label: 'XRP address', chains: ['ripple'], format: 'xrp-address', checksum: 'valid' });
    }
  }

  // Tezos: tz1/tz2/tz3 accounts, KT1 contracts, o… operation hashes.
  if (/^(tz[123]|KT1)/.test(q) && q.length === 36) {
    const ok = base58CheckDecode(q)?.length === 23;
    // A 36-character Solana address can start with "tz1" too; only claim it when the checksum agrees or it isn't 32 bytes.
    if (ok || base58Decode(q)?.length !== 32) return make(q, {
      kind: 'address',
      label: 'Tezos address',
      chains: ['tezos'],
      format: 'tezos-address',
      checksum: ok ? 'valid' : 'invalid',
      note: ok ? undefined : BAD_CHECKSUM,
    });
  }
  if (/^o/.test(q) && q.length === 51 && base58CheckDecode(q)?.length === 34) {
    return make(q, { kind: 'transaction', label: 'Tezos operation hash', chains: ['tezos'], format: 'tezos-op', checksum: 'valid' });
  }

  const raw = base58Decode(q);
  if (!raw) return null;

  if (raw.length === 25) {
    const payload = base58CheckDecode(q);
    if (payload) {
      const v = BASE58_VERSIONS[payload[0]];
      if (v) {
        return make(q, {
          kind: 'address',
          label: v.label,
          chains: v.chains,
          format: v.format,
          checksum: 'valid',
          network: v.testnet ? 'testnet' : undefined,
        });
      }
      return make(q, {
        kind: 'address',
        label: 'Base58Check address',
        chains: [],
        format: 'base58check',
        checksum: 'valid',
        note: `Version byte 0x${payload[0].toString(16).padStart(2, '0')} isn't one Web3Lens recognises.`,
      });
    }
    // Looks like a known coin but the checksum fails: say so rather than guessing another chain.
    const lead = BASE58_LEADS.find(([re]) => re.test(q));
    if (lead && q.length >= 26 && q.length <= 35) {
      const v = BASE58_VERSIONS[lead[1]];
      return make(q, { kind: 'address', label: v.label, chains: v.chains, format: v.format, checksum: 'invalid', note: BAD_CHECKSUM });
    }
  }

  // Zcash transparent addresses have a two-byte version.
  if (raw.length === 26 && /^t[13]/.test(q)) {
    const ok = base58CheckDecode(q) !== null;
    return make(q, {
      kind: 'address',
      label: 'Zcash address',
      chains: ['zcash'],
      format: 'zcash-transparent',
      checksum: ok ? 'valid' : 'invalid',
      note: ok ? undefined : BAD_CHECKSUM,
    });
  }

  // SS58 (Polkadot, Kusama, generic Substrate) with a one-byte network prefix.
  if (raw.length === 35 && raw[0] < 64) {
    const hash = blake2b(concatBytes(SS58_PREFIX, raw.slice(0, 33)), 64);
    const ok = equalBytes(hash.slice(0, 2), raw.slice(33));
    const prefix = raw[0];
    const which =
      prefix === 0
        ? { label: 'Polkadot address', chains: ['polkadot'] }
        : prefix === 2
          ? { label: 'Kusama address', chains: ['kusama'] }
          : prefix === 42
            ? { label: 'Substrate address', chains: ['polkadot', 'kusama'] }
            : null;
    if (which && ok) return make(q, { kind: 'address', ...which, format: 'ss58', checksum: 'valid' });
  }

  if (raw.length === 32 && q.length >= 32 && q.length <= 44) {
    return make(q, { kind: 'address', label: 'Solana address', chains: ['solana'], format: 'solana-address', checksum: 'none' });
  }
  if (raw.length === 64 && q.length >= 86 && q.length <= 88) {
    return make(q, { kind: 'transaction', label: 'Solana signature', chains: ['solana'], format: 'solana-signature', checksum: 'none' });
  }

  // Bitcoin-family WIF private keys (version 0x80, 0xb0 Litecoin, 0x9e Dogecoin): never search these.
  if ((raw.length === 37 || raw.length === 38) && base58CheckDecode(q)) {
    const v = raw[0];
    if (v === 0x80 || v === 0xb0 || v === 0x9e || v === 0xef) {
      return make(q, {
        kind: 'secret',
        label: 'Private key (WIF)',
        chains: [],
        format: 'wif',
        note: 'This looks like a private key. Anyone who has it controls the funds. Web3Lens will not search it.',
      });
    }
  }
  return null;
}

function base64UrlDecode(s: string): Uint8Array | null {
  try {
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64);
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

function detectTon(q: string): Detection | null {
  if (/^-?[01]:[0-9a-f]{64}$/i.test(q)) {
    return make(q, { kind: 'address', label: 'TON address (raw)', chains: ['toncoin'], format: 'ton-raw', checksum: 'none' });
  }
  if (!/^[EUk0][Qf][A-Za-z0-9_+/-]{46}$/.test(q)) return null;
  const raw = base64UrlDecode(q);
  if (!raw || raw.length !== 36) return null;
  const crc = crc16xmodem(raw.slice(0, 34));
  const ok = raw[34] === crc >> 8 && raw[35] === (crc & 0xff);
  if (!ok) return null;
  return make(q, { kind: 'address', label: 'TON address', chains: ['toncoin'], format: 'ton-address', checksum: 'valid' });
}

function detectStellar(q: string): Detection | null {
  if (!/^[GS][A-Z2-7]{55}$/.test(q)) return null;
  const raw = base32Decode(q);
  if (!raw || raw.length !== 35) return null;
  const crc = crc16xmodem(raw.slice(0, 33));
  const ok = raw[33] === (crc & 0xff) && raw[34] === crc >> 8;
  if (q[0] === 'S') {
    if (!ok) return null;
    return make(q, {
      kind: 'secret',
      label: 'Stellar secret key',
      chains: [],
      format: 'stellar-secret',
      checksum: 'valid',
      note: 'This is a Stellar secret key. Anyone who has it controls the account. Web3Lens will not search it.',
    });
  }
  return make(q, {
    kind: 'address',
    label: 'Stellar address',
    chains: ['stellar'],
    format: 'stellar-address',
    checksum: ok ? 'valid' : 'invalid',
    note: ok ? undefined : BAD_CHECKSUM,
  });
}

const HEX64_LOWER_CHAINS = ['bitcoin', 'tron', 'litecoin', 'dogecoin', 'bitcoincash', 'cardano', 'stellar', 'dash', 'zcash'];
const HEX64_UPPER_CHAINS = ['ripple', 'cosmos', 'osmosis', 'celestia', 'bitcoin', 'tron'];
const BLOCK_CHAINS = ['bitcoin', 'ethereum', 'solana', 'base', 'arbitrum', 'optimism', 'polygon', 'binancecoin'];

/** Every interpretation of `query`, best first. Empty when nothing matches. */
export function detectAll(query: string): Detection[] {
  const q = query.trim();
  if (!q) return [];
  const out: Detection[] = [];

  if (/^0x[0-9a-f]{40}$/i.test(q)) {
    const status = evmChecksumStatus(q);
    out.push(
      make(q, {
        kind: 'address',
        label: 'EVM address',
        chains: EVM_CHAINS,
        format: 'evm-address',
        normalized: status === 'invalid' ? q : toChecksumAddress(q),
        checksum: status,
        note: status === 'invalid' ? BAD_CHECKSUM : undefined,
      }),
    );
    return out;
  }
  if (/^0x[0-9a-f]{64}$/i.test(q)) {
    const normalized = q.toLowerCase();
    out.push(make(q, { kind: 'transaction', label: 'EVM transaction hash', chains: EVM_CHAINS, format: 'evm-tx', normalized }));
    out.push(make(q, { kind: 'address', label: 'Sui / Aptos address', chains: ['sui', 'aptos'], format: 'move-address', normalized }));
    out.push(
      make(q, { kind: 'transaction', label: 'Polkadot / Kusama extrinsic hash', chains: ['polkadot', 'kusama'], format: 'substrate-hash', normalized }),
    );
    return out;
  }

  const name = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.(eth|sol|near|ton)$/i.exec(q);
  if (name) {
    const tld = name[2].toLowerCase();
    const normalized = q.toLowerCase();
    if (tld === 'eth') out.push(make(q, { kind: 'name', label: 'ENS name', chains: ['ethereum'], format: 'ens', normalized }));
    if (tld === 'sol') out.push(make(q, { kind: 'name', label: 'Solana name', chains: ['solana'], format: 'sns', normalized }));
    if (tld === 'near') out.push(make(q, { kind: 'address', label: 'NEAR account', chains: ['near'], format: 'near-account', normalized }));
    if (tld === 'ton') out.push(make(q, { kind: 'name', label: 'TON DNS name', chains: ['toncoin'], format: 'ton-dns', normalized }));
    return out;
  }

  const words = q.toLowerCase().split(/\s+/);
  if ([12, 15, 18, 21, 24].includes(words.length) && words.every((w) => /^[a-z]{3,8}$/.test(w))) {
    out.push(
      make(q, {
        kind: 'secret',
        label: 'Recovery phrase',
        chains: [],
        format: 'mnemonic',
        note: 'This looks like a wallet recovery phrase. Anyone who has it controls the wallet. Web3Lens will not search it; never paste it into a website.',
      }),
    );
    return out;
  }

  if (/^(bitcoincash:)?[qp][02-9ac-hj-np-z]{41}$/i.test(q)) {
    const ok = isCashAddr(q);
    const normalized = q.toLowerCase().startsWith('bitcoincash:') ? q.toLowerCase() : `bitcoincash:${q.toLowerCase()}`;
    out.push(
      make(q, {
        kind: 'address',
        label: 'Bitcoin Cash address',
        chains: ['bitcoincash'],
        format: 'cashaddr',
        normalized,
        checksum: ok ? 'valid' : 'invalid',
        note: ok ? undefined : BAD_CHECKSUM,
      }),
    );
    return out;
  }

  for (const detector of [detectBech32, detectTon, detectStellar, detectBase58]) {
    const d = detector(q);
    if (d) return [d];
  }

  if (/^[hc]x[0-9a-f]{40}$/i.test(q)) {
    const contract = q[0].toLowerCase() === 'c';
    return [make(q, { kind: 'address', label: contract ? 'ICON contract' : 'ICON address', chains: ['icon'], format: 'icon-address', normalized: q.toLowerCase() })];
  }
  if (/^[A-Z2-7]{58}$/.test(q)) {
    return [make(q, { kind: 'address', label: 'Algorand address', chains: ['algorand'], format: 'algorand-address', checksum: 'unverified' })];
  }
  if (/^[0-9a-f]{64}$/i.test(q)) {
    if (/^00000000/.test(q)) {
      out.push(make(q, { kind: 'block', label: 'Bitcoin block hash', chains: ['bitcoin'], format: 'btc-block-hash', normalized: q.toLowerCase() }));
    }
    const upper = q === q.toUpperCase() && /[A-F]/.test(q);
    out.push(
      make(q, {
        kind: 'transaction',
        label: 'Transaction hash',
        chains: upper ? HEX64_UPPER_CHAINS : HEX64_LOWER_CHAINS,
        format: 'hex64',
      }),
    );
    return out;
  }
  if (/^\d{1,10}$/.test(q)) {
    out.push(make(q, { kind: 'block', label: 'Block number', chains: BLOCK_CHAINS, format: 'block-number' }));
  }
  return out;
}

export function detectQuery(query: string): Detection | null {
  return detectAll(query)[0] ?? null;
}

const URI_SCHEME = /^(ethereum|bitcoin|litecoin|dogecoin|solana|tron|xrp|ripple|cosmos|cardano|web\+[a-z]+):(?:\/\/)?([^?@/#\s]+)/i;

/**
 * Pulls the searchable part out of what people paste: payment URIs (`bitcoin:…?amount=`,
 * `ethereum:0x…@1`) and explorer links (`https://etherscan.io/tx/0x…`, `tronscan.org/#/address/T…`).
 * Returns the query unchanged when there's nothing to extract.
 */
export function extractQuery(input: string): { query: string; from?: 'uri' | 'url'; host?: string } {
  const raw = input.trim().replace(/^["'<]+|["'>]+$/g, '');
  if (/^bitcoincash:/i.test(raw)) return { query: raw.split('?')[0], from: 'uri' };
  const uri = URI_SCHEME.exec(raw);
  if (uri && !/^https?$/i.test(uri[1])) return { query: uri[2], from: 'uri' };
  if (/^https?:\/\//i.test(raw)) {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      return { query: raw };
    }
    const segments = [...url.pathname.split('/'), ...url.hash.replace(/^#/, '').split(/[/?&=]/)]
      .map((s) => {
        try {
          return decodeURIComponent(s);
        } catch {
          return s;
        }
      })
      .filter(Boolean)
      .reverse();
    const params = ['q', 'query', 'search', 'a', 'address', 'tx', 'hash', 'id', 'value', 'term'].map((p) => url.searchParams.get(p) ?? '');
    for (const candidate of [...params, ...segments]) {
      const d = detectQuery(candidate);
      if (d && d.kind !== 'block' && d.kind !== 'secret') return { query: candidate, from: 'url', host: url.hostname };
    }
    return { query: raw };
  }
  return { query: raw };
}

/** Example queries shown on the home page; each must be detected as `expect`. `icon` is the chain id whose logo is shown. */
export const EXAMPLES = [
  { query: 'vitalik.eth', expect: 'ENS name', note: "Vitalik Buterin's ENS", icon: 'ethereum' },
  { query: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', expect: 'EVM address', note: 'USDC contract', icon: 'usdc' },
  { query: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', expect: 'Bitcoin address', note: 'Bitcoin genesis address', icon: 'bitcoin' },
  { query: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', expect: 'Tron address', note: 'USDT on Tron', icon: 'tron' },
] as const;
