/**
 * Shareable investigations: a titled list of addresses/transactions with labels and notes, encoded
 * into the URL fragment (/investigate#…). Fragments never reach the server, so sharing needs no
 * backend and Web3Lens never sees the contents. Anyone with the link can read it.
 */
import { bytesToUtf8, utf8ToBytes } from '@/lib/codec/bytes';

export type InvestigationItem = { q: string; c?: string; l?: string; n?: string };
export type Investigation = { v: 1; t?: string; items: InvestigationItem[] };

export const INVESTIGATION_MAX_ITEMS = 100;

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array | null {
  try {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

const clip = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);

export function sanitizeInvestigation(raw: unknown): Investigation | null {
  const r = raw as Partial<Investigation> | null;
  if (!r || !Array.isArray(r.items)) return null;
  const items: InvestigationItem[] = [];
  for (const it of r.items.slice(0, INVESTIGATION_MAX_ITEMS)) {
    const q = clip(it?.q, 200);
    if (!q) continue;
    items.push({ q, c: clip(it.c, 60), l: clip(it.l, 80), n: clip(it.n, 500) });
  }
  return items.length ? { v: 1, t: clip(r.t, 120), items } : null;
}

export function encodeInvestigation(inv: Investigation): string {
  const clean = sanitizeInvestigation(inv);
  if (!clean) throw new Error('Nothing to share');
  // Drop empty keys to keep links short.
  const compact = { v: 1, ...(clean.t ? { t: clean.t } : {}), items: clean.items.map((i) => Object.fromEntries(Object.entries(i).filter(([, v]) => v))) };
  return toBase64Url(utf8ToBytes(JSON.stringify(compact)));
}

export function decodeInvestigation(fragment: string): Investigation | null {
  const bytes = fromBase64Url(fragment.replace(/^#/, ''));
  if (!bytes) return null;
  const text = bytesToUtf8(bytes);
  if (!text) return null;
  try {
    return sanitizeInvestigation(JSON.parse(text));
  } catch {
    return null;
  }
}

export function investigationUrl(inv: Investigation, base = 'https://web3lens.com'): string {
  return `${base}/investigate#${encodeInvestigation(inv)}`;
}
