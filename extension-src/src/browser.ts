/** Browser adapter: one handle for Chrome/Edge (`chrome`) and Firefox (`browser`). */
export const ext: ExtApi = (typeof browser !== 'undefined' ? browser : chrome) as ExtApi;

export const isFirefox = typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent);

/** Omnibox descriptions are XML in Chrome/Edge but plain text in Firefox. */
export function omniboxText(s: string): string {
  return isFirefox ? s : s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** What the optional account sends: Google sign-in session and email (Firefox asks for consent at sign-in). */
export const ACCOUNT_DATA_COLLECTION = ['authenticationInfo', 'personallyIdentifyingInfo'];

/**
 * Firefox: ask for consent to the optional account's data collection; must be the first await in a click handler.
 * Other browsers disclose it in their store listings and need no prompt. True when allowed.
 */
export async function allowAccountDataCollection(): Promise<boolean> {
  if (!isFirefox || !ext.permissions) return true;
  try {
    // request() resolves true at once when already granted; calling contains() first would lose the user gesture.
    return await ext.permissions.request({ data_collection: ACCOUNT_DATA_COLLECTION });
  } catch {
    // Older Firefox without data-collection permissions: the manifest disclosure applies.
    return true;
  }
}

export function openTab(url: string) {
  return ext.tabs.create({ url });
}

/** Opens one of the extension's own pages, e.g. appUrl('#tools/unit-converter'). */
export function appUrl(hash = ''): string {
  return ext.runtime.getURL(`app.html${hash}`);
}
