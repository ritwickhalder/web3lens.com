/**
 * Common frame for the content pages: room for the fixed navbar and donation bar, a
 * centred column, and the white "~ TITLE ~" heading the legacy pages used.
 */
export function PageShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-32 pt-[12vh] text-center sm:px-[8%] lg:px-[12%]">
      <h1 className="mb-8 text-[1.75rem] font-medium text-white">~ {title} ~</h1>
      {children}
    </main>
  );
}

/** Green heading strip + light body block (Bootstrap alert-success / alert-light). */
export function InfoSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="mb-4 text-left">
      <h2 className="rounded-t border border-success-border bg-success-bg px-5 py-3 text-base font-bold uppercase text-success-text">
        {heading}
      </h2>
      <div className="prose-legacy rounded-b border border-light-border bg-light-bg px-5 py-3 leading-normal text-light-text">
        {children}
      </div>
    </section>
  );
}

/** Intro paragraph in a light alert box. */
export function Intro({ children }: { children: React.ReactNode }) {
  return (
    <p className="prose-legacy mb-6 rounded border border-light-border bg-light-bg px-5 py-3 text-left font-[Verdana,sans-serif] text-light-text">
      {children}
    </p>
  );
}
