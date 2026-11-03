import { Info, Lightbulb, Quotes, Warning } from '@phosphor-icons/react/dist/ssr';
import Image from 'next/image';
import Link from 'next/link';
import { ArticleCta } from '@/components/blog/ArticleCta';
import { CTA_PRESETS, type CtaPreset } from '@/config/blog';
import type { Block, Inline } from '@/lib/blog/markdown';

const isExternal = (href: string) => /^https?:\/\//.test(href);

function Inlines({ nodes }: { nodes: Inline[] }) {
  return (
    <>
      {nodes.map((n, i) => {
        switch (n.t) {
          case 'text':
            return n.v;
          case 'code':
            return <code key={i}>{n.v}</code>;
          case 'strong':
            return (
              <strong key={i}>
                <Inlines nodes={n.c} />
              </strong>
            );
          case 'em':
            return (
              <em key={i}>
                <Inlines nodes={n.c} />
              </em>
            );
          case 'link':
            return isExternal(n.href) ? (
              <a key={i} href={n.href} target="_blank" rel="noopener">
                <Inlines nodes={n.c} />
              </a>
            ) : (
              <Link key={i} href={n.href}>
                <Inlines nodes={n.c} />
              </Link>
            );
        }
      })}
    </>
  );
}

const CALLOUT = {
  note: { icon: Info, label: 'Note', cls: 'border-accent/50' },
  tip: { icon: Lightbulb, label: 'Tip', cls: 'border-accent/50' },
  warning: { icon: Warning, label: 'Warning', cls: 'border-redline/60' },
  quote: { icon: Quotes, label: '', cls: 'border-line-strong' },
} as const;

/** Renders a parsed post body inside `.prose-article`. */
export function Markdown({ blocks }: { blocks: Block[] }) {
  // The first figure near the top is likely the LCP element: load it eagerly.
  const eagerImage = blocks.findIndex((b) => b.t === 'image');
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'heading': {
            const H = b.level === 2 ? 'h2' : 'h3';
            return (
              <H key={i} id={b.id}>
                <Inlines nodes={b.c} />
              </H>
            );
          }
          case 'paragraph':
            return (
              <p key={i}>
                <Inlines nodes={b.c} />
              </p>
            );
          case 'list': {
            const L = b.ordered ? 'ol' : 'ul';
            return (
              <L key={i}>
                {b.items.map((it, j) => (
                  <li key={j}>
                    <Inlines nodes={it} />
                  </li>
                ))}
              </L>
            );
          }
          case 'code':
            return (
              <pre key={i} tabIndex={0} aria-label={b.lang ? `${b.lang} example` : 'Code example'}>
                <code>{b.v}</code>
              </pre>
            );
          case 'callout': {
            const c = CALLOUT[b.variant];
            const variantCls = b.variant === 'warning' ? 'callout-warning' : '';
            return (
              <aside key={i} className={`callout ${variantCls} ${c.cls}`}>
                <c.icon aria-hidden weight="duotone" className="callout-icon" />
                <div>
                  {c.label && <p className="callout-label">{c.label}</p>}
                  {b.c.map((p, j) => (
                    <p key={j}>
                      <Inlines nodes={p} />
                    </p>
                  ))}
                </div>
              </aside>
            );
          }
          case 'table':
            return (
              <div key={i} className="table-wrap" tabIndex={0} role="region" aria-label="Table">
                <table>
                  <thead>
                    <tr>
                      {b.head.map((h, j) => (
                        <th key={j} scope="col">
                          <Inlines nodes={h} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, j) => (
                      <tr key={j}>
                        {r.map((cell, k) => (
                          <td key={k}>
                            <Inlines nodes={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case 'image': {
            const priority = i === eagerImage && i < 4;
            return (
              <figure key={i}>
                {b.width && b.height ? (
                  <Image src={b.src} alt={b.alt} width={b.width} height={b.height} sizes="(min-width: 1024px) 760px, 100vw" priority={priority} />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.src} alt={b.alt} loading="lazy" decoding="async" />
                )}
                {b.caption && <figcaption>{b.caption}</figcaption>}
              </figure>
            );
          }
          case 'directive':
            if (b.name === 'cta' && (CTA_PRESETS as readonly string[]).includes(b.arg)) return <ArticleCta key={i} preset={b.arg as CtaPreset} />;
            return null;
          case 'hr':
            return <hr key={i} />;
        }
      })}
    </>
  );
}
