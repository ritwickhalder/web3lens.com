import {
  BookOpenText,
  Code,
  Compass,
  CursorClick,
  Fingerprint,
  IdentificationCard,
  MagnifyingGlass,
  PuzzlePiece,
  Receipt,
  Scan,
  SealCheck,
  ShieldCheck,
  Stack,
  Table,
  TreeStructure,
  Wrench,
} from '@phosphor-icons/react/dist/ssr';
import { getCategory, type CoverIcon } from '@/config/blog';
import { ChainGlyph } from '@/components/search/ChainGlyph';
import { getChain } from '@/lib/chains';

const COVER_ICONS: Record<CoverIcon, typeof BookOpenText> = {
  book: BookOpenText,
  code: Code,
  compass: Compass,
  cursor: CursorClick,
  fingerprint: Fingerprint,
  identity: IdentificationCard,
  search: MagnifyingGlass,
  puzzle: PuzzlePiece,
  receipt: Receipt,
  scan: Scan,
  seal: SealCheck,
  shield: ShieldCheck,
  stack: Stack,
  table: Table,
  tree: TreeStructure,
  wrench: Wrench,
};

/**
 * Featured image for a post, drawn in HTML/SVG from the design tokens (no image download, sharp in both themes):
 * the post's icon, its category and the chains it covers.
 */
export function PostCover({ icon, category, coins, index, size = 'card' }: { icon: string; category: string; coins: string[]; index?: number; size?: 'card' | 'hero' }) {
  const Icon = COVER_ICONS[icon as CoverIcon] ?? BookOpenText;
  const hero = size === 'hero';
  return (
    <div aria-hidden className={`relative overflow-hidden rounded-xl border border-line bg-ink-3 ${hero ? 'aspect-[21/9]' : 'aspect-[16/9]'}`}>
      <svg className="absolute -right-10 -top-10 h-[150%] text-line-strong" viewBox="0 0 200 200" fill="none" stroke="currentColor">
        {[30, 55, 80, 98].map((r) => (
          <circle key={r} cx="130" cy="70" r={r} strokeWidth="1" />
        ))}
        <path d="M130 0v200M30 70h200" strokeWidth="1" strokeDasharray="3 5" />
      </svg>
      <div className="absolute inset-x-4 top-4 flex items-center justify-between text-[11px] font-extrabold uppercase tracking-[0.14em] text-accent">
        <span>{getCategory(category)?.name}</span>
        {index !== undefined && <span className="text-faint">No. {String(index).padStart(2, '0')}</span>}
      </div>
      <div className="absolute bottom-4 left-4 flex items-end gap-3">
        <span className={`grid place-items-center rounded-xl bg-ink-2 text-accent ring-1 ring-line ${hero ? 'size-20' : 'size-14'}`}>
          <Icon weight="duotone" className={hero ? 'size-12' : 'size-9'} />
        </span>
      </div>
      {coins.length > 0 && (
        <div className="absolute bottom-4 right-4 flex -space-x-2">
          {coins.slice(0, 4).map((id) => (
            <span key={id} className="rounded-full ring-2 ring-ink-3">
              <ChainGlyph id={id} name={getChain(id)?.name ?? id} size={hero ? 'lg' : 'md'} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
