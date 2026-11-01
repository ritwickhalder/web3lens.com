import { useId } from 'react';

/** Lens mark: an aperture ring around a block. */
export function LogoMark({ className = 'size-8' }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c6f24e" />
          <stop offset="0.5" stopColor="#52e3cf" />
          <stop offset="1" stopColor="#8f7cff" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="13.5" fill="none" stroke={`url(#${id}-g)`} strokeWidth="2.5" />
      <circle cx="16" cy="16" r="9" fill="none" stroke={`url(#${id}-g)`} strokeOpacity="0.35" strokeWidth="1" />
      <path d="M16 10.5 21 13.25v5.5L16 21.5l-5-2.75v-5.5z" fill={`url(#${id}-g)`} />
      <path d="M16 16v5.5M16 16l5-2.75M16 16l-5-2.75" stroke="#07080c" strokeWidth="1" strokeLinejoin="round" />
      <circle cx="25.5" cy="6.5" r="1.6" fill="#c6f24e" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="font-display text-[15px] font-semibold tracking-tight text-fg">
        Web3<span className="text-lime">Lens</span>
      </span>
    </span>
  );
}
