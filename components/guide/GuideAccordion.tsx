'use client';

import { Play, Plus } from 'lucide-react';
import { useState } from 'react';
import type { GuideEntry } from '@/content/guide';

/** Shows the YouTube thumbnail and only loads the player when clicked (saves ~1MB per video). */
function LiteYouTube({ id, title }: { id: string; title: string }) {
  const [play, setPlay] = useState(false);
  if (play) {
    return (
      <iframe
        className="aspect-video w-full rounded-2xl"
        src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setPlay(true)}
      aria-label={`Play video: ${title}`}
      className="group relative block aspect-video w-full overflow-hidden rounded-2xl border border-line bg-ink-3"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- remote YouTube thumbnail, no optimisation needed */}
      <img
        src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
        alt=""
        loading="lazy"
        className="size-full object-cover opacity-70 transition-opacity group-hover:opacity-90"
      />
      <span className="absolute inset-0 grid place-items-center">
        <span className="grid size-16 place-items-center rounded-full bg-lime text-ink shadow-[0_0_40px_-4px_rgb(198_242_78/0.8)] transition-transform group-hover:scale-105">
          <Play className="ml-1 size-6 fill-current" />
        </span>
      </span>
    </button>
  );
}

/**
 * One-open-at-a-time accordion built on <details name>. The first entry starts open,
 * as on the legacy page.
 */
export function GuideAccordion({ entries }: { entries: GuideEntry[] }) {
  return (
    <div className="space-y-3">
      {entries.map((entry, i) => (
        <details
          key={entry.question}
          name="blockchain-guide"
          open={i === 0}
          className="group glass rounded-2xl open:border-line-strong open:bg-white/[0.04]"
        >
          <summary className="flex cursor-pointer list-none items-center gap-5 p-5 sm:p-6 [&::-webkit-details-marker]:hidden">
            <span className="font-mono text-xs text-faint group-open:text-lime">{String(i + 1).padStart(2, '0')}</span>
            <span className="flex-1 font-display text-[15px] font-semibold sm:text-base">{entry.question.replace(/\s\?$/, '?')}</span>
            <Plus aria-hidden className="size-5 shrink-0 text-muted transition-transform duration-300 group-open:rotate-45 group-open:text-lime" />
          </summary>
          <div className="px-5 pb-6 sm:px-6 sm:pl-[3.6rem]">
            <p className="prose-lens text-[15px]">{entry.answer}</p>
            {entry.youtubeId && (
              <div className="mt-6 max-w-2xl">
                <LiteYouTube id={entry.youtubeId} title={entry.question} />
              </div>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}
