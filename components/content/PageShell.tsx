/**
 * Common frame for the inner pages: an eyebrow + display title + lead header, then content.
 */
export function PageShell({
  eyebrow,
  title,
  lead,
  width = 'narrow',
  children,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  width?: 'narrow' | 'wide';
  children: React.ReactNode;
}) {
  return (
    <main className={`mx-auto w-full px-5 pt-16 sm:pt-20 ${width === 'wide' ? 'max-w-6xl' : 'max-w-3xl'}`}>
      <header className="mb-10 sm:mb-12">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">{title}</h1>
        {lead && <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">{lead}</p>}
      </header>
      {children}
    </main>
  );
}

/** A titled block of long-form copy (About / Terms / Privacy). */
export function InfoSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-8 first:border-t-0 first:pt-0">
      <h2 className="font-display text-base font-semibold text-fg sm:text-lg">{heading}</h2>
      <div className="prose-lens mt-3 text-[15px]">{children}</div>
    </section>
  );
}

/** Highlighted intro paragraph. */
export function Intro({ children }: { children: React.ReactNode }) {
  return (
    <p className="prose-lens mb-10 rounded-2xl border border-line bg-white/[0.02] p-5 text-[15px] sm:p-6">{children}</p>
  );
}
