import { PageShell } from '@/components/content/PageShell';
import { SettingsForm } from '@/components/usability/SettingsForm';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Settings',
  description: 'Choose what Search does, your preferred block explorer for each chain, and manage data stored in this browser.',
  path: '/settings',
  noindex: true,
});

export default function SettingsPage() {
  return (
    <PageShell layout="stacked" eyebrow="Settings" title="Search your way" lead="Preferences are stored in this browser.">
      <SettingsForm />
    </PageShell>
  );
}
