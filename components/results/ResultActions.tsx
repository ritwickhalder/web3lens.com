'use client';

import { BookmarkSimple, Check, LinkSimple, PencilSimple, Trash } from '@phosphor-icons/react/dist/ssr';
import { useState, useSyncExternalStore } from 'react';
import { labelFor, removeSaved, savedStore, upsertSaved } from '@/lib/saved';

const btn = 'inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-bold text-fg/85 transition-colors hover:border-accent hover:text-accent';

/** Save with a label, and copy a share link. Labels stay in this browser. */
export function ResultActions({ query, chainId }: { query: string; chainId: string | null }) {
  const saved = useSyncExternalStore(savedStore.subscribe, savedStore.getSnapshot, savedStore.getServerSnapshot);
  const item = labelFor(saved, query, chainId);
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState('');
  const [copied, setCopied] = useState(false);

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked; the URL bar still has the link.
    }
  }

  if (editing) {
    return (
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          upsertSaved({ query, chainId, label: label.trim() });
          setEditing(false);
        }}
      >
        <input
          autoFocus
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={80}
          placeholder="Label, e.g. Exchange hot wallet"
          aria-label="Label"
          className="h-9 w-56 rounded-lg border border-line-strong bg-ink px-3 text-sm font-semibold outline-none focus:border-accent"
        />
        <button type="submit" className={btn}>
          <Check aria-hidden weight="bold" className="size-4" /> Save
        </button>
        <button type="button" onClick={() => setEditing(false)} className="px-2 text-sm font-bold text-faint hover:text-fg">
          Cancel
        </button>
      </form>
    );
  }

  return (
    <>
      {item ? (
        <>
          <span className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-accent/60 bg-accent/10 px-3 text-sm font-bold text-accent">
            <BookmarkSimple aria-hidden weight="fill" className="size-4" /> {item.label || 'Saved'}
          </span>
          <button
            type="button"
            className={btn}
            aria-label="Edit label"
            onClick={() => {
              setLabel(item.label);
              setEditing(true);
            }}
          >
            <PencilSimple aria-hidden weight="bold" className="size-4" />
          </button>
          <button type="button" className={btn} aria-label="Remove from saved" onClick={() => removeSaved(item.id)}>
            <Trash aria-hidden weight="bold" className="size-4" />
          </button>
        </>
      ) : (
        <button
          type="button"
          className={btn}
          onClick={() => {
            setLabel('');
            setEditing(true);
          }}
        >
          <BookmarkSimple aria-hidden weight="bold" className="size-4" /> Save & label
        </button>
      )}
      <button type="button" className={btn} onClick={share}>
        {copied ? <Check aria-hidden weight="bold" className="size-4 text-accent" /> : <LinkSimple aria-hidden weight="bold" className="size-4" />}
        {copied ? 'Link copied' : 'Copy link'}
      </button>
    </>
  );
}
