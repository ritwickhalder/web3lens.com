import Link from 'next/link';
import { InfoSection, Intro, PageShell } from '@/components/content/PageShell';
import { SITE } from '@/config/site';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Terms of Use for the Web3Lens Site and Extensions',
  description: `The terms and conditions for using ${SITE.domain}.`,
  path: '/terms',
});

export default function TermsPage() {
  const name = SITE.name;
  const domain = SITE.domain;
  return (
    <PageShell eyebrow="Legal" title="Terms of Use">
      <Intro>
        {name} provides all its services to you subject to the following conditions. By visiting {domain}, you accept
        all these conditions mentioned below. Please read them carefully. {name} is not responsible for the privacy
        policies or content of the websites to which it links.
      </Intro>
      <InfoSection index={1} heading="Privacy Policy">
        Please read our <Link href="/privacy-policy">'Privacy Policy'</Link> page to understand our policies and
        practices.
      </InfoSection>
      <InfoSection index={2} heading="Licensing">
        Some logos that appear on {name} are of a company, organization, website are protected by copyright and/or
        trademark. It is believed that the use of low-resolution images of logos to illustrate the company/website as a
        visual link to the respective hyperlink, qualifies as fair use under Copyright Law. Any featured website on{' '}
        {domain} that wish to be removed from {name}, may <Link href="/contact">'contact us'</Link> and we shall remove
        the content.
      </InfoSection>
      <InfoSection index={3} heading="Terms of Use">
        It is your responsibility as a user to safeguard your public and private data. Initiating or taking part in any
        malicious behaviour towards {domain}, its users or any third party via our website is strictly forbidden. Any
        malicious/obtrusive actions on part of the user, as judged by {name}, shall result in the prompt termination of
        your account until further notice. It is strictly forbidden to use the {name} for any illegal or unauthorized
        purpose. International Users agree to comply with all local laws associated with online conduct and appropriate
        content. Transmitting any worms, viruses or any malicious code is strictly forbidden. We monitor your web
        presence at all times for any illegal activities and so offenders shall be prosecuted. {name} reserves its right
        to modify any part or all of these Terms at any time for any reason.
      </InfoSection>
      <InfoSection index={4} heading="Disclaimer of Warranties">
        This site is provided by {name} on an "as is" and "as available" basis. {name} makes no representations or
        warranties of any kind, explicitly, implicitly or implied, as to the operation of this site or the
        information/content included on this site. You hereby agree to use this site is at your own risk. To the full
        extent permissible by applicable law, {domain} disclaims all warranties, express or implied, including, but not
        limited to, implied warranties of merchantability and fitness for a particular purpose. {domain} does not warrant
        that this site, its servers, or e-mail sent from {domain} are free of viruses or other harmful components.{' '}
        {domain} will not be liable for any damages of any kind arising from the use of this site, including, but not
        limited to direct, indirect, incidental, punitive, and consequential damages. Certain state laws do not allow
        limitations on implied warranties or the exclusion or limitation of certain damages. If these laws apply to you,
        some or all of the above disclaimers, exclusions, or limitations may not apply to you, and you might have
        additional rights.
      </InfoSection>
      <InfoSection index={5} heading="Accounts and Pro" id="pro">
        An account is optional; everything that does not need one stays available without it. If you sign in with
        Google you are responsible for activity on your account and for keeping your devices and API keys secure. Pro is
        offered as a monthly or yearly subscription that renews automatically until you cancel, or as a one-time lifetime
        purchase, and may be tried free for 7 days once per account. Payments are processed by Paddle.com, our merchant
        of record, which also handles tax, invoices and refunds under its own buyer terms. You can cancel a subscription
        at any time from Manage billing on your account page; Pro stays active until the end of the period already paid,
        and it does not renew after that. Refunds are handled by Paddle; a refunded or charged-back payment ends the Pro
        access it paid for. If Pro ends for any reason, nothing you stored is deleted: saved items stay in your browser,
        your cloud copy stays readable, and watches pause until Pro is active again. Plan limits and features are
        described on the <Link href="/pricing">pricing page</Link> and may change; a change that reduces a paid plan
        applies from your next billing period. We may suspend accounts used for abuse, fraud or attacks on the service.
      </InfoSection>
      <InfoSection index={6} heading="API keys and fair use">
        API keys are personal to your account and must not be shared, published or resold. Keyed requests count against
        your account's daily quota; requests without a key share a per-connection limit. Automated scraping of the
        website's pages, attempts to bypass limits (for example by rotating keys, accounts or addresses) and use that
        harms the free public data sources Web3Lens relies on are not allowed and may lead to revoked keys or a
        suspended account. Data from the API is provided as is, with its source and time, and is not financial advice.
      </InfoSection>
      <InfoSection index={7} heading="Your Feedback">
        If you have any questions or suggestions regarding terms of use, please feel free to contact us at our{' '}
        <Link href="/contact">'contact us'</Link> page to let us know anything you wish to convey and we'll get back to
        you as soon as possible. Thank you.
      </InfoSection>
    </PageShell>
  );
}
