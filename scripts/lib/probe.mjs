/**
 * Fetches a URL the way a browser would and classifies what came back, for the explorer audits
 * (scripts/check-explorers.mjs, scripts/audit-chains.mjs). Reads at most 256 KB of the body.
 */

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Web3LensHealthCheck/1.0';
const MAX_BODY = 256 * 1024;

/** Text that marks a parked, expired, for-sale or placeholder page rather than an explorer. */
const PARKED = [
  /domain (name )?(is|may be) for sale/i,
  /buy this domain/i,
  /this domain (has expired|is parked|is available)/i,
  /domain (has )?expired/i,
  /parkingcrew|sedoparking|bodis\.com|hugedomains|afternic|dan\.com\/buy|undeveloped\.com|parklogic|above\.com/i,
  /account (has been )?suspended/i,
  /welcome to nginx!|apache2 (ubuntu|debian) default page|it works!<\/h1>|default web site page|future home of something quite cool/i,
  /<title>\s*index of \//i,
  /this site can.t be reached|website is (currently )?(under construction|coming soon)/i,
];
const CHALLENGE = /cf-chl|challenge-platform|just a moment\.\.\.|attention required! \| cloudflare|ddos-guard|captcha/i;

function textOf(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function readBody(res) {
  if (!res.body) return '';
  const reader = res.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (size < MAX_BODY) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.length;
    }
  } finally {
    reader.cancel().catch(() => {});
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(Buffer.concat(chunks));
}

/**
 * @returns {Promise<{url: string, status: number|null, finalUrl?: string, title?: string, snippet?: string,
 *   bytes?: number, parked?: boolean, challenge?: boolean, error?: string}>}
 */
export async function probe(url, { timeoutMs = 15_000, method = 'GET' } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8', 'accept-language': 'en' },
    });
    const body = await readBody(res);
    const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(body)?.[1]?.replace(/\s+/g, ' ').trim().slice(0, 160);
    return {
      url,
      status: res.status,
      finalUrl: res.url && res.url !== url ? res.url : undefined,
      title: title || undefined,
      snippet: textOf(body).slice(0, 240) || undefined,
      bytes: body.length,
      parked: PARKED.some((re) => re.test(body)) || undefined,
      challenge: CHALLENGE.test(body) || undefined,
    };
  } catch (e) {
    return { url, status: null, error: e.name === 'AbortError' ? 'timeout' : (e.cause?.code ?? e.message ?? 'error') };
  } finally {
    clearTimeout(timer);
  }
}

/** Probes again once when the first answer was a network error, timeout or 5xx (servers flap). */
export async function probeWithRetry(url, opts) {
  const first = await probe(url, opts);
  if (first.status !== null && first.status < 500) return first;
  await new Promise((r) => setTimeout(r, 1500));
  const second = await probe(url, opts);
  return second.status !== null && second.status < 500 ? second : first;
}

/**
 * ok: the page answered and looks like a site. blocked: bot protection (the site is up, the content
 * couldn't be seen). notfound: 404/410 at the probed path. parked: a for-sale/placeholder page.
 * dead: no answer, TLS failure or a server error.
 */
export function verdict(r) {
  if (r.status === null) return 'dead';
  if (r.status >= 500) return r.challenge ? 'blocked' : 'dead';
  if (r.parked) return 'parked';
  if (r.status === 401 || r.status === 403 || r.status === 429 || r.challenge) return 'blocked';
  if (r.status === 404 || r.status === 410) return 'notfound';
  return 'ok';
}

/** Runs `fn` over `items` with at most `n` in flight. */
export async function pool(items, n, fn, onProgress) {
  const queue = items.map((item, i) => [item, i]);
  const out = new Array(items.length);
  let done = 0;
  async function worker() {
    while (queue.length) {
      const [item, i] = queue.shift();
      out[i] = await fn(item);
      done++;
      onProgress?.(done, items.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return out;
}
