import { PageShell } from '@/components/content/PageShell';
import { ContactForm } from '@/components/contact/ContactForm';
import { SITE } from '@/config/site';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Contact Us',
  description: `Send feedback, suggestions or questions to ${SITE.domain}.`,
  path: '/contact',
});

export default function ContactPage() {
  return (
    <PageShell
      eyebrow="Contact"
      title="Say hello."
      lead={
        <>
          Feedback, a chain we're missing, a broken explorer link or a feature idea? Use the form below, or reach us on
          our{' '}
          <a href={SITE.facebook} target="_blank" rel="noopener noreferrer" className="text-accent underline-offset-4 hover:underline">
            Facebook page
          </a>
          .
        </>
      }
    >
      <ContactForm />
    </PageShell>
  );
}
