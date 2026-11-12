import { Bug, Globe, LinkBreak, Lightbulb } from '@phosphor-icons/react/dist/ssr';
import { ContactForm } from '@/components/contact/ContactForm';
import { PageArt } from '@/components/content/PageArt';
import { PageShell } from '@/components/content/PageShell';
import { SITE } from '@/config/site';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Contact Web3Lens: Feedback and Questions',
  description: `Send feedback, suggestions, chain or explorer requests and questions to ${SITE.domain}.`,
  path: '/contact',
});

/** What a useful message includes, by topic. */
const TOPICS = [
  { icon: Globe, title: 'A chain we are missing', body: 'Send its name, ticker and a working block explorer URL.' },
  { icon: LinkBreak, title: 'A broken explorer link', body: 'Include the address or hash you searched and the page it opened.' },
  { icon: Bug, title: 'Something not working', body: 'Say which page or extension, your browser, and what you expected.' },
  { icon: Lightbulb, title: 'A feature idea', body: 'Tell us the task you are trying to get done; that helps more than the feature.' },
];

export default function ContactPage() {
  return (
    <PageShell
      eyebrow="Contact"
      title="Say hello."
      lead={
        <>
          Feedback, a chain we're missing, a broken explorer link or a feature idea? Use the form, or reach us on our{' '}
          <a href={SITE.facebook} target="_blank" rel="noopener noreferrer" className="text-accent underline-offset-4 hover:underline">
            Facebook page
          </a>
          .
        </>
      }
      art={<PageArt scene="contact" />}
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] 2xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <ContactForm />
        <aside aria-labelledby="contact-tips" className="rounded-xl border border-line bg-ink-2 p-5">
          <h2 id="contact-tips" className="label">
            What helps us help you
          </h2>
          <ul className="mt-3 divide-y divide-line">
            {TOPICS.map((t) => (
              <li key={t.title} className="flex gap-3 py-3.5 first:pt-1 last:pb-0">
                <t.icon aria-hidden weight="duotone" className="size-6 shrink-0 text-accent" />
                <div>
                  <p className="text-sm font-extrabold text-fg">{t.title}</p>
                  <p className="mt-0.5 text-[13px] font-medium leading-snug text-muted">{t.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </PageShell>
  );
}
