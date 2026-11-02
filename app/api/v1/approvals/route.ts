import { errorJson, handle, json, options } from '@/lib/server/api';
import { approvalsReport } from '@/lib/server/security';
import { checkAddressQuery } from '@/lib/validate-query';

/** GET /api/v1/approvals?chain=ethereum&q=0x… — ERC-20/721 approvals with live allowances. */
export function GET(request: Request) {
  return handle(request, async (p) => {
    const check = checkAddressQuery(p.get('chain') ?? '', p.get('q') ?? '');
    if (!check.ok) return errorJson(check.error, 400);
    if (check.detection.format !== 'evm-address') return errorJson('Approvals apply to EVM addresses.', 400);
    return json(await approvalsReport(p.get('chain')!, check.query), { maxAge: 120 });
  });
}

export const OPTIONS = options;
export const maxDuration = 60;
