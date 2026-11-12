/**
 * Line illustrations for /account. Solid token colours only (fill-/stroke- utilities), so they follow the theme.
 * Decorative: always aria-hidden.
 */

/** A lens over a short chain of blocks, with a few linked nodes around it. */
export function LensArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 380 220" fill="none" aria-hidden className={className}>
      {/* dotted ground */}
      {Array.from({ length: 12 }, (_, i) => (
        <circle key={i} cx={20 + i * 31} cy={204} r={1.6} className="fill-line-strong" />
      ))}
      {/* network links */}
      <g className="stroke-line-strong" strokeWidth={1.5}>
        <path d="M40 60 L96 34 L150 70" />
        <path d="M300 30 L344 70 L318 120" />
        <path d="M344 70 L366 150" strokeDasharray="3 5" />
        <path d="M14 140 L40 60" strokeDasharray="3 5" />
      </g>
      <g className="fill-ink-3 stroke-line-strong" strokeWidth={1.5}>
        <circle cx={40} cy={60} r={7} />
        <circle cx={96} cy={34} r={5} />
        <circle cx={300} cy={30} r={5} />
        <circle cx={344} cy={70} r={8} />
        <circle cx={318} cy={120} r={5} />
      </g>
      <circle cx={344} cy={70} r={3} className="fill-accent" />
      <circle cx={40} cy={60} r={2.5} className="fill-redline" />
      {/* chain of blocks */}
      <g strokeWidth={1.5}>
        <path d="M86 150 H120 M180 150 H214 M274 150 H300" className="stroke-line-strong" strokeDasharray="4 4" />
        <rect x={40} y={124} width={46} height={52} rx={3} className="fill-ink-3 stroke-line-strong" />
        <rect x={120} y={116} width={60} height={68} rx={3} className="fill-ink-3 stroke-accent" />
        <rect x={214} y={124} width={60} height={52} rx={3} className="fill-ink-3 stroke-line-strong" />
        <rect x={300} y={132} width={40} height={38} rx={3} className="fill-ink-3 stroke-line-strong" />
      </g>
      <g className="fill-line-strong">
        <rect x={50} y={136} width={22} height={4} rx={1} />
        <rect x={50} y={146} width={28} height={4} rx={1} />
        <rect x={50} y={156} width={16} height={4} rx={1} />
        <rect x={224} y={136} width={30} height={4} rx={1} />
        <rect x={224} y={146} width={40} height={4} rx={1} />
        <rect x={224} y={156} width={22} height={4} rx={1} />
        <rect x={310} y={143} width={20} height={4} rx={1} />
        <rect x={310} y={153} width={14} height={4} rx={1} />
      </g>
      <g className="fill-accent">
        <rect x={132} y={130} width={30} height={5} rx={1} />
        <rect x={132} y={141} width={36} height={5} rx={1} opacity={0.55} />
        <rect x={132} y={152} width={22} height={5} rx={1} opacity={0.55} />
        <rect x={132} y={163} width={28} height={5} rx={1} opacity={0.55} />
      </g>
      {/* the lens */}
      <circle cx={170} cy={92} r={50} className="fill-accent/10 stroke-accent" strokeWidth={3} />
      <circle cx={170} cy={92} r={40} className="stroke-accent/40" strokeWidth={1.5} strokeDasharray="2 6" />
      <path d="M206 128 L238 160" className="stroke-accent" strokeWidth={9} strokeLinecap="round" />
      <path d="M146 72 A30 30 0 0 1 172 62" className="stroke-fg/70" strokeWidth={3} strokeLinecap="round" />
      {/* verified badge */}
      <circle cx={214} cy={56} r={13} className="fill-accent" />
      <path d="M208 56 L212.5 60.5 L220.5 52" className="stroke-ink" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A crown on a small stack of rising bars: the Pro upgrade. */
export function ProArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 140" fill="none" aria-hidden className={className}>
      <g className="fill-ink-3 stroke-line-strong" strokeWidth={1.5}>
        <rect x={30} y={92} width={26} height={34} rx={2} />
        <rect x={66} y={74} width={26} height={52} rx={2} />
        <rect x={102} y={54} width={26} height={72} rx={2} />
      </g>
      <rect x={138} y={30} width={26} height={96} rx={2} className="fill-accent/15 stroke-accent" strokeWidth={1.5} />
      <path d="M18 126 H184" className="stroke-line-strong" strokeWidth={1.5} />
      <path d="M43 86 L79 68 L115 48 L151 22" className="stroke-accent" strokeWidth={2} strokeDasharray="4 4" />
      <path d="M132 18 L138 4 L151 13 L164 4 L170 18 Z" className="fill-accent" />
      <circle cx={30} cy={30} r={3} className="fill-redline" />
      <path d="M58 22 v10 M53 27 h10" className="stroke-accent" strokeWidth={2} strokeLinecap="round" />
      <path d="M180 60 v8 M176 64 h8" className="stroke-line-strong" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

/** A shield with a key slot: privacy note. */
export function ShieldArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" aria-hidden className={className}>
      <circle cx={60} cy={60} r={52} className="stroke-line" strokeWidth={1.5} strokeDasharray="3 6" />
      <path d="M60 18 L92 30 V58 C92 80 78 94 60 102 C42 94 28 80 28 58 V30 Z" className="fill-accent/10 stroke-accent" strokeWidth={2.5} strokeLinejoin="round" />
      <circle cx={60} cy={54} r={9} className="fill-accent" />
      <path d="M60 60 V76" className="stroke-accent" strokeWidth={6} strokeLinecap="round" />
    </svg>
  );
}
