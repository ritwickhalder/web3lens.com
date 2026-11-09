/**
 * Which extension store fits the visitor's browser. Pure and browser-safe (no DOM access) so it can be tested
 * in Node: callers pass `navigator.userAgent` and, where available, the `navigator.userAgentData` brands.
 */

export type StoreId = 'chrome' | 'firefox' | 'edge';

export type BrowserMatch = {
  /** The store whose listing installs in this browser, or null when none does (Safari, mobile Chrome, iOS…). */
  store: StoreId | null;
  /** The browser's own name, for the button label ("Add to Brave"). */
  name: string;
};

const CHROMIUM_FORKS: [RegExp, string][] = [
  [/\bOPR\/|\bOpera\b/, 'Opera'],
  [/\bVivaldi\//, 'Vivaldi'],
  [/\bYaBrowser\//, 'Yandex'],
  [/\bSamsungBrowser\//, 'Samsung Internet'],
];

export function detectBrowser(userAgent: string, brands: readonly string[] = [], isBrave = false): BrowserMatch {
  const ua = userAgent || '';
  // iOS browsers are all WebKit and can't install Chrome/Firefox/Edge store extensions.
  if (/\b(iPhone|iPad|iPod)\b/.test(ua)) return { store: null, name: 'Safari' };
  const android = /\bAndroid\b/.test(ua);

  // Firefox, including Firefox for Android (which installs add-ons from AMO).
  if (/\bFirefox\//.test(ua) && !/\bSeamonkey\//.test(ua)) return { store: 'firefox', name: 'Firefox' };

  const chromium = /\b(Chrome|Chromium|CriOS|Edg|EdgA)\//.test(ua) || brands.some((b) => /Chrom/.test(b));
  if (!chromium) return { store: null, name: /\bSafari\//.test(ua) ? 'Safari' : 'your browser' };
  // Mobile Chromium browsers (Chrome, Edge for Android…) don't install extensions.
  if (android || /\bMobile\b/.test(ua)) return { store: null, name: 'your browser' };

  if (/\bEdg\//.test(ua) || brands.includes('Microsoft Edge')) return { store: 'edge', name: 'Edge' };
  if (isBrave || brands.includes('Brave')) return { store: 'chrome', name: 'Brave' };
  for (const [re, name] of CHROMIUM_FORKS) if (re.test(ua) || brands.includes(name)) return { store: 'chrome', name };
  return { store: 'chrome', name: 'Chrome' };
}
