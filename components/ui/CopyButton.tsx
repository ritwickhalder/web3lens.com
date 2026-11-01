'use client';

import { Check, Copy } from 'lucide-react';
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
      className="grid size-8 shrink-0 place-items-center rounded-lg border border-line text-muted transition-colors hover:border-lime/50 hover:text-lime"
    >
      {copied ? <Check className="size-4 text-lime" /> : <Copy className="size-4" />}
    </button>
  );
}
