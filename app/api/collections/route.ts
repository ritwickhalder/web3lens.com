import { accountError, accountJson, accountOptions, isExtensionOrigin, isSameOrigin, readJson } from '@/lib/server/account-http';
import { requireFeature, requireUser } from '@/lib/server/gate';
import { CAPS, cleanName, createCollection, listCollections } from '@/lib/server/pro-stores';

/** GET /api/collections: your collections with their item keys (readable after a downgrade). */
export async function GET(request: Request) {
  const c = await requireUser(request);
  if (c instanceof Response) return c;
  return accountJson(request, { collections: await listCollections(c.user.id), cap: CAPS.collections });
}

/** POST /api/collections { name }: create one (Pro, up to 20). */
export async function POST(request: Request) {
  if (!isSameOrigin(request) && !isExtensionOrigin(request.headers.get('origin'))) return accountError(request, 'Forbidden', 403);
  const c = await requireFeature(request, 'cloudSync');
  if (c instanceof Response) return c;
  const name = cleanName((await readJson<{ name?: unknown }>(request))?.name, 60);
  if (!name) return accountError(request, 'Give the collection a name.', 400);
  const r = await createCollection(c.user.id, name);
  if (r === 'exists') return accountError(request, 'You already have a collection with that name.', 409);
  if (!r) return accountError(request, `You can have up to ${CAPS.collections} collections.`, 409);
  return accountJson(request, r, 201);
}

export const OPTIONS = accountOptions;
