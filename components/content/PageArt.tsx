/**
 * Decorative blueprint-style illustrations for the static pages. Drawn in SVG from the design tokens (Tailwind
 * fill-/stroke- classes), so they are sharp, weigh nothing and follow the light/dark theme. Purely decorative:
 * hidden from assistive tech.
 */

export type PageArtScene =
  | 'legal'
  | 'privacy'
  | 'about'
  | 'contact'
  | 'guide'
  | 'extension'
  | 'directory'
  | 'sitemap'
  | 'blog'
  | 'pricing'
  | 'notfound';

const W = 480;
const H = 270;

function Grid() {
  const xs = Array.from({ length: W / 24 - 1 }, (_, i) => (i + 1) * 24);
  const ys = Array.from({ length: Math.floor(H / 24) }, (_, i) => (i + 1) * 24);
  return (
    <g className="stroke-line" strokeWidth="1" opacity="0.55">
      {xs.map((x) => (
        <path key={`x${x}`} d={`M${x} 0V${H}`} />
      ))}
      {ys.map((y) => (
        <path key={`y${y}`} d={`M0 ${y}H${W}`} />
      ))}
    </g>
  );
}

/** Isometric cube whose top vertex sits at (x, y). */
function Cube({ x, y, s, accent = false }: { x: number; y: number; s: number; accent?: boolean }) {
  const top = `${x},${y} ${x + s},${y + s / 2} ${x},${y + s} ${x - s},${y + s / 2}`;
  const left = `${x - s},${y + s / 2} ${x},${y + s} ${x},${y + 2 * s} ${x - s},${y + 1.5 * s}`;
  const right = `${x},${y + s} ${x + s},${y + s / 2} ${x + s},${y + 1.5 * s} ${x},${y + 2 * s}`;
  const stroke = accent ? 'stroke-accent' : 'stroke-line-strong';
  return (
    <g strokeWidth="1.5" strokeLinejoin="round" className={stroke}>
      <polygon points={left} className="fill-ink-3" />
      <polygon points={right} className="fill-ink" />
      <polygon points={top} className={accent ? 'fill-accent/25' : 'fill-ink-2'} />
    </g>
  );
}

/** Browser window chrome; returns the content area's top y. */
function Browser({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="5" className="fill-ink-3 stroke-line-strong" strokeWidth="1.5" />
      <path d={`M${x} ${y + 24}H${x + w}`} className="stroke-line-strong" strokeWidth="1.5" />
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={x + 14 + i * 11} cy={y + 12} r="3.5" className={i === 0 ? 'fill-accent' : 'fill-line-strong'} />
      ))}
      <rect x={x + 56} y={y + 6} width={Math.min(220, w - 110)} height="12" rx="3" className="fill-ink-2" />
    </g>
  );
}

function Bars({ x, y, widths, gap = 11, accentFirst = false }: { x: number; y: number; widths: number[]; gap?: number; accentFirst?: boolean }) {
  return (
    <g>
      {widths.map((w, i) => (
        <rect key={i} x={x} y={y + i * gap} width={w} height="4" rx="2" className={accentFirst && i === 0 ? 'fill-accent' : 'fill-line-strong'} />
      ))}
    </g>
  );
}

function Check({ x, y, size = 8 }: { x: number; y: number; size?: number }) {
  return (
    <path
      d={`M${x} ${y} l${size * 0.4} ${size * 0.4} l${size * 0.8} ${-size * 0.8}`}
      className="stroke-accent"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  );
}

