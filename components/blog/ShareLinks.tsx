import { FacebookLogo, LinkedinLogo, RedditLogo, TelegramLogo, XLogo } from '@phosphor-icons/react/dist/ssr';
import { CopyButton } from '@/components/ui/CopyButton';

/** Plain share links (no third-party scripts or trackers) plus copy-link. */
export function ShareLinks({ url, title }: { url: string; title: string }) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const targets = [
    { name: 'X', icon: XLogo, href: `https://x.com/intent/post?url=${u}&text=${t}` },
    { name: 'LinkedIn', icon: LinkedinLogo, href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { name: 'Reddit', icon: RedditLogo, href: `https://www.reddit.com/submit?url=${u}&title=${t}` },
    { name: 'Telegram', icon: TelegramLogo, href: `https://t.me/share/url?url=${u}&text=${t}` },
    { name: 'Facebook', icon: FacebookLogo, href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {targets.map((s) => (
        <a
          key={s.name}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer nofollow"
          aria-label={`Share on ${s.name}`}
          className="grid size-10 place-items-center rounded-lg border border-line text-muted transition-colors hover:border-accent hover:text-accent"
        >
          <s.icon aria-hidden weight="bold" className="size-[18px]" />
        </a>
      ))}
      <CopyButton value={url} label="Copy link to this article" />
    </div>
  );
}
