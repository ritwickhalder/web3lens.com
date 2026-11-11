import { adminCaller, findUser } from '@/lib/server/admin';

const notFound = () => Response.json({ error: 'Not found' }, { status: 404 });

/** GET /api/admin/users?email=…: one user's plan, subscriptions, usage, sessions and audit trail. Admins only. */
export async function GET(request: Request) {
  if (!(await adminCaller(request.headers))) return notFound();
  const email = new URL(request.url).searchParams.get('email') ?? '';
  if (!email.includes('@') || email.length > 200) return Response.json({ error: 'Enter an email.' }, { status: 400 });
  const found = await findUser(email);
  return found ? Response.json(found, { headers: { 'cache-control': 'no-store' } }) : Response.json({ error: 'No user with that email.' }, { status: 404 });
}
