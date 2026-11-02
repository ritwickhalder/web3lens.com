import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { ApiError, apiGet, setApiBase } from '../../lib/api-client';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

/** A fetch that never answers, but rejects when its signal aborts (as the real one does). */
function hangingFetch(): typeof fetch {
  return ((_url: string, init?: RequestInit) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal!.reason));
    })) as typeof fetch;
}

test('apiGet: a hung request ends with a timeout error instead of loading forever', async () => {
  globalThis.fetch = hangingFetch();
  setApiBase('https://web3lens.com');
  await assert.rejects(apiGet('gas', {}, undefined, 30), (e: unknown) => e instanceof ApiError && /too long/.test(e.message));
});

test("apiGet: the caller's own abort is passed through, not reported as a timeout", async () => {
  globalThis.fetch = hangingFetch();
  const ctl = new AbortController();
  const p = apiGet('gas', {}, ctl.signal, 5000);
  ctl.abort();
  await assert.rejects(p, (e: unknown) => !(e instanceof ApiError) && (e as Error).name === 'AbortError');
});

test('apiGet: network failure, rate limit and malformed bodies give clear errors', async () => {
  globalThis.fetch = (async () => {
    throw new TypeError('Failed to fetch');
  }) as typeof fetch;
  await assert.rejects(apiGet('gas', {}), /could not be reached/);
  globalThis.fetch = (async () => new Response('not json', { status: 429 })) as typeof fetch;
  await assert.rejects(apiGet('gas', {}), (e: unknown) => e instanceof ApiError && e.status === 429 && /Too many lookups/.test(e.message));
  globalThis.fetch = (async () => new Response('<html>', { status: 200 })) as typeof fetch;
  await assert.rejects(apiGet('gas', {}), /unavailable right now \(HTTP 200\)/);
  globalThis.fetch = (async () => Response.json({ error: 'Not a valid address.' }, { status: 400 })) as typeof fetch;
  await assert.rejects(apiGet('address', { q: 'x' }), /Not a valid address/);
  globalThis.fetch = (async () => Response.json({ ok: 1 })) as typeof fetch;
  assert.deepEqual(await apiGet('gas', {}), { ok: 1 });
});
