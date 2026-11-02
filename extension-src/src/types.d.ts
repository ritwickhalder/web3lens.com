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
  contextMenus: {
    create(props: { id: string; title: string; contexts: string[] }): void;
    removeAll(): Promise<void>;
    onClicked: ExtEvent<(info: { menuItemId: string | number; selectionText?: string; linkUrl?: string }, tab?: ExtTab) => void>;
  };
  omnibox: {
    setDefaultSuggestion(s: { description: string }): void;
    onInputChanged: ExtEvent<(text: string, suggest: (s: { content: string; description: string }[]) => void) => void>;
    onInputEntered: ExtEvent<(text: string, disposition: 'currentTab' | 'newForegroundTab' | 'newBackgroundTab') => void>;
  };
  scripting: {
    executeScript<T>(details: { target: { tabId: number }; func: () => T }): Promise<{ result?: T }[]>;
  };
}

declare const chrome: ExtApi | undefined;
declare const browser: ExtApi | undefined;
