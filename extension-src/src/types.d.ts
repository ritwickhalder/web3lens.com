/**
 * The few WebExtension APIs the extensions use, typed by hand to avoid a @types dependency.
 * Chrome (MV3) and Firefox both return promises for these.
 */
type ExtTab = { id?: number; url?: string; title?: string };
type ExtEvent<F extends (...args: never[]) => unknown> = { addListener(f: F): void };

interface ExtApi {
  runtime: {
    getURL(path: string): string;
    getManifest(): { version: string; name: string };
    openOptionsPage(): Promise<void>;
    onInstalled: ExtEvent<(details: { reason: string }) => void>;
  };
  storage: {
    local: {
      get(keys: string | string[] | null): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
      remove(keys: string | string[]): Promise<void>;
    };
    onChanged: ExtEvent<(changes: Record<string, { newValue?: unknown }>, area: string) => void>;
  };
  tabs: {
    create(props: { url: string; active?: boolean }): Promise<ExtTab>;
    update(props: { url: string }): Promise<ExtTab>;
    query(q: { active: boolean; currentWindow: boolean }): Promise<ExtTab[]>;
  };
  /** Missing on Firefox for Android, like `omnibox`. */
  contextMenus?: {
    create(props: { id: string; title: string; contexts: string[] }): void;
    removeAll(): Promise<void>;
    onClicked: ExtEvent<(info: { menuItemId: string | number; selectionText?: string; linkUrl?: string }, tab?: ExtTab) => void>;
  };
  omnibox?: {
    setDefaultSuggestion(s: { description: string }): void;
    onInputChanged: ExtEvent<(text: string, suggest: (s: { content: string; description: string }[]) => void) => void>;
    onInputEntered: ExtEvent<(text: string, disposition: 'currentTab' | 'newForegroundTab' | 'newBackgroundTab') => void>;
  };
  /** Firefox 140+: optional data-collection consent (`data_collection_permissions.optional` in the manifest). */
  permissions?: {
    request(p: { data_collection?: string[] }): Promise<boolean>;
    contains(p: { data_collection?: string[] }): Promise<boolean>;
  };
  /** Toolbar badge (no permission needed). */
  action?: {
    setBadgeText(d: { text: string }): Promise<void> | void;
    setBadgeBackgroundColor?(d: { color: string }): Promise<void> | void;
  };
  scripting: {
    executeScript<T>(details: { target: { tabId: number }; func: () => T }): Promise<{ result?: T }[]>;
  };
}

declare const chrome: ExtApi | undefined;
declare const browser: ExtApi | undefined;

/** SVG strings rendered at build time from the website's icon components (scripts/build-extensions.mjs). */
declare module 'virtual:svg-icons' {
  const icons: { ui: Record<string, string>; uiDuotone: Record<string, string>; chains: Record<string, string> };
  export default icons;
}
