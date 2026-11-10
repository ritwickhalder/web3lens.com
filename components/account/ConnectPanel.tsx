'use client';

import { CheckCircle, GoogleLogo, PuzzlePiece, Warning } from '@phosphor-icons/react/dist/ssr';
import { useState, useSyncExternalStore } from 'react';
import { btnCls, ErrorText, ghostBtnCls, Panel } from '@/components/tools/ui';
import { accountCall, accountStore, signInWithGoogle } from '@/lib/client/account';

const CODE = /^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/;

/**
 * Approves a sign-in started in the Web3Lens extension. The extension shows the same code; approving only links
 * that code to your account, and the extension then collects its own session with a secret it never shows.
 */
export function ConnectPanel({ code }: { code: string }) {
  const account = useSyncExternalStore(accountStore.subscribe, accountStore.getSnapshot, accountStore.getServerSnapshot);
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);
  const valid = CODE.test(code);

  if (!valid) {
    return (
      <Panel title="Open this page from the extension">
        <p className="text-sm font-medium text-muted">Start in the Web3Lens extension: Settings, then Sign in. It opens this page with a code.</p>
      </Panel>
    );
  }
  if (account.status === 'loading') return <Panel><p className="text-sm font-semibold text-muted">Loading…</p></Panel>;
  if (account.status === 'unavailable') {
    return <Panel title="Accounts are coming soon"><p className="text-sm font-medium text-muted">Sign-in isn't switched on yet.</p></Panel>;
  }

  return (
    <Panel title="Connect the extension">
      <p className="text-sm font-medium text-muted">Check that your extension shows this code:</p>
      <p className="my-4 font-mono text-3xl font-bold tracking-[0.2em] text-accent">{code}</p>
      <p className="mb-5 flex items-start gap-2 text-sm font-semibold text-redline">
        <Warning aria-hidden weight="bold" className="mt-0.5 size-4 shrink-0" />
        Only approve if you just clicked Sign in in your own Web3Lens extension. Someone who sent you this link could otherwise use your account.
      </p>
      {state === 'done' ? (
        <p className="flex items-center gap-2 font-bold">
          <CheckCircle aria-hidden weight="bold" className="size-5 text-accent" /> Approved. Go back to the extension to finish; you can close this tab.
        </p>
      ) : account.status === 'signedOut' ? (
        <button type="button" className={btnCls} onClick={() => signInWithGoogle(`/extension/connect?code=${code}`).catch((e: Error) => setError(e.message))}>
          <GoogleLogo aria-hidden weight="bold" className="size-4" /> Sign in with Google to continue
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={btnCls}
            disabled={state === 'busy'}
            onClick={async () => {
              setState('busy');
              setError(null);
              try {
                await accountCall('/api/ext/pair/approve', 'POST', { code });
                setState('done');
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Could not approve.');
                setState('idle');
              }
            }}
          >
            <PuzzlePiece aria-hidden weight="bold" className="size-4" /> {state === 'busy' ? 'Approving…' : `Approve as ${account.me.user.email}`}
          </button>
          <a href="/account" className={ghostBtnCls}>
            Not you? Manage account
          </a>
        </div>
      )}
      {error && <div className="mt-3"><ErrorText>{error}</ErrorText></div>}
    </Panel>
  );
}
