'use client';

import { Check, Copy } from '@phosphor-icons/react/dist/ssr';
import { useState } from 'react';

/** Copies `value` to the clipboard and shows a tick for a moment. */
export function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard can be blocked (permissions, insecure context); the value is still selectable.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? 'Copied' : label}
      title={copied ? 'Copied' : label}
      className="grid size-9 shrink-0 place-items-center rounded-md border border-line text-muted transition-colors hover:border-accent hover:text-accent"
    >
      {copied ? <Check weight="bold" className="size-4 text-accent" /> : <Copy weight="duotone" className="size-4" />}
    </button>
  );
}
