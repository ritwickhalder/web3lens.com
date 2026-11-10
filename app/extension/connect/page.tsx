import { PageShell } from '@/components/content/PageShell';
import { ConnectPanel } from '@/components/account/ConnectPanel';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Connect the extension',
  description: 'Approve a sign-in started in the Web3Lens browser extension.',
  path: '/extension/connect',
  noindex: true,
  nofollow: true,
});

export default async function ConnectPage({ searchParams }: { searchParams: Promise<{ code?: string | string[] }> }) {
  const raw = (await searchParams).code;
  const code = (Array.isArray(raw) ? raw[0] : raw ?? '').trim().toUpperCase().slice(0, 9);
  return (
    <PageShell eyebrow="Extension" title="Sign in the extension" lead="Link the Web3Lens extension in this browser to your account.">
      <ConnectPanel code={code} />
    </PageShell>
  );
}
