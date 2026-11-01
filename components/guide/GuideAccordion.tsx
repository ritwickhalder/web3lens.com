import type { GuideEntry } from '@/content/guide';

/**
 * One-open-at-a-time accordion built on <details name>, so it needs no JavaScript.
 * The first entry starts open, as on the legacy page.
 */
export function GuideAccordion({ entries }: { entries: GuideEntry[] }) {
  return (
    <div className="text-left">
      {entries.map((entry, i) => (
        <details
          key={entry.question}
          name="blockchain-guide"
          open={i === 0}
          className="border border-guide bg-white [&+&]:border-t-0"
        >
          <summary className="cursor-pointer list-none bg-guide px-5 py-3 text-xl text-white hover:underline [&::-webkit-details-marker]:hidden">
            {entry.question}
          </summary>
          <div className="px-5 py-5 text-[#212529]">
            <p>{entry.answer}</p>
            {entry.youtubeId && (
              <iframe
                className="mt-6 aspect-video w-full max-w-[560px]"
                src={`https://www.youtube-nocookie.com/embed/${entry.youtubeId}`}
                title={entry.question}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        </details>
      ))}
    </div>
  );
}
