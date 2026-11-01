import { chainMeta } from '@/lib/chain-meta';

/** Round chain badge: brand-coloured ring with the ticker's first letters. */
export function ChainGlyph({ id, name, size = 'md' }: { id: string; name: string; size?: 'sm' | 'md' }) {
  const { symbol, color } = chainMeta(id, name);
  const dims = size === 'sm' ? 'size-5 text-[8px]' : 'size-7 text-[9.5px]';
  return (
    <span
      aria-hidden
      className={`${dims} grid shrink-0 place-items-center rounded-full font-mono font-semibold tracking-tight`}
      style={{
        color,
        background: `color-mix(in oklab, ${color} 14%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${color} 45%, transparent)`,
      }}
    >
      {symbol.slice(0, size === 'sm' ? 1 : 3)}
    </span>
  );
}
