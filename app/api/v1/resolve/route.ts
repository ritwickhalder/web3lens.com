import { errorJson, handle, json, options } from '@/lib/server/api';
import { resolveName } from '@/lib/server/lookup';

/** GET /api/v1/resolve?q=name.eth — ENS name → address (on-chain resolvers only). */
export function GET(request: Request) {
  return handle(request, async (p) => {
    const q = (p.get('q') ?? '').trim().toLowerCase();
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*\.eth$/.test(q) || q.length > 200) return errorJson('Enter an ENS name ending in .eth.', 400);
    return json({ name: q, address: await resolveName(q) }, { maxAge: 300 });
  });
}

export const OPTIONS = options;
