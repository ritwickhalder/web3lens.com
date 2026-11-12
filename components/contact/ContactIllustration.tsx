/**
 * Decorative illustration for the contact page: a letter with a lens on its flap, linked to
 * a small network of chain nodes. Solid colours from the theme tokens only.
 */
export function ContactIllustration({ className }: { className?: string }) {
  const accent = 'var(--color-accent)';
  const line = 'var(--color-line-strong)';
  const tint = 'color-mix(in oklab, var(--color-accent) 12%, var(--color-ink-2))';
  const nodes = [
    { x: 40, y: 38, r: 11 },
    { x: 330, y: 30, r: 9 },
    { x: 352, y: 150, r: 12 },
    { x: 28, y: 160, r: 8 },
    { x: 190, y: 8, r: 6 },
  ];
  return (
    <svg viewBox="0 0 380 190" role="img" aria-label="An envelope with a lens, connected to blockchain nodes" className={className}>
      <g stroke={line} strokeWidth="1.5" strokeDasharray="4 5" fill="none">
        {nodes.map((n) => (
          <line key={`${n.x}-${n.y}`} x1={n.x} y1={n.y} x2="190" y2="98" />
        ))}
      </g>
      {nodes.map((n, i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y} r={n.r} fill="var(--color-ink)" stroke={i % 2 ? line : accent} strokeWidth="2" />
          {n.r > 8 && <circle cx={n.x} cy={n.y} r={n.r / 3} fill={accent} />}
        </g>
      ))}
      {/* Envelope */}
      <rect x="110" y="52" width="160" height="104" rx="12" fill="var(--color-ink-2)" stroke={accent} strokeWidth="2.5" />
      <path d="M114 60 L190 112 L266 60" fill={tint} stroke={accent} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M114 150 L170 104 M266 150 L210 104" stroke={line} strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Lens seal on the flap */}
      <circle cx="190" cy="112" r="21" fill="var(--color-ink)" stroke={accent} strokeWidth="3" />
      <circle cx="190" cy="112" r="11" fill="none" stroke={accent} strokeWidth="2" />
      <circle cx="190" cy="112" r="4" fill={accent} />
      <path d="M205 127 L216 138" stroke={accent} strokeWidth="4" strokeLinecap="round" />
      {/* Sparkle marks */}
      <path d="M298 78 v14 M291 85 h14" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M76 100 v10 M71 105 h10" stroke={line} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
