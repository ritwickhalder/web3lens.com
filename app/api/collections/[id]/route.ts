import { accountError, accountJson, accountOptions, isExtensionOrigin, isSameOrigin, readJson } from '@/lib/server/account-http';
import { requireFeature, requireUser } from '@/lib/server/gate';
import { CAPS, cleanName, deleteCollection, updateCollection } from '@/lib/server/pro-stores';

const keys = (v: unknown) => (Array.isArray(v) ? v.filter((k): k is string => typeof k === 'string' && k.length > 0 && k.length <= 300).slice(0, 500) : undefined);

/** PATCH /api/collections/:id { name?, add?: keys[], remove?: keys[] } (Pro). Someone else's id is a 404. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request) && !isExtensionOrigin(request.headers.get('origin'))) return accountError(request, 'Forbidden', 403);
  const c = await requireFeature(request, 'cloudSync');
  if (c instanceof Response) return c;
  const body = await readJson<{ name?: unknown; add?: unknown; remove?: unknown }>(request, 64_000);
  if (!body) return accountError(request, 'Bad request', 400);
  const name = body.name === undefined ? undefined : cleanName(body.name, 60);
  if (name === '') return accountError(request, 'Give the collection a name.', 400);
  const r = await updateCollection(c.user.id, (await params).id, { name, add: keys(body.add), remove: keys(body.remove) });
  if (r === false) return accountError(request, 'No such collection.', 404);
  if (r === 'exists') return accountError(request, 'You already have a collection with that name.', 409);
  if (r === 'full') return accountError(request, `A collection holds up to ${CAPS.collectionItems} items.`, 409);
  return accountJson(request, { ok: true });
}

/** DELETE /api/collections/:id: removes the collection, never the saved items in it. Allowed on any plan. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request) && !isExtensionOrigin(request.headers.get('origin'))) return accountError(request, 'Forbidden', 403);
  const c = await requireUser(request);
  if (c instanceof Response) return c;
  return (await deleteCollection(c.user.id, (await params).id)) ? accountJson(request, { ok: true }) : accountError(request, 'No such collection.', 404);
}

export const OPTIONS = accountOptions;
