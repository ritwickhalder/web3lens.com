import { NextRequest, NextResponse } from 'next/server';
import { createRateLimiter } from '@/lib/contact';
import { clientIp } from '@/lib/server/rate-limit';
import { saveUninstallFeedback } from '@/lib/server/uninstall-store';
import { parseUninstallFeedback } from '@/lib/uninstall';

export const dynamic = 'force-dynamic';

/** A person answers once; a few retries are fine, a flood is not. In memory, so per server instance. */
const isLimited = createRateLimiter(5, 24 * 60 * 60 * 1000);

const SORRY = 'We could not save that right now. Please try again later.';

/** Stores one anonymous uninstall survey answer (see lib/uninstall.ts). Same-origin only: no CORS headers. */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const parsed = parseUninstallFeedback(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  if (isLimited(`ip:${clientIp(request.headers)}`)) return NextResponse.json({ error: SORRY }, { status: 429 });

  const result = await saveUninstallFeedback(parsed.value);
  if (result === 'saved' || result === 'emailed') return NextResponse.json({ success: true });
  return NextResponse.json({ error: SORRY }, { status: result === 'unavailable' ? 503 : 500 });
}
