/**
 * Install and uninstall pages, ported from Super Session Manager (extension/js/welcome-page.js and uninstall-url.js).
 *
 * - Welcome: on a genuine fresh install only (never on updates or browser updates), open web3lens.com/?welcome=true
 *   once, where the homepage shows a short "you're set up, pin the extension" block.
 * - Uninstall: register web3lens.com/uninstall so removing the extension opens a one-question survey. The URL carries
 *   anonymous labels only: product, extension version and browser family. Firefox gets the browser family alone,
 *   because AMO treats technical data (the version) as data collection that needs opt-in consent.
 *
 * Neither needs a permission (tabs.create with a URL and runtime.setUninstallURL are always allowed) and neither
 * makes a network request. Never attach an email, account, address, query or any identifier here.
 */
import { ext, isFirefox } from './browser';

/** Same origin as account.ts's ACCOUNT_ORIGIN; repeated so the background bundle doesn't pull in the account code. */
export const SITE_ORIGIN = 'https://web3lens.com';

export const WELCOME_SHOWN_KEY = 'welcomePageShown:v1';
export const UNINSTALL_PRODUCT = 'w3l';

export type BrowserFamily = 'chrome' | 'edge' | 'firefox' | 'opera' | 'brave' | 'other';

/** Coarse browser family from the user agent. Edge and Opera also carry "Chrome/", so they are tested first. */
export function browserFamily(ua: string, brave = false): BrowserFamily {
  if (/\bEdg\//i.test(ua)) return 'edge';
  if (/\bOPR\/|\bOpera\//i.test(ua)) return 'opera';
  if (brave) return 'brave';
  if (/\bFirefox\//i.test(ua)) return 'firefox';
  if (/\bChrome\//i.test(ua)) return 'chrome';
  return 'other';
}

export function welcomeUrl(origin = SITE_ORIGIN): string {
  const url = new URL(`${origin}/`);
  url.searchParams.set('welcome', 'true');
  return url.toString();
}

export function uninstallUrl(o: { browser: BrowserFamily; version?: string }, origin = SITE_ORIGIN): string {
  const url = new URL(`${origin}/uninstall`);
  url.searchParams.set('product', UNINSTALL_PRODUCT);
  if (o.version) url.searchParams.set('v', o.version);
  url.searchParams.set('b', o.browser);
  return url.toString();
}

/** Opens the welcome page once, and only when `reason` is 'install'. Never throws. */
export async function maybeOpenWelcomePage(details: { reason?: string } | undefined): Promise<void> {
  if (details?.reason !== 'install') return;
  try {
    const stored = await ext.storage.local.get([WELCOME_SHOWN_KEY]);
    if (stored[WELCOME_SHOWN_KEY]) return;
    // Recorded before the tab opens, so a failure can't make a re-fired onInstalled open a second one.
    await ext.storage.local.set({ [WELCOME_SHOWN_KEY]: Date.now() });
    await ext.tabs.create({ url: welcomeUrl() });
  } catch (e) {
    console.warn('Web3Lens: welcome page did not open', e);
  }
}

/** Registers the uninstall survey URL. Safe to call repeatedly (the browser keeps the latest). Never throws. */
export async function refreshUninstallUrl(): Promise<void> {
  if (!ext.runtime.setUninstallURL) return;
  try {
    const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { brave?: unknown }) : undefined;
    const browser = browserFamily(nav?.userAgent ?? '', !!nav?.brave);
    const version = isFirefox ? undefined : ext.runtime.getManifest().version;
    await ext.runtime.setUninstallURL(uninstallUrl({ browser, version }));
  } catch (e) {
    console.warn('Web3Lens: uninstall URL not set', e);
  }
}
