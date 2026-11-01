import { Intro, PageShell } from '@/components/content/PageShell';
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
    <PageShell title="CONTACT US">
      <Intro>
        Connect with us over our{' '}
        <a href={SITE.facebook} target="_blank" rel="noopener noreferrer" className="font-bold">
          facebook page
        </a>{' '}
        or use the form below to send us a message.
      </Intro>
      <ContactForm />
    </PageShell>
  );
}
