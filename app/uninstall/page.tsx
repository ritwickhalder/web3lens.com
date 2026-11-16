import { PageShell } from '@/components/content/PageShell';
import { UninstallSurvey } from '@/components/uninstall/UninstallSurvey';
import { pageMetadata } from '@/lib/metadata';
import { normalizeBrowser, normalizeVersion } from '@/lib/uninstall';

export const metadata = pageMetadata({
  title: 'Sorry to see you go',
  description: 'One quick, anonymous question about why you removed the Web3Lens extension.',
  path: '/uninstall',
  noindex: true,
  nofollow: true,
});

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * Opened by the browser when the extension is removed (runtime.setUninstallURL in extension-src/src/lifecycle.ts).
 * The query carries anonymous labels only (`v` version, `b` browser); they are user-editable, so they are normalised
 * here and again by the API.
 */
export default async function UninstallPage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <PageShell
      layout="stacked"
      eyebrow="Extension removed"
      title="Sorry to see you go."
      lead="One quick question helps us make Web3Lens better. It takes about 15 seconds and is completely anonymous."
    >
      <UninstallSurvey version={normalizeVersion(first(params.v))} browser={normalizeBrowser(first(params.b))} />
    </PageShell>
  );
}
