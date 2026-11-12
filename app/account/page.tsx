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
    <main className="wrap pt-6 sm:pt-10">
      <AccountPanel />
    </main>
  );
}
