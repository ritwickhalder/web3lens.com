import { ContactChannels } from '@/components/contact/ContactChannels';
import { ContactForm } from '@/components/contact/ContactForm';
import { ContactIllustration } from '@/components/contact/ContactIllustration';
import { SITE } from '@/config/site';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Contact Web3Lens: Feedback and Questions',
  description: `Send feedback, suggestions, chain or explorer requests and questions to ${SITE.domain}.`,
  path: '/contact',
});

/** Laid out to fit one screen on desktop: copy, illustration and channels left, form right. */
export default function ContactPage() {
  return (
    <main className="wrap grid grid-cols-1 gap-8 py-6 lg:grid-cols-12 lg:gap-12 lg:py-8">
      <section className="flex min-w-0 flex-col gap-4 lg:col-span-5">
        <header>
          <p className="label">Contact</p>
          <h1 className="heading mt-2 text-4xl sm:text-5xl">Say hello.</h1>
          <p className="mt-3 max-w-xl text-base font-medium leading-relaxed text-muted sm:text-lg">
            Feedback, a chain we're missing, a broken explorer link or a feature idea? Send us a message and we'll get
            back to you.
          </p>
        </header>
        <ContactIllustration className="h-auto max-h-[24vh] w-full max-w-md self-center lg:self-start" />
        <ContactChannels />
      </section>
      <div className="min-w-0 lg:col-span-7">
        <ContactForm />
      </div>
    </main>
  );
}
