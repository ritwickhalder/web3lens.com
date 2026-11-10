import { PageShell } from '@/components/content/PageShell';
import { AccountPanel } from '@/components/account/AccountPanel';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Account',
  description: 'Your Web3Lens plan, usage, billing and signed-in devices. An account is optional.',
  path: '/account',
  noindex: true,
});

export default function AccountPage() {
  return (
    <PageShell
      eyebrow="Account"
      title="Your Web3Lens"
      lead="Optional. Search, explorers, developer tools and safety checks stay free and work without signing in."
    >
      <AccountPanel />
    </PageShell>
  );
}
