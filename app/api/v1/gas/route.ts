import { handle, json, options } from '@/lib/server/api';
import { gasOverview } from '@/lib/server/lookup';

/** GET /api/v1/gas — gas prices on the supported EVM chains and Bitcoin fee estimates. */
export function GET(request: Request) {
  return handle(request, async () => json(await gasOverview(), { maxAge: 15 }));
}

export const OPTIONS = options;
