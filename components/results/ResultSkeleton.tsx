/** Placeholder while a result page fetches (route-level loading.tsx). */
export function ResultSkeleton({ label }: { label: string }) {
  return (
    <main className="wrap pt-10 sm:pt-14" aria-busy>
      <p className="label">{label}</p>
      <div className="mt-4 h-9 w-full max-w-3xl animate-pulse rounded-lg bg-ink-3" />
      <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl border border-line bg-ink-2" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-2xl border border-line bg-ink-2" />
      </div>
      <p className="sr-only">Loading…</p>
    </main>
  );
}

export function ResultError({ title, message, query }: { title: string; message: string; query?: string }) {
  return (
    <main className="wrap pt-10 sm:pt-14">
      <p className="label">Not found</p>
      <h1 className="heading mt-3 text-3xl sm:text-4xl">{title}</h1>
      <p className="mt-4 max-w-2xl text-lg font-semibold text-muted">{message}</p>
      {query && (
        <a href={`/search?q=${encodeURIComponent(query)}`} className="mt-6 inline-flex rounded-xl bg-accent px-6 py-3 font-extrabold text-ink hover:bg-accent-hover">
          Search for it on all chains
        </a>
      )}
    </main>
  );
}
