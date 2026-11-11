import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { AdminPanel } from '@/components/account/AdminPanel';
import { PageShell } from '@/components/content/PageShell';
import { pageMetadata } from '@/lib/metadata';
import { adminCaller } from '@/lib/server/admin';

export const metadata = pageMetadata({ title: 'Admin', path: '/admin', noindex: true, nofollow: true });
export const dynamic = 'force-dynamic';

/** Admins only (ADMIN_EMAILS); everyone else gets the normal 404. */
export default async function AdminPage() {
  if (!(await adminCaller(await headers()).catch(() => null))) notFound();
  return (
    <PageShell layout="stacked" eyebrow="Admin" title="Users and plans">
      <AdminPanel />
    </PageShell>
  );
}
