import { isSameOrigin, readJson } from '@/lib/server/account-http';
import { adminCaller, applyAdminAction, type AdminAction } from '@/lib/server/admin';

/** POST /api/admin/users/:id { action, plan?, until? }: override, clearOverride, suspend, unsuspend, revokeSessions. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await adminCaller(request.headers);
  if (!admin) return Response.json({ error: 'Not found' }, { status: 404 });
  if (!isSameOrigin(request)) return Response.json({ error: 'Forbidden' }, { status: 403 });
  const body = await readJson<{ action?: unknown; plan?: unknown; until?: unknown }>(request);
  let a: AdminAction | null = null;
  if (body?.action === 'override' && (body.plan === 'free' || body.plan === 'pro' || body.plan === 'lifetime')) {
    const until = typeof body.until === 'string' && body.until ? new Date(body.until) : null;
    if (until && !Number.isFinite(until.getTime())) return Response.json({ error: 'Bad date' }, { status: 400 });
    a = { action: 'override', plan: body.plan, until };
  } else if (body?.action === 'clearOverride' || body?.action === 'suspend' || body?.action === 'unsuspend' || body?.action === 'revokeSessions') {
    a = { action: body.action };
  }
  if (!a) return Response.json({ error: 'Unknown action' }, { status: 400 });
  const { id } = await params;
  if (id === admin.id && a.action === 'suspend') return Response.json({ error: "You can't suspend yourself." }, { status: 400 });
  return (await applyAdminAction(admin.id, id, a)) ? Response.json({ ok: true }) : Response.json({ error: 'No such user.' }, { status: 404 });
}
