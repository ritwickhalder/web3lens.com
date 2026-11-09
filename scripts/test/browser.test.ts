import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EXTENSION_STORES } from '../../config/site';
import { detectBrowser } from '../../lib/browser';

const UA = {
  chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
  edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0',
  firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0',
  firefoxAndroid: 'Mozilla/5.0 (Android 15; Mobile; rv:145.0) Gecko/145.0 Firefox/145.0',
  opera: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 OPR/125.0.0.0',
  vivaldi: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Vivaldi/7.6',
  safari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Safari/605.1.15',
  iosChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/142.0.0.0 Mobile/15E148 Safari/604.1',
  androidChrome: 'Mozilla/5.0 (Linux; Android 15; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36',
};

test('desktop browsers get their own store', () => {
  assert.deepEqual(detectBrowser(UA.chrome), { store: 'chrome', name: 'Chrome' });
  assert.deepEqual(detectBrowser(UA.edge), { store: 'edge', name: 'Edge' });
  assert.deepEqual(detectBrowser(UA.firefox), { store: 'firefox', name: 'Firefox' });
  assert.deepEqual(detectBrowser(UA.firefoxAndroid), { store: 'firefox', name: 'Firefox' });
});

test('Chromium forks use the Chrome Web Store under their own name', () => {
  assert.deepEqual(detectBrowser(UA.opera), { store: 'chrome', name: 'Opera' });
  assert.deepEqual(detectBrowser(UA.vivaldi), { store: 'chrome', name: 'Vivaldi' });
  assert.deepEqual(detectBrowser(UA.chrome, ['Chromium', 'Brave'], false), { store: 'chrome', name: 'Brave' });
  assert.deepEqual(detectBrowser(UA.chrome, [], true), { store: 'chrome', name: 'Brave' });
  assert.deepEqual(detectBrowser(UA.chrome, ['Chromium', 'Microsoft Edge']), { store: 'edge', name: 'Edge' });
});

test('browsers without a store get no store', () => {
  for (const ua of [UA.safari, UA.iosChrome, UA.androidChrome, '']) assert.equal(detectBrowser(ua).store, null, ua);
});

test('every detectable store has a listing', () => {
  for (const id of ['chrome', 'firefox', 'edge']) {
    const store = EXTENSION_STORES.find((s) => s.id === id);
    assert.ok(store?.url?.startsWith('https://'), id);
  }
});
