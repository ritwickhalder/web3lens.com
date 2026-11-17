/** Types for scripts/store-metadata-guard.mjs (frozen store title/description). */
export function snapshot(): Record<string, string>;
export function problems(current?: Record<string, string>): string[];
