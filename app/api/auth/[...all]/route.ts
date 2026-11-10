import { toNextJsHandler } from 'better-auth/next-js';
import { getAuth } from '@/lib/server/auth';

/** Better Auth (Google sign-in, sessions, sign-out). 503 until accounts are configured (lib/server/env.ts). */
const notConfigured = () => Response.json({ error: 'Accounts are not available yet.' }, { status: 503, headers: { 'cache-control': 'no-store' } });

export async function GET(request: Request) {
  const auth = getAuth();
  return auth ? toNextJsHandler(auth).GET(request) : notConfigured();
}

export async function POST(request: Request) {
  const auth = getAuth();
  return auth ? toNextJsHandler(auth).POST(request) : notConfigured();
}
