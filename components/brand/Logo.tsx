/** Lens mark drawn as line-art: an aperture ring with crosshair ticks around a block. */
export function LogoMark({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden fill="none" stroke="currentColor">
      <circle cx="16" cy="16" r="12.5" strokeWidth="2" />
      <circle cx="16" cy="16" r="8.5" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
      <path d="M16 1.5v4M16 26.5v4M1.5 16h4M26.5 16h4" strokeWidth="1.75" />
      <path d="M16 11.5 20 13.75v4.5L16 20.5l-4-2.25v-4.5z" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M16 16v4.5M16 16l4-2.25M16 16l-4-2.25" strokeWidth="1.1" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5 text-accent">
      <LogoMark />
      <span className="text-xl font-extrabold tracking-tight text-fg">
        Web3<span className="text-accent">Lens</span>
      </span>
    </span>
  );
}
