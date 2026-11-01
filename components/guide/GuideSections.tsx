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
        className="aspect-video w-full rounded-xl border border-line"
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
      className="group relative block aspect-video w-full overflow-hidden rounded-xl border border-line bg-ink-3"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- remote YouTube thumbnail, no optimisation needed */}
      <img
        src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
        alt=""
        loading="lazy"
        className="size-full object-cover opacity-75 transition-opacity group-hover:opacity-100"
      />
      <span className="absolute inset-0 grid place-items-center">
        <span className="flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-base font-extrabold text-ink shadow-xl transition-transform group-hover:scale-105">
          <Play weight="fill" className="size-5" /> Play video
        </span>
      </span>
    </button>
  );
}

/** Table of contents for the guide; sits in the sticky left column. */
export function GuideToc({ entries }: { entries: GuideEntry[] }) {
  return (
    <nav aria-label="Questions" className="rounded-2xl border border-line bg-ink-2 p-2">
      <p className="label px-3 py-2">Contents</p>
      <ol>
        {entries.map((e, i) => {
          const QIcon = ICONS[i] ?? Cube;
          return (
            <li key={e.question}>
              <a
                href={`#${guideAnchor(i)}`}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-bold text-fg/80 transition-colors hover:bg-ink-3 hover:text-accent"
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
    <div className="space-y-4">
      {entries.map((entry, i) => {
        const QIcon = ICONS[i] ?? Cube;
        return (
          <section
            key={entry.question}
            id={guideAnchor(i)}
            className="grid grid-cols-1 gap-6 rounded-2xl border border-line bg-ink-2 p-6 sm:p-8 xl:grid-cols-2 xl:gap-10"
          >
            <div>
              <span className="grid size-14 place-items-center rounded-xl bg-accent/10 text-accent">
                <QIcon aria-hidden weight="duotone" className="size-8" />
              </span>
              <h2 className="heading mt-5 text-2xl sm:text-3xl">{cleanQuestion(entry.question)}</h2>
              <p className="prose-bp mt-4 text-base">{entry.answer}</p>
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
