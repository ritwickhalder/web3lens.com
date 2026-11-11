import { timingSafeEqual } from 'node:crypto';
import { sendDigests } from '@/lib/server/alert-mail';
import { accountsConfigured } from '@/lib/server/env';
import { pruneAlerts, runDueChecks } from '@/lib/server/watch-store';

export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET ?? '';
  const got = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  return !!secret && got.length === expected.length && timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

/**
 * Vercel Cron (vercel.json): checks due watches, emails digests and prunes alerts older than 90 days. Vercel sends
 * `Authorization: Bearer $CRON_SECRET`; anything else is 401.
 */
export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!accountsConfigured()) return Response.json({ skipped: 'accounts not configured' });
  const checks = await runDueChecks();
  const mail = await sendDigests();
  const pruned = await pruneAlerts();
  return Response.json({ ok: true, checks, mail, pruned }, { headers: { 'cache-control': 'no-store' } });
}
