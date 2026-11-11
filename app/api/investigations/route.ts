import { sanitizeInvestigation } from '@/lib/investigation';
import { accountError, accountJson, accountOptions, isExtensionOrigin, isSameOrigin, readJson } from '@/lib/server/account-http';
import { requireFeature, requireUser } from '@/lib/server/gate';
import { CAPS, createInvestigation, listInvestigations } from '@/lib/server/pro-stores';

/** GET /api/investigations: your saved investigations (titles and counts; readable after a downgrade). */
export async function GET(request: Request) {
  const c = await requireUser(request);
  if (c instanceof Response) return c;
  return accountJson(request, { investigations: await listInvestigations(c.user.id), cap: CAPS.investigations });
}

/** POST /api/investigations { investigation }: save one to the account (Pro, up to 100). */
export async function POST(request: Request) {
  if (!isSameOrigin(request) && !isExtensionOrigin(request.headers.get('origin'))) return accountError(request, 'Forbidden', 403);
  const c = await requireFeature(request, 'investigations');
  if (c instanceof Response) return c;
  const inv = sanitizeInvestigation((await readJson<{ investigation?: unknown }>(request, 128_000))?.investigation);
  if (!inv) return accountError(request, 'Nothing to save.', 400);
  const r = await createInvestigation(c.user.id, inv);
  if (!r) return accountError(request, `You can keep up to ${CAPS.investigations} investigations. Delete one first.`, 409);
  return accountJson(request, r, 201);
}

export const OPTIONS = accountOptions;
