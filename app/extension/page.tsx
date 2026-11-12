import { RelatedGuides } from '@/components/blog/RelatedGuides';
import { ArrowUpRight, CursorClick, Keyboard, Lock, MagnifyingGlass, PuzzlePiece, Scan, ShieldCheck, Wrench } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { PageArt } from '@/components/content/PageArt';
import { InfoSection, PageShell } from '@/components/content/PageShell';
import { AddToBrowserButton, OtherStoreLinks } from '@/components/extension/AddToBrowser';
import { JsonLd } from '@/components/seo/JsonLd';
import { EXTENSION_STORES } from '@/config/site';
import { pageMetadata } from '@/lib/metadata';
import { browserExtension } from '@/lib/structured-data';

export const metadata = pageMetadata({
  title: 'Blockchain explorer extension for Chrome, Firefox, Edge',
  description: 'Web3Lens for Chrome, Firefox and Edge: right-click any address, type w3 in the address bar, decode transactions and check risk flags without leaving the page.',
  path: '/extension',
});

const REPO = 'https://github.com/ritwickhalder/web3lens.com/tree/main';

const FEATURES = [
  { icon: MagnifyingGlass, title: 'Search from the toolbar', body: 'Paste anything; it is detected, checksum-verified and sent to the right explorer page, or shown with balances and risk checks.' },
  { icon: CursorClick, title: 'Right-click any address', body: 'Select an address or hash on any page and choose “Look up on Web3Lens” or “Open in its block explorer”.' },
  { icon: Keyboard, title: 'Type w3 in the address bar', body: 'w3, space, then the address. Suggestions show what was detected and on which chains.' },
  { icon: Scan, title: 'Find addresses on a page', body: 'Open the popup’s Scan page tab to list every address and hash on the current page. The page is only read when you open that tab.' },
  { icon: ShieldCheck, title: 'Risk checks', body: 'OFAC snapshot works offline; reported scams, contract checks and token approvals when online lookups are on.' },
  { icon: Wrench, title: 'All the developer tools', body: 'Unit converter, validator, hex and hashes, timestamps, gas, calldata and raw-transaction decoders, batch search, saved labels.' },
];

const BROWSERS = [
  { id: 'chrome', name: 'Chrome', dir: 'extension-chrome', steps: ['chrome://extensions', 'turn on Developer mode', 'Load unpacked', 'choose the folder'] },
  { id: 'edge', name: 'Microsoft Edge', dir: 'extension-edge', steps: ['edge://extensions', 'turn on Developer mode', 'Load unpacked', 'choose the folder'] },
  { id: 'firefox', name: 'Firefox', dir: 'extension-firefox', steps: ['about:debugging', 'This Firefox', 'Load Temporary Add-on', 'choose manifest.json in the folder'] },
];

const storeUrl = (id: string) => EXTENSION_STORES.find((s) => s.id === id)?.url ?? null;

export default function ExtensionPage() {
  return (
    <PageShell
      breadcrumbs={[{ name: 'Browser extension', path: '/extension' }]}
      eyebrow="Browser extension"
      title={
        <>
          Web3Lens, <span className="text-accent">everywhere you browse.</span>
        </>
      }
      lead="The same search, detection, risk checks and developer tools as the website, for Chrome, Firefox and Microsoft Edge."
      art={<PageArt scene="extension" />}
      aside={
        <div className="rounded-xl border border-line bg-ink-2 p-4">
          <p className="flex items-center gap-3 text-sm font-semibold text-muted">
            <PuzzlePiece aria-hidden weight="duotone" className="size-8 shrink-0 text-accent" />
            Free on the Chrome Web Store, Firefox Add-ons and Microsoft Edge Add-ons.
          </p>
          <AddToBrowserButton className="mt-4" />
          <OtherStoreLinks className="mt-3" />
        </div>
      }
    >
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
        {FEATURES.map((f) => (
          <li key={f.title} className="flex gap-4 rounded-xl border border-line bg-ink-2 p-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
              <f.icon aria-hidden weight="duotone" className="size-6" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold">{f.title}</h2>
              <p className="mt-0.5 text-sm font-medium leading-relaxed text-muted">{f.body}</p>
            </div>
          </li>
        ))}
      </ul>
      <JsonLd data={browserExtension()} />

      <section id="install" aria-labelledby="install-heading" className="mt-8 scroll-mt-24">
        <h2 id="install-heading" className="label mb-3">
          Install
        </h2>
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {BROWSERS.map((b) => {
            const url = storeUrl(b.id);
            return (
              <li key={b.id} id={`install-${b.id}`} className="flex scroll-mt-24 flex-col rounded-xl border border-line bg-ink-2 p-4">
                <h3 className="text-base font-extrabold text-fg">{b.name}</h3>
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-md border border-accent/60 px-3 py-2 text-sm font-extrabold text-accent transition-colors hover:bg-accent/10"
                  >
                    Install from the {b.name} store <ArrowUpRight aria-hidden weight="bold" className="size-3.5" />
                  </a>
                )}
                <p className="mt-3 text-[13px] font-semibold text-muted">
                  {url ? 'Or run it from source: download the' : 'Download the'}{' '}
                  <a href={`${REPO}/${b.dir}`} target="_blank" rel="noopener noreferrer" className="font-bold text-accent hover:underline">
                    {b.dir}
                  </a>{' '}
                  folder, then
                </p>
                <ol className="mt-2 space-y-1">
                  {b.steps.map((step, i) => (
                    <li key={step} className="flex items-baseline gap-2 text-[13px] font-semibold text-fg/85">
                      <span className="text-[11px] font-extrabold tabular-nums text-faint">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="mt-8 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <InfoSection heading="Permissions, and why">
          <ul className="list-disc space-y-1.5 pl-5 marker:text-accent">
            <li>
              <strong className="text-fg">storage</strong>: your settings, saved labels and recent searches, kept on your device.
            </li>
            <li>
              <strong className="text-fg">contextMenus</strong>: the right-click “Look up” entries. The extension only sees the text you selected, when you click.
            </li>
            <li>
              <strong className="text-fg">activeTab + scripting</strong>: the popup’s “Scan page” tab, and only for the tab you're on when you open it.
            </li>
            <li>No host permissions, no content scripts, no access to your browsing history, no wallet connection, and no account needed (signing in is optional).</li>
          </ul>
        </InfoSection>
        <InfoSection heading="Privacy">
          <p className="flex gap-3">
            <Lock aria-hidden weight="duotone" className="mt-1 size-6 shrink-0 text-accent" />
            <span>
              Detection, checksums, explorer links, the developer tools and the OFAC snapshot run entirely in your browser. When you ask for balances, transactions or risk
              checks, the address or hash is sent to web3lens.com, which queries public blockchain data sources (see the <Link href="/privacy-policy">privacy policy</Link>).
              You can turn online lookups off in the extension's settings. The extension contains no remote code, analytics or ads.
            </span>
          </p>
        </InfoSection>
      </div>
      <RelatedGuides page={'/extension'} className="mt-8" />
    </PageShell>
  );
}
