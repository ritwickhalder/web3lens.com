import { lookupSelector } from '@/lib/providers/selectors';
import { errorJson, handle, json, options } from '@/lib/server/api';
import { cached } from '@/lib/server/cache';

/** GET /api/v1/selector?q=0xa9059cbb — candidate function signatures from community databases. */
export function GET(request: Request) {
  return handle(request, async (p) => {
    const q = (p.get('q') ?? '').trim().toLowerCase();
    if (!/^0x[0-9a-f]{8}$/.test(q)) return errorJson('Enter a 4-byte selector like 0xa9059cbb.', 400);
    try {
      const r = await cached(`sel:${q}`, 24 * 3600_000, 7 * 24 * 3600_000, () => lookupSelector(q));
      return json({ selector: q, ...r.value, fetchedAt: new Date(r.fetchedAt).toISOString(), stale: r.stale }, { maxAge: 86400 });
    } catch {
      return errorJson('The signature databases did not respond. Try again later.', 502);
    }
  });
}

export const OPTIONS = options;
