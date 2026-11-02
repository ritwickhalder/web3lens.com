/** Browser adapter: one handle for Chrome/Edge (`chrome`) and Firefox (`browser`). */
export const ext: ExtApi = (typeof browser !== 'undefined' ? browser : chrome) as ExtApi;

export const isFirefox = typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent);

/** Omnibox descriptions are XML in Chrome/Edge but plain text in Firefox. */
export function omniboxText(s: string): string {
  return isFirefox ? s : s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function openTab(url: string) {
  return ext.tabs.create({ url });
}

/** Opens one of the extension's own pages, e.g. appUrl('#tools/unit-converter'). */
export function appUrl(hash = ''): string {
  return ext.runtime.getURL(`app.html${hash}`);
}
