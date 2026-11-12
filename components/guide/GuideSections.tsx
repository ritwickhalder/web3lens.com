'use client';

import type { Icon } from '@phosphor-icons/react';
import { ArrowsLeftRight, Bank, Cpu, Cube, CurrencyBtc, ImageSquare, Play, Wallet } from '@phosphor-icons/react/dist/ssr';
import { useState } from 'react';
import type { GuideEntry } from '@/content/guide';

/** One illustration per question, in content/guide.ts order. */
const ICONS: Icon[] = [Cube, CurrencyBtc, ArrowsLeftRight, Cpu, Wallet, ImageSquare, Bank];

export function guideAnchor(i: number) {
  return `q-${i + 1}`;
}

function cleanQuestion(q: string) {
  return q.replace(/\s\?$/, '?');
}

/** Shows the YouTube thumbnail and only loads the player when clicked (saves ~1MB per video). */
function LiteYouTube({ id, title }: { id: string; title: string }) {
  const [play, setPlay] = useState(false);
  if (play) {
    return (
      <iframe
        className="aspect-video w-full rounded-lg border border-line"
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
      className="group relative block aspect-video w-full overflow-hidden rounded-lg border border-line bg-ink-3"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- remote YouTube thumbnail, no optimisation needed */}
      <img
        src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
        alt=""
        loading="lazy"
        className="size-full object-cover opacity-75 transition-opacity group-hover:opacity-100"
      />
      <span className="absolute inset-0 grid place-items-center">
        <span className="flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-extrabold text-ink shadow-xl transition-transform group-hover:scale-105">
          <Play weight="fill" className="size-4" /> Play video
        </span>
      </span>
    </button>
  );
}

/** Table of contents for the guide; sits in the sticky left column. */
export function GuideToc({ entries }: { entries: GuideEntry[] }) {
  return (
    <nav aria-label="Questions" className="rounded-xl border border-line bg-ink-2 p-2">
      <p className="label px-2.5 py-1.5">Contents</p>
      <ol>
        {entries.map((e, i) => {
          const QIcon = ICONS[i] ?? Cube;
          return (
            <li key={e.question}>
              <a
                href={`#${guideAnchor(i)}`}
                className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-bold text-fg/80 transition-colors hover:bg-ink-3 hover:text-accent"
              >
                <QIcon aria-hidden weight="duotone" className="size-5 shrink-0 text-accent" />
                {cleanQuestion(e.question)}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Every answer as its own section, video beside the text on wide screens. */
export function GuideSections({ entries }: { entries: GuideEntry[] }) {
  return (
    <div className="space-y-3">
      {entries.map((entry, i) => {
        const QIcon = ICONS[i] ?? Cube;
        return (
          <section
            key={entry.question}
            id={guideAnchor(i)}
            className="grid scroll-mt-24 grid-cols-1 gap-5 rounded-xl border border-line bg-ink-2 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] 2xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] xl:gap-8"
          >
            <div>
              <h2 className="heading flex items-center gap-3 text-xl sm:text-2xl">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
                  <QIcon aria-hidden weight="duotone" className="size-6" />
                </span>
                {cleanQuestion(entry.question)}
              </h2>
              <p className="prose-bp mt-3 text-[15px]">{entry.answer}</p>
            </div>
            {entry.youtubeId && (
              <div className="self-center">
                <LiteYouTube id={entry.youtubeId} title={entry.question} />
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