const SCENES: Record<PageArtScene, () => React.ReactNode> = {
  legal: () => (
    <>
      <rect x="138" y="44" width="156" height="196" rx="4" transform="rotate(-7 216 142)" className="fill-ink-3 stroke-line-strong" strokeWidth="1.5" />
      <rect x="168" y="30" width="164" height="206" rx="4" className="fill-ink-2 stroke-line-strong" strokeWidth="1.5" />
      <rect x="186" y="50" width="74" height="9" rx="2" className="fill-accent" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <circle cx="191" cy={88 + i * 40} r="4" className="fill-accent/40" />
          <Bars x={202} y={84 + i * 40} widths={[110, 96, 70]} gap={10} />
        </g>
      ))}
      <g>
        <circle cx="330" cy="196" r="36" className="fill-ink-2 stroke-accent" strokeWidth="2" />
        <circle cx="330" cy="196" r="27" className="stroke-accent/50" strokeWidth="1.5" strokeDasharray="3 4" fill="none" />
        <Check x={315} y={196} size={22} />
        <path d="M312 228 l-8 26 l14 -8 l8 12 l6 -26 M348 228 l8 26 l-14 -8 l-8 12 l-6 -26" className="fill-accent/20 stroke-accent" strokeWidth="1.5" strokeLinejoin="round" />
      </g>
      <path d="M78 214 C 110 196, 120 230, 150 210" className="stroke-accent/60" strokeWidth="2" strokeLinecap="round" fill="none" />
    </>
  ),
  privacy: () => (
    <>
      <Browser x={60} y={34} w={360} h={204} />
      <Bars x={84} y={86} widths={[86, 64, 78, 52]} gap={14} />
      <Bars x={322} y={86} widths={[74, 58, 80, 46]} gap={14} />
      <path d="M172 102 L204 128 M172 144 L204 140 M308 102 L276 128 M308 144 L276 140" className="stroke-line-strong" strokeWidth="1.5" strokeDasharray="3 4" />
      <path
        d="M240 78 L290 96 V136 C290 170 268 192 240 204 C212 192 190 170 190 136 V96 Z"
        className="fill-ink-2 stroke-accent"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M240 92 L276 105 V136 C276 160 261 177 240 187 C219 177 204 160 204 136 V105 Z" className="fill-accent/10" />
      <circle cx="240" cy="132" r="11" className="fill-accent" />
      <path d="M233 138 H247 L244 162 H236 Z" className="fill-accent" />
      <rect x="84" y="206" width="70" height="18" rx="3" className="fill-ink-2 stroke-line-strong" />
      <circle cx="96" cy="215" r="4" className="fill-accent" />
      <rect x="106" y="213" width="38" height="4" rx="2" className="fill-line-strong" />
    </>
  ),
  about: () => (
    <>
      <path d="M100 150 H380" className="stroke-line-strong" strokeWidth="2" strokeDasharray="2 6" />
      <Cube x={110} y={96} s={34} />
      <Cube x={240} y={96} s={34} accent />
      <Cube x={370} y={96} s={34} />
      <Bars x={78} y={60} widths={[64, 44]} gap={9} />
      <Bars x={338} y={60} widths={[64, 44]} gap={9} />
      <circle cx="240" cy="130" r="64" className="fill-accent/5 stroke-accent" strokeWidth="3" />
      <circle cx="240" cy="130" r="56" className="stroke-accent/40" strokeWidth="1" fill="none" />
      <path d="M286 176 L330 222" className="stroke-accent" strokeWidth="11" strokeLinecap="round" />
      <path d="M218 82 A52 52 0 0 1 270 86" className="stroke-fg/50" strokeWidth="2" strokeLinecap="round" fill="none" />
    </>
  ),
  contact: () => (
    <>
      <rect x="40" y="56" width="98" height="52" rx="6" className="fill-ink-3 stroke-line-strong" strokeWidth="1.5" />
      <path d="M62 108 l-6 16 l20 -16" className="fill-ink-3 stroke-line-strong" strokeWidth="1.5" strokeLinejoin="round" />
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={74 + i * 15} cy="82" r="4" className={i === 1 ? 'fill-accent' : 'fill-line-strong'} />
      ))}
      <rect x="140" y="112" width="190" height="122" rx="5" className="fill-ink-3 stroke-line-strong" strokeWidth="1.5" />
      <path d="M140 116 L235 180 L330 116" className="stroke-line-strong" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
      <path d="M140 230 L208 168 M330 230 L262 168" className="stroke-line-strong" strokeWidth="1.5" />
      <rect x="196" y="78" width="78" height="64" rx="3" className="fill-ink-2 stroke-accent" strokeWidth="1.5" />
      <Bars x={208} y={92} widths={[54, 40, 48]} gap={10} accentFirst />
      <path d="M300 92 C 330 40, 360 110, 388 66" className="stroke-accent/70" strokeWidth="2" strokeDasharray="4 5" strokeLinecap="round" fill="none" />
      <path d="M380 62 L448 34 L424 104 L408 80 Z" className="fill-ink-2 stroke-accent" strokeWidth="2" strokeLinejoin="round" />
      <path d="M408 80 L448 34" className="stroke-accent" strokeWidth="1.5" />
    </>
  ),
  guide: () => (
    <>
      <path d="M110 128 L240 88 L370 128" className="stroke-accent/60" strokeWidth="2" strokeDasharray="4 5" fill="none" />
      <Cube x={110} y={110} s={34} />
      <Cube x={240} y={64} s={38} accent />
      <Cube x={370} y={110} s={34} />
      {[110, 240, 370].map((cx, i) => (
        <g key={cx}>
          <path d={`M${cx} ${i === 1 ? 140 : 178} V196`} className="stroke-line-strong" strokeWidth="1.5" />
          <circle cx={cx} cy="216" r="20" className={i === 1 ? 'fill-ink-2 stroke-accent' : 'fill-ink-2 stroke-line-strong'} strokeWidth="2" />
          <circle cx={cx} cy="216" r="12" className={i === 1 ? 'stroke-accent/50' : 'stroke-line-strong'} strokeWidth="1.5" fill="none" />
        </g>
      ))}
      <path d="M232 216 h16 M240 208 v16" className="stroke-accent" strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  extension: () => (
    <>
      <Browser x={40} y={30} w={400} h={212} />
      <rect x="402" y="36" width="24" height="12" rx="2" className="fill-accent" />
      <Bars x={64} y={78} widths={[150, 120, 170, 90]} gap={13} />
      <rect x="60" y="138" width="152" height="18" rx="3" className="fill-accent/15 stroke-accent" strokeWidth="1.5" />
      <rect x="68" y="145" width="120" height="4" rx="2" className="fill-accent" />
      <rect x="150" y="164" width="104" height="54" rx="3" className="fill-ink-2 stroke-line-strong" strokeWidth="1.5" />
      <Bars x={162} y={176} widths={[78, 64, 70]} gap={12} accentFirst />
      <path d="M140 150 v24 l6 -6 l5 11 l5 -2 l-5 -11 h8 z" className="fill-fg stroke-ink" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M414 48 V60" className="stroke-accent" strokeWidth="1.5" />
      <rect x="290" y="60" width="140" height="166" rx="4" className="fill-ink-2 stroke-accent" strokeWidth="2" />
      <rect x="302" y="72" width="116" height="18" rx="3" className="fill-ink stroke-line-strong" />
      <circle cx="312" cy="81" r="4" className="stroke-accent" strokeWidth="1.5" fill="none" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <circle cx="312" cy={110 + i * 28} r="7" className={i === 0 ? 'fill-accent' : 'fill-line-strong'} />
          <rect x="326" y={105 + i * 28} width={[78, 64, 84, 56][i]} height="4" rx="2" className="fill-line-strong" />
          <rect x="326" y={113 + i * 28} width={[48, 58, 40, 50][i]} height="3" rx="1.5" className="fill-line" />
        </g>
      ))}
    </>
  ),
  directory: () => {
    const nodes = [0, 60, 120, 180, 240, 300].map((deg) => {
      const r = (deg * Math.PI) / 180;
      return { x: Math.round(240 + 160 * Math.cos(r)), y: Math.round(135 + 88 * Math.sin(r)) };
    });
    return (
      <>
        {nodes.map((n, i) => {
          const m = nodes[(i + 1) % nodes.length];
          return <path key={`r${i}`} d={`M${n.x} ${n.y} L${m.x} ${m.y}`} className="stroke-line-strong" strokeWidth="1.5" strokeDasharray="3 5" />;
        })}
        {nodes.map((n, i) => (
          <path key={`s${i}`} d={`M240 135 L${n.x} ${n.y}`} className={i % 2 ? 'stroke-line-strong' : 'stroke-accent/60'} strokeWidth="1.5" />
        ))}
        {nodes.map((n, i) => (
          <circle key={`n${i}`} cx={n.x} cy={n.y} r="20" className={i % 2 ? 'fill-ink-3 stroke-line-strong' : 'fill-ink-2 stroke-accent'} strokeWidth="2" />
        ))}
        <path d={`M${nodes[0].x - 6} ${nodes[0].y - 8} L${nodes[0].x + 8} ${nodes[0].y} L${nodes[0].x - 6} ${nodes[0].y + 8} Z`} className="fill-accent" />
        <g className="stroke-accent" strokeWidth="2" strokeLinecap="round" fill="none">
          <path d={`M${nodes[2].x - 8} ${nodes[2].y + 6} a14 14 0 0 1 14 -14`} />
          <path d={`M${nodes[2].x - 8} ${nodes[2].y} a8 8 0 0 1 8 -8`} />
        </g>
        <circle cx={nodes[2].x - 7} cy={nodes[2].y + 6} r="2.5" className="fill-accent" />
        <rect x={nodes[4].x - 9} y={nodes[4].y - 7} width="18" height="12" rx="2" className="stroke-accent" strokeWidth="2" fill="none" />
        <circle cx="240" cy="135" r="30" className="fill-ink-2 stroke-accent" strokeWidth="2.5" />
        <circle cx="236" cy="131" r="10" className="stroke-accent" strokeWidth="2.5" fill="none" />
        <path d="M243 138 L252 147" className="stroke-accent" strokeWidth="3" strokeLinecap="round" />
      </>
    );
  },
  sitemap: () => {
    const kids = [70, 183, 297, 410];
    return (
      <>
        <rect x="200" y="22" width="80" height="30" rx="4" className="fill-accent/20 stroke-accent" strokeWidth="2" />
        <rect x="214" y="35" width="52" height="4" rx="2" className="fill-accent" />
        <path d={`M240 52 V74 M${kids[0]} 74 H${kids[3]} ${kids.map((x) => `M${x} 74 V92`).join(' ')}`} className="stroke-line-strong" strokeWidth="1.5" />
        {kids.map((x, i) => (
          <g key={x}>
            <rect x={x - 40} y="92" width="80" height="28" rx="4" className="fill-ink-3 stroke-line-strong" strokeWidth="1.5" />
            <rect x={x - 28} y="104" width={[50, 40, 56, 44][i]} height="4" rx="2" className="fill-line-strong" />
            <path d={`M${x - 26} 120 V${150 + (i % 2 ? 1 : 2) * 30}`} className="stroke-line-strong" strokeWidth="1.5" />
            {Array.from({ length: i % 2 ? 2 : 3 }, (_, j) => (
              <g key={j}>
                <path d={`M${x - 26} ${150 + j * 30} H${x - 14}`} className="stroke-line-strong" strokeWidth="1.5" />
                <rect
                  x={x - 14}
                  y={141 + j * 30}
                  width="54"
                  height="18"
                  rx="3"
                  className={i === 2 && j === 1 ? 'fill-accent/20 stroke-accent' : 'fill-ink-2 stroke-line-strong'}
                  strokeWidth="1.5"
                />
                <rect x={x - 6} y={148 + j * 30} width={[30, 24, 36][j]} height="3.5" rx="1.75" className={i === 2 && j === 1 ? 'fill-accent' : 'fill-line'} />
              </g>
            ))}
          </g>
        ))}
      </>
    );
  },
  blog: () => (
    <>
      <rect x="126" y="52" width="170" height="184" rx="4" transform="rotate(-9 211 144)" className="fill-ink-3 stroke-line-strong" strokeWidth="1.5" />
      <rect x="196" y="40" width="170" height="184" rx="4" transform="rotate(7 281 132)" className="fill-ink-3 stroke-line-strong" strokeWidth="1.5" />
      <g>
        <rect x="156" y="36" width="172" height="200" rx="4" className="fill-ink-2 stroke-line-strong" strokeWidth="1.5" />
        <rect x="166" y="46" width="152" height="76" rx="3" className="fill-ink-3" />
        {[18, 30, 42].map((r) => (
          <circle key={r} cx="280" cy="76" r={r} className="stroke-line-strong" strokeWidth="1" fill="none" />
        ))}
        <rect x="176" y="96" width="18" height="18" rx="3" className="fill-ink-2 stroke-accent" strokeWidth="1.5" />
        <rect x="166" y="134" width="44" height="4" rx="2" className="fill-accent" />
        <rect x="166" y="146" width="140" height="7" rx="2" className="fill-fg/70" />
        <rect x="166" y="158" width="104" height="7" rx="2" className="fill-fg/70" />
        <Bars x={166} y={176} widths={[148, 132, 140, 90]} gap={10} />
        <path d="M300 36 V64 l-9 -7 l-9 7 V36" className="fill-accent stroke-accent" strokeWidth="1" strokeLinejoin="round" />
      </g>
    </>
  ),
  pricing: () => (
    <>
      <rect x="92" y="58" width="136" height="174" rx="4" className="fill-ink-3 stroke-line-strong" strokeWidth="1.5" />
      <rect x="108" y="76" width="44" height="5" rx="2" className="fill-line-strong" />
      <rect x="108" y="90" width="64" height="14" rx="2" className="fill-fg/60" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <Check x={110} y={130 + i * 22} />
          <rect x="126" y={127 + i * 22} width={[70, 58, 76, 50][i]} height="4" rx="2" className="fill-line-strong" />
        </g>
      ))}
      <rect x="248" y="38" width="148" height="200" rx="4" className="fill-ink-2 stroke-accent" strokeWidth="2" />
      <rect x="248" y="38" width="148" height="22" rx="4" className="fill-accent" />
      <rect x="264" y="46" width="40" height="5" rx="2" className="fill-ink" />
      <rect x="264" y="74" width="40" height="5" rx="2" className="fill-accent" />
      <rect x="264" y="88" width="78" height="14" rx="2" className="fill-fg/80" />
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <Check x={266} y={128 + i * 20} />
          <rect x="282" y={125 + i * 20} width={[86, 70, 92, 64, 80][i]} height="4" rx="2" className="fill-line-strong" />
        </g>
      ))}
      <rect x="264" y="214" width="116" height="14" rx="3" className="fill-accent/25 stroke-accent" strokeWidth="1" />
    </>
  ),
  notfound: () => (
    <>
      <path d="M90 150 H190 M290 150 H390" className="stroke-line-strong" strokeWidth="2" strokeDasharray="2 6" />
      <Cube x={130} y={96} s={34} />
      <Cube x={350} y={96} s={34} />
      <path d="M190 150 l12 -10 l10 18 l12 -16 l10 14 l12 -12 l10 16 l12 -10 l12 0" className="stroke-redline" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" fill="none" />
      <circle cx="240" cy="104" r="26" className="fill-ink-2 stroke-accent" strokeWidth="2.5" />
      <path d="M232 98 a8 8 0 1 1 10 8 v6" className="stroke-accent" strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle cx="242" cy="119" r="2.2" className="fill-accent" />
    </>
  ),
};

/** A framed illustration for a page header. */
export function PageArt({ scene, className = '' }: { scene: PageArtScene; className?: string }) {
  const Scene = SCENES[scene];
  return (
    <figure aria-hidden className={`overflow-hidden rounded-xl border border-line bg-ink-2 ${className}`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        <Grid />
        <Scene />
      </svg>
    </figure>
  );
}
