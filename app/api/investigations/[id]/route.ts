import { sanitizeInvestigation } from '@/lib/investigation';
import { accountError, accountJson, accountOptions, isExtensionOrigin, isSameOrigin, readJson } from '@/lib/server/account-http';
import { requireFeature, requireUser } from '@/lib/server/gate';
import { deleteInvestigation, getInvestigation, updateInvestigation } from '@/lib/server/pro-stores';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const c = await requireUser(request);
  if (c instanceof Response) return c;
  const inv = await getInvestigation(c.user.id, (await params).id);
  return inv ? accountJson(request, inv) : accountError(request, 'No such investigation.', 404);
}

/** PUT { investigation }: replace (Pro). */
export async function PUT(request: Request, { params }: Ctx) {
  if (!isSameOrigin(request) && !isExtensionOrigin(request.headers.get('origin'))) return accountError(request, 'Forbidden', 403);
  const c = await requireFeature(request, 'investigations');
  if (c instanceof Response) return c;
  const inv = sanitizeInvestigation((await readJson<{ investigation?: unknown }>(request, 128_000))?.investigation);
  if (!inv) return accountError(request, 'Nothing to save.', 400);
  return (await updateInvestigation(c.user.id, (await params).id, inv)) ? accountJson(request, { ok: true }) : accountError(request, 'No such investigation.', 404);
}

/** DELETE: allowed on any plan (your data). */
export async function DELETE(request: Request, { params }: Ctx) {
  if (!isSameOrigin(request) && !isExtensionOrigin(request.headers.get('origin'))) return accountError(request, 'Forbidden', 403);
  const c = await requireUser(request);
  if (c instanceof Response) return c;
  return (await deleteInvestigation(c.user.id, (await params).id)) ? accountJson(request, { ok: true }) : accountError(request, 'No such investigation.', 404);
}

export const OPTIONS = accountOptions;
