'use client';

import { useEffect } from 'react';
import { startAutoSync } from '@/lib/client/sync';

/** Mounted once in the layout: keeps a Pro account's saved items in sync. Renders nothing. */
export function SyncAgent() {
  useEffect(() => startAutoSync(), []);
  return null;
}
