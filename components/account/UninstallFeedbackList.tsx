import { reasonLabel } from '@/lib/uninstall';

type Row = {
  id: string;
  reason: string;
  details: string | null;
  competitor: string | null;
  extensionVersion: string | null;
  browser: string;
  createdAt: Date;
};

/** /admin: answers from the extension uninstall survey (newest first) and a count per reason. Server-rendered. */
export function UninstallFeedbackList({ rows }: { rows: Row[] }) {
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.reason, (counts.get(r.reason) ?? 0) + 1);
  const top = [...counts].sort((a, b) => b[1] - a[1]);

  return (
    <section aria-labelledby="uninstall-feedback" className="mt-12 border-t border-line pt-8">
      <h2 id="uninstall-feedback" className="heading text-2xl">
        Uninstall survey
      </h2>
      <p className="mt-1 text-sm font-semibold text-faint">
        The latest {rows.length} answers from web3lens.com/uninstall. Before the database is set up, answers arrive by email instead.
      </p>
      {rows.length === 0 ? (
        <p className="mt-5 text-sm text-muted">No answers yet.</p>
      ) : (
        <>
          <ul className="mt-5 flex flex-wrap gap-2">
            {top.map(([reason, n]) => (
              <li key={reason} className="rounded-full border border-line bg-ink-2 px-3 py-1 text-sm font-bold">
                {reasonLabel(reason)} <span className="text-accent">{n}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-ink-2 text-faint">
                <tr>
                  <th className="px-3 py-2 font-bold">When</th>
                  <th className="px-3 py-2 font-bold">Reason</th>
                  <th className="px-3 py-2 font-bold">Answer</th>
                  <th className="px-3 py-2 font-bold">Version</th>
                  <th className="px-3 py-2 font-bold">Browser</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-line align-top">
                    <td className="whitespace-nowrap px-3 py-2 text-muted">{r.createdAt.toISOString().slice(0, 16).replace('T', ' ')}</td>
                    <td className="px-3 py-2 font-semibold">{reasonLabel(r.reason)}</td>
                    <td className="px-3 py-2 break-words">{r.competitor ? `Switched to: ${r.competitor}` : (r.details ?? '')}</td>
                    <td className="px-3 py-2 text-muted">{r.extensionVersion ?? ''}</td>
                    <td className="px-3 py-2 text-muted">{r.browser}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
