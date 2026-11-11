import { accountError, accountJson, accountOptions, isExtensionOrigin, isSameOrigin, readJson } from '@/lib/server/account-http';
import { requireUser } from '@/lib/server/gate';
import { listAlerts, markAlertsRead } from '@/lib/server/watch-store';

/** GET /api/alerts: your latest alerts and the unread count. */
export async function GET(request: Request) {
  const c = await requireUser(request);
  if (c instanceof Response) return c;
  return accountJson(request, await listAlerts(c.user.id));
}

/** POST /api/alerts { read: ["id", …] | "all" }: mark as read. */
export async function POST(request: Request) {
  if (!isSameOrigin(request) && !isExtensionOrigin(request.headers.get('origin'))) return accountError(request, 'Forbidden', 403);
  const c = await requireUser(request);
  if (c instanceof Response) return c;
  const body = await readJson<{ read?: unknown }>(request, 64_000);
  const read = body?.read === 'all' ? 'all' : Array.isArray(body?.read) ? body.read.filter((x): x is string => typeof x === 'string').slice(0, 500) : null;
  if (!read) return accountError(request, 'Bad request', 400);
  return accountJson(request, { marked: await markAlertsRead(c.user.id, read) });
}

export const OPTIONS = accountOptions;
