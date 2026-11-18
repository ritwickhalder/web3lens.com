'use client';

import { useTx } from '@/lib/i18n/client';
import type { Vars } from '@/lib/i18n/format';

/**
 * Translated text for server components that the root layout renders on every page (the footer): the language comes
 * from the URL, so English pages keep rendering their English text statically.
 */
export function T({ children, vars }: { children: string; vars?: Vars }) {
  return useTx()(children, vars);
}
