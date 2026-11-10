'use client';

import { CheckCircle, XCircle } from '@phosphor-icons/react/dist/ssr';
import { useEffect, useState } from 'react';
import { POPUP_MESSAGE } from '@/lib/client/account';

const ERRORS: Record<string, string> = {
  access_denied: 'You cancelled the Google sign-in.',
  unable_to_create_session: "This account can't sign in right now.",
  state_mismatch: 'The sign-in took too long or was opened twice. Please try again.',
};

/** Where the sign-in popup lands after Google: tells the opener and closes. Opened directly, it goes to /account. */
export function PopupClose() {
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('error');
    const message = code ? (ERRORS[code] ?? 'Sign-in did not complete. Please try again.') : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the URL once on mount
    setError(message);
    const opener = window.opener as Window | null;
    if (!opener || opener.closed) {
      if (!code) window.location.replace('/account');
      return;
    }
    try {
      opener.postMessage({ type: POPUP_MESSAGE, ok: !code, error: message }, window.location.origin);
    } catch {
      /* the opener navigated away */
    }
    const t = window.setTimeout(() => window.close(), code ? 2500 : 150);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <main className="wrap grid min-h-[60vh] place-items-center text-center">
      {error ? (
        <p className="flex items-start gap-2 font-semibold text-muted">
          <XCircle aria-hidden weight="bold" className="mt-0.5 size-5 shrink-0 text-danger" /> {error}
        </p>
      ) : (
        <p className="flex items-center gap-2 font-semibold text-muted">
          <CheckCircle aria-hidden weight="bold" className="size-5 text-accent" /> Signed in. You can close this window.
        </p>
      )}
    </main>
  );
}
