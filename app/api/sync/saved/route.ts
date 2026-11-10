import { accountError, accountJson, accountOptions, isExtensionOrigin, isSameOrigin, readJson } from '@/lib/server/account-http';
import { requireFeature, requireUser } from '@/lib/server/gate';
import { pullSaved, pushSaved } from '@/lib/server/pro-stores';
import { sanitizeCloud, SYNC_BATCH } from '@/lib/saved-sync';

/**
 * GET /api/sync/saved?since=<cursor>: the signed-in user's synced saved items changed since the cursor (all when
 * absent), deletions included. Any signed-in user may read, so a downgrade never locks anyone out of their cloud copy.
 */
export async function GET(request: Request) {
  const c = await requireUser(request);
  if (c instanceof Response) return c;
  const raw = new URL(request.url).searchParams.get('since');
  const since = raw && Number.isFinite(Date.parse(raw)) ? new Date(raw) : null;
  return accountJson(request, await pullSaved(c.user.id, since));
}

/** POST /api/sync/saved { items }: push local changes (Pro). Newest change per item wins; new items stop at 2,000. */
export async function POST(request: Request) {
  if (!isSameOrigin(request) && !isExtensionOrigin(request.headers.get('origin'))) return accountError(request, 'Forbidden', 403);
  const c = await requireFeature(request, 'cloudSync');
  if (c instanceof Response) return c;
  const body = await readJson<{ items?: unknown }>(request, 1_000_000);
  if (!Array.isArray(body?.items) || body.items.length > SYNC_BATCH) return accountError(request, `Send up to ${SYNC_BATCH} items.`, 400);
  const items = sanitizeCloud(body.items);
  const result = await pushSaved(c.user.id, items, c.limits.savedCloud);
  return accountJson(request, { ...result, rejected: body.items.length - items.length });
}

export const OPTIONS = accountOptions;
