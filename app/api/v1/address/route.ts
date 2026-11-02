import { errorJson, handle, json, options } from '@/lib/server/api';
import { lookupAddress } from '@/lib/server/lookup';
import { checkAddressQuery } from '@/lib/validate-query';

/** GET /api/v1/address?chain=ethereum&q=0x… — native balance, tokens, activity for one chain. */
export function GET(request: Request) {
  return handle(request, async (p) => {
    const check = checkAddressQuery(p.get('chain') ?? '', p.get('q') ?? '');
    if (!check.ok) return errorJson(check.error, 400);
    return json(await lookupAddress(p.get('chain')!, check.query), { maxAge: 30 });
  });
}

export const OPTIONS = options;
