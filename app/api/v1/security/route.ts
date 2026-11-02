import { errorJson, handle, json, options } from '@/lib/server/api';
import { securityReport } from '@/lib/server/security';
import { checkAddressQuery } from '@/lib/validate-query';

/** GET /api/v1/security?chain=ethereum&q=0x… — sanctions, reputation, reports and contract checks. */
export function GET(request: Request) {
  return handle(request, async (p) => {
    const check = checkAddressQuery(p.get('chain') ?? '', p.get('q') ?? '');
    if (!check.ok) return errorJson(check.error, 400);
    if (check.detection.kind !== 'address') return errorJson('Resolve the name to an address first.', 400);
    return json(await securityReport(p.get('chain')!, check.query), { maxAge: 300 });
  });
}

export const OPTIONS = options;
