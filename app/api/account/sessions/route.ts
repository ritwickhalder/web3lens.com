import { and, eq, gt } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import { accountError, accountJson, isSameOrigin } from '@/lib/server/account-http';
import { EXTENSION_SESSION_AGENT } from '@/lib/server/auth';
import { accountsConfigured } from '@/lib/server/env';
import { currentUser } from '@/lib/server/session';

/** "Chrome on Windows" from a user agent; null when it can't tell. */
function deviceOf(ua: string | null | undefined): string | null {
  if (!ua) return null;
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : null;
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS X/.test(ua) ? 'macOS' : /CrOS/.test(ua) ? 'ChromeOS' : /Linux/.test(ua) ? 'Linux' : null;
  if (browser && os) return `${browser} on ${os}`;
  return browser ?? os;
}

/** GET: the signed-in user's live sessions (website and extensions). Tokens are never returned. */
export async function GET(request: Request) {
  if (!accountsConfigured()) return accountError(request, 'Accounts are not available yet.', 503);
  const who = await currentUser(request.headers);
  if (!who) return accountError(request, 'Not signed in', 401);
  const s = schema.session;
  const rows = await getDb()
    .select({ id: s.id, createdAt: s.createdAt, expiresAt: s.expiresAt, userAgent: s.userAgent })
    .from(s)
    .where(and(eq(s.userId, who.user.id), gt(s.expiresAt, new Date())));
  return accountJson(request, {
    sessions: rows.map((r) => ({
      id: r.id,
      kind: r.userAgent?.startsWith(EXTENSION_SESSION_AGENT) ? 'extension' : 'web',
      device: r.userAgent?.startsWith(EXTENSION_SESSION_AGENT) ? null : deviceOf(r.userAgent),
      createdAt: r.createdAt.toISOString(),
      expiresAt: r.expiresAt.toISOString(),
      current: r.id === who.session.id,
    })),
  });
}

/** DELETE ?id=…: revoke one of your own sessions (signs that browser or extension out). Website only. */
export async function DELETE(request: Request) {
  if (!accountsConfigured()) return accountError(request, 'Accounts are not available yet.', 503);
  if (!isSameOrigin(request)) return accountError(request, 'Forbidden', 403);
  const who = await currentUser(request.headers);
  if (!who) return accountError(request, 'Not signed in', 401);
  const id = new URL(request.url).searchParams.get('id') ?? '';
  const s = schema.session;
  // The user id is part of the WHERE: a session id from someone else's account deletes nothing.
  const gone = await getDb()
    .delete(s)
    .where(and(eq(s.id, id), eq(s.userId, who.user.id)))
    .returning({ id: s.id });
  return gone.length ? accountJson(request, { ok: true }) : accountError(request, 'No such session', 404);
}
