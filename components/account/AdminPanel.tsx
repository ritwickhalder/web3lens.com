'use client';

import { useState } from 'react';
import { btnCls, ErrorText, ghostBtnCls, inputCls, Panel } from '@/components/tools/ui';
import { accountCall } from '@/lib/client/account';

type Found = {
  user: { id: string; email: string; name: string; createdAt: string };
  plan: { plan: string; source: string; until: string | null; trial: string };
  override: { plan: string; until: string | null } | null;
  suspended: boolean;
  subscriptions: { id: string; plan: string; status: string; endsAt: string | null; refunded: boolean }[];
  usage: Record<string, { used: number; limit: number }>;
  sessions: { id: string; createdAt: string; kind: string }[];
  actions: { action: string; detail: unknown; createdAt: string }[];
};

const d = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : '—');

export function AdminPanel() {
  const [email, setEmail] = useState('');
  const [found, setFound] = useState<Found | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<'pro' | 'lifetime' | 'free'>('pro');
  const [until, setUntil] = useState('');

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    try {
      setFound(await accountCall<Found>(`/api/admin/users?email=${encodeURIComponent(email.trim())}`, 'GET'));
    } catch (err) {
      setFound(null);
      setError((err as Error).message);
    }
  }

  async function act(body: Record<string, unknown>, confirmText?: string) {
    if (!found || (confirmText && !window.confirm(confirmText))) return;
    setError(null);
    try {
      await accountCall(`/api/admin/users/${encodeURIComponent(found.user.id)}`, 'POST', body);
      await search();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <Panel title="Find a user">
        <form className="flex flex-wrap gap-2" onSubmit={search}>
          <label htmlFor="admin-email" className="sr-only">
            Email
          </label>
          <input id="admin-email" className={`${inputCls} max-w-sm font-sans`} placeholder="user@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button type="submit" className={btnCls}>
            Search
          </button>
        </form>
        {error && <div className="mt-3"><ErrorText>{error}</ErrorText></div>}
      </Panel>
      {found && (
        <>
          <Panel title={found.user.email}>
            <dl className="grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              <div><dt className="text-faint">Name</dt><dd className="font-bold">{found.user.name}</dd></div>
              <div><dt className="text-faint">Joined</dt><dd className="font-bold">{d(found.user.createdAt)}</dd></div>
              <div><dt className="text-faint">Plan</dt><dd className="font-bold">{found.plan.plan} ({found.plan.source}{found.plan.until ? `, until ${d(found.plan.until)}` : ''})</dd></div>
              <div><dt className="text-faint">Trial</dt><dd className="font-bold">{found.plan.trial}</dd></div>
              <div><dt className="text-faint">Override</dt><dd className="font-bold">{found.override ? `${found.override.plan}${found.override.until ? ` until ${d(found.override.until)}` : ''}` : 'none'}</dd></div>
              <div><dt className="text-faint">Status</dt><dd className={`font-bold ${found.suspended ? 'text-danger' : ''}`}>{found.suspended ? 'Suspended' : 'Active'}</dd></div>
              <div><dt className="text-faint">Usage today</dt><dd className="font-bold">{Object.entries(found.usage).map(([k, v]) => `${k} ${v.used}/${v.limit}`).join(' · ')}</dd></div>
              <div><dt className="text-faint">Sessions</dt><dd className="font-bold">{found.sessions.length} ({found.sessions.filter((s) => s.kind === 'extension').length} extension)</dd></div>
            </dl>
            {found.subscriptions.length > 0 && (
              <ul className="mt-4 space-y-1 text-sm">
                {found.subscriptions.map((s) => (
                  <li key={s.id} className="font-mono text-[13px]">
                    {s.id} · {s.plan} · {s.status}
                    {s.refunded ? ' · refunded' : ''} · ends {d(s.endsAt)}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Actions">
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-sm font-bold">
                Plan
                <select value={plan} onChange={(e) => setPlan(e.target.value as typeof plan)} className="ml-2 h-10 rounded-lg border border-line-strong bg-ink px-2 text-sm font-semibold">
                  <option value="pro">Pro</option>
                  <option value="lifetime">Lifetime</option>
                  <option value="free">Force Free</option>
                </select>
              </label>
              <label className="text-sm font-bold">
                Until
                <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} className="ml-2 h-10 rounded-lg border border-line-strong bg-ink px-2 text-sm font-semibold" />
              </label>
              <button type="button" className={btnCls} onClick={() => void act({ action: 'override', plan, until: until ? new Date(`${until}T23:59:59Z`).toISOString() : null })}>
                Set override
              </button>
              {found.override && (
                <button type="button" className={ghostBtnCls} onClick={() => void act({ action: 'clearOverride' })}>
                  Clear override
                </button>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className={ghostBtnCls} onClick={() => void act({ action: 'revokeSessions' }, 'Sign this user out everywhere?')}>
                Sign out everywhere
              </button>
              {found.suspended ? (
                <button type="button" className={ghostBtnCls} onClick={() => void act({ action: 'unsuspend' })}>
                  Unsuspend
                </button>
              ) : (
                <button type="button" className={`${ghostBtnCls} hover:border-danger hover:text-danger`} onClick={() => void act({ action: 'suspend' }, `Suspend ${found.user.email}? They are signed out and can't sign in until unsuspended.`)}>
                  Suspend
                </button>
              )}
            </div>
          </Panel>
          {found.actions.length > 0 && (
            <Panel title="Audit trail">
              <ul className="space-y-1 text-sm">
                {found.actions.map((a, i) => (
                  <li key={i}>
                    <span className="font-bold">{a.action}</span> <span className="text-muted">{new Date(a.createdAt).toLocaleString()}</span> <span className="font-mono text-[12px] text-faint">{JSON.stringify(a.detail)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
