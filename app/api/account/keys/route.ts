import { accountError, accountJson, isSameOrigin, readJson } from '@/lib/server/account-http';
import { requireFeature, requireUser } from '@/lib/server/gate';
import { limited } from '@/lib/server/limiters';
import { CAPS, cleanName, createApiKey, listApiKeys, revokeApiKey } from '@/lib/server/pro-stores';

/** GET: your active API keys (prefix and dates only; the secret is never shown again). */
export async function GET(request: Request) {
  const c = await requireUser(request);
  if (c instanceof Response) return c;
  return accountJson(request, { keys: await listApiKeys(c.user.id), cap: CAPS.apiKeys });
}

/** POST { name }: create a key (Pro, up to 5 active). The full key is in this response only. Website only. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return accountError(request, 'Forbidden', 403);
  const wait = limited('accountWrite', request.headers);
  if (wait) return accountError(request, 'Too many requests.', 429, { 'retry-after': String(wait) });
  const c = await requireFeature(request, 'apiKeys');
  if (c instanceof Response) return c;
  const name = cleanName((await readJson<{ name?: unknown }>(request))?.name, 40);
  const r = await createApiKey(c.user.id, name);
  if (!r) return accountError(request, `You can have up to ${CAPS.apiKeys} active keys. Revoke one first.`, 409);
  return accountJson(request, r, 201);
}

/** DELETE ?id=…: revoke one of your keys at once (any plan). Website only. */
export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return accountError(request, 'Forbidden', 403);
  const c = await requireUser(request);
  if (c instanceof Response) return c;
  const id = new URL(request.url).searchParams.get('id') ?? '';
  return (await revokeApiKey(c.user.id, id)) ? accountJson(request, { ok: true }) : accountError(request, 'No such key.', 404);
}
