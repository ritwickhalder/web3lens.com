/** Unix timestamp ↔ date conversion. */

export type TimeInfo = { seconds: number; ms: number; iso: string; utc: string; local: string; relative: string };

/**
 * Accepts Unix seconds (10 digits), milliseconds (13), microseconds/nanoseconds (16/19, as some
 * chains report), hex seconds (0x…, as JSON-RPC returns block timestamps), or a date string.
 */
export function parseTime(input: string, now = Date.now()): TimeInfo & { interpretedAs: string } {
  const s = input.trim();
  if (!s) throw new Error('Enter a timestamp or date');
  let ms: number;
  let interpretedAs: string;
  if (/^0x[0-9a-f]+$/i.test(s)) {
    ms = Number(BigInt(s)) * 1000;
    interpretedAs = 'hex seconds';
  } else if (/^-?\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    const digits = s.replace(/^-/, '').split('.')[0].length;
    if (digits >= 18) {
      ms = n / 1e6;
      interpretedAs = 'nanoseconds';
    } else if (digits >= 15) {
      ms = n / 1e3;
      interpretedAs = 'microseconds';
    } else if (digits >= 12) {
      ms = n;
      interpretedAs = 'milliseconds';
    } else {
      ms = n * 1000;
      interpretedAs = 'seconds';
    }
  } else {
    ms = Date.parse(s);
    interpretedAs = 'date';
    if (Number.isNaN(ms)) throw new Error('Not a timestamp or recognisable date');
  }
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) throw new Error('Out of range');
  return { ...describe(d, now), interpretedAs };
}

function describe(d: Date, now: number): TimeInfo {
  const ms = d.getTime();
  return {
    seconds: Math.floor(ms / 1000),
    ms,
    iso: d.toISOString(),
    utc: d.toUTCString(),
    local: d.toString(),
    relative: relative(ms, now),
  };
}

export function relative(ms: number, now = Date.now()): string {
  const diff = Math.round((ms - now) / 1000);
  const abs = Math.abs(diff);
  const units: [number, string][] = [
    [31536000, 'year'],
    [2592000, 'month'],
    [86400, 'day'],
    [3600, 'hour'],
    [60, 'minute'],
    [1, 'second'],
  ];
  if (abs < 1) return 'now';
  for (const [secs, name] of units) {
    if (abs >= secs) {
      const v = Math.floor(abs / secs);
      const label = `${v} ${name}${v === 1 ? '' : 's'}`;
      return diff < 0 ? `${label} ago` : `in ${label}`;
    }
  }
  return 'now';
}
