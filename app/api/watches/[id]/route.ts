import { accountError, accountJson, accountOptions, isExtensionOrigin, isSameOrigin, readJson } from '@/lib/server/account-http';
import { requireUser } from '@/lib/server/gate';
import { cleanName } from '@/lib/server/pro-stores';
import { deleteWatch, updateWatch } from '@/lib/server/watch-store';

type Ctx = { params: Promise<{ id: string }> };
const allowed = (r: Request) => isSameOrigin(r) || isExtensionOrigin(r.headers.get('origin'));

/** PATCH { label?, notifyEmail? }: any plan (turning email off must always work). */
export async function PATCH(request: Request, { params }: Ctx) {
  if (!allowed(request)) return accountError(request, 'Forbidden', 403);
  const c = await requireUser(request);
  if (c instanceof Response) return c;
  const body = await readJson<{ label?: unknown; notifyEmail?: unknown }>(request);
  if (!body) return accountError(request, 'Bad request', 400);
  const ok = await updateWatch(c.user.id, (await params).id, {
    label: body.label === undefined ? undefined : cleanName(body.label, 80),
    notifyEmail: typeof body.notifyEmail === 'boolean' ? body.notifyEmail : undefined,
  });
  return ok ? accountJson(request, { ok: true }) : accountError(request, 'No such watch.', 404);
}

/** DELETE: stop watching (any plan). */
export async function DELETE(request: Request, { params }: Ctx) {
  if (!allowed(request)) return accountError(request, 'Forbidden', 403);
  const c = await requireUser(request);
  if (c instanceof Response) return c;
  return (await deleteWatch(c.user.id, (await params).id)) ? accountJson(request, { ok: true }) : accountError(request, 'No such watch.', 404);
}

export const OPTIONS = accountOptions;
