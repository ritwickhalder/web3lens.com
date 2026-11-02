'use client';

import { Desktop, Moon, Sun } from '@phosphor-icons/react/dist/ssr';
import { useEffect, useSyncExternalStore } from 'react';
import { applyTheme, THEMES, themeStore, type Theme } from '@/lib/theme';

const ICONS = { dark: Moon, light: Sun, system: Desktop } as const;
const NEXT: Record<Theme, Theme> = { dark: 'light', light: 'system', system: 'dark' };

export function useTheme(): [Theme, (t: Theme) => void] {
  const theme = useSyncExternalStore(themeStore.subscribe, themeStore.getSnapshot, themeStore.getServerSnapshot);
  // Keeps <html data-theme> in step with the stored choice (including changes from other tabs).
  useEffect(() => applyTheme(theme), [theme]);
  return [theme, (t) => themeStore.set(t)];
}

/** Header button: cycles Dark → Light → System. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useTheme();
  const Icon = ICONS[theme];
  const label = THEMES.find((t) => t.value === theme)!.label;
  return (
    <button
      type="button"
      onClick={() => setTheme(NEXT[theme])}
      aria-label={`Theme: ${label}. Switch to ${THEMES.find((t) => t.value === NEXT[theme])!.label}`}
      title={`Theme: ${label}`}
      className={`grid size-10 place-items-center rounded-md text-fg/80 transition-colors hover:bg-ink-3 hover:text-fg ${className}`}
    >
      <Icon aria-hidden weight="bold" className="size-5" />
    </button>
  );
}

/** Radio group for the settings page. */
export function ThemePicker() {
  const [theme, setTheme] = useTheme();
  return (
    <div role="radiogroup" aria-label="Theme" className="flex flex-wrap gap-2">
      {THEMES.map((t) => {
        const Icon = ICONS[t.value];
        return (
          <button
            key={t.value}
            type="button"
            role="radio"
            aria-checked={theme === t.value}
            onClick={() => setTheme(t.value)}
            className="flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-bold text-fg/85 aria-checked:border-accent aria-checked:bg-accent/10 aria-checked:text-accent"
          >
            <Icon aria-hidden weight="bold" className="size-4" />
            {t.label}
            {t.value === 'dark' && <span className="text-xs font-semibold text-faint">(default)</span>}
          </button>
        );
      })}
    </div>
  );
}
