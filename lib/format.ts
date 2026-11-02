/** Display formatting shared by result pages and the extensions. */
import { displayAmount } from '@/lib/tools/units';

export function shortHash(s: string, head = 8, tail = 6): string {
  return s.length <= head + tail + 1 ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;
}

/** "2024-05-01 13:04 UTC" from seconds, ms or an ISO string. */
export function formatUtc(t: number | string | null | undefined): string {
  if (t === null || t === undefined || t === '') return '—';
  const d = typeof t === 'number' ? new Date(t < 1e12 ? t * 1000 : t) : new Date(t);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

export function timeAgo(t: number | string | null | undefined, now = Date.now()): string {
  if (t === null || t === undefined || t === '') return '';
  const ms = typeof t === 'number' ? (t < 1e12 ? t * 1000 : t) : new Date(t).getTime();
  const s = Math.round((now - ms) / 1000);
  if (!Number.isFinite(s)) return '';
  // Server and browser clocks drift a little; a fetch time just "ahead" of this clock was just now.
  if (s < -300) return 'in the future';
  if (s < 1) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 60) return `${Math.floor(s / 86400)} days ago`;
  if (s < 86400 * 730) return `${Math.floor(s / (86400 * 30))} months ago`;
  return `${Math.floor(s / (86400 * 365))} years ago`;
}

export function formatUsd(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '';
  if (n > 0 && n < 0.01) return '<$0.01';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: n >= 1000 ? 0 : 2 });
}

export function formatAmount(decimal: string | null | undefined, symbol?: string | null, maxFraction = 6): string {
  if (decimal === null || decimal === undefined) return '—';
  return `${displayAmount(decimal, maxFraction)}${symbol ? ` ${symbol}` : ''}`;
}

export function formatCount(n: number | null | undefined): string {
  return n === null || n === undefined || n < 0 ? '—' : n.toLocaleString('en-US');
}
