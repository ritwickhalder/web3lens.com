import { timingSafeEqual } from 'node:crypto';
import { runLifecycleEmails } from '@/lib/server/lifecycle-mail';

export const maxDuration = 300;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET ?? '';
  const got = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  return !!secret && got.length === expected.length && timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

/**
 * Vercel Cron (vercel.json, daily): the abandoned-checkout reminder, the trial-ended email and the upgrade nudge
 * (lib/server/lifecycle-mail.ts). Does nothing until Pro is on sale and SMTP is set. Vercel sends
 * `Authorization: Bearer $CRON_SECRET`; anything else is 401. `?dryRun=1` lists who would be emailed.
 */
export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await runLifecycleEmails({ dryRun: new URL(request.url).searchParams.get('dryRun') === '1' });
    return Response.json({ ok: true, ...result }, { headers: { 'cache-control': 'no-store' } });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error('[cron/emails] run failed', error);
    return Response.json({ ok: false, error }, { status: 500, headers: { 'cache-control': 'no-store' } });
  }
}
