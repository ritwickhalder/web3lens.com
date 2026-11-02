/**
 * Colour theme: dark (default), light, or follow the system. Stored in this browser only and
 * applied as <html data-theme>; the tokens live in app/globals.css.
 */
import { createLocalStore } from '@/lib/local-store';

export type Theme = 'dark' | 'light' | 'system';
export const THEMES: { value: Theme; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
];

export const THEME_KEY = 'w3l:theme';

export function sanitizeTheme(raw: unknown): Theme {
  return raw === 'light' || raw === 'system' ? raw : 'dark';
}

export const themeStore = createLocalStore<Theme>(THEME_KEY, 'dark', sanitizeTheme);

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

/**
 * Runs in <head> before first paint so a light-theme visitor never sees a dark flash. Static
 * string, no user input; mirrors sanitizeTheme.
 */
export const THEME_INIT_SCRIPT = `try{var t=JSON.parse(localStorage.getItem(${JSON.stringify(THEME_KEY)}));if(t==='light'||t==='system')document.documentElement.dataset.theme=t}catch(e){}`;
