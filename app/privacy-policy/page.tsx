import Link from 'next/link';
import { InfoSection, Intro, PageShell } from '@/components/content/PageShell';
import { SITE } from '@/config/site';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Privacy Policy',
  description: `What information ${SITE.domain} collects and how it is used.`,
  path: '/privacy-policy',
});

export default function PrivacyPolicyPage() {
  return (
    <PageShell title="PRIVACY POLICY">
      <Intro>
        Here at {SITE.name} we take your privacy very seriously. This privacy policy describes what personal information
        we collect about you and how we use it here.
      </Intro>
      <InfoSection heading="Information Collection">
        All web servers track basic information about their visitors. This information includes, but is not limited to,
        IP addresses, browser details, timestamps and referring pages. None of this information can personally identify
        specific visitors to this site. The information is tracked for routine administration and maintenance purposes,
        and lets me know what pages and information are useful and helpful to visitors.
      </InfoSection>
      <InfoSection heading="Cookies & Web Beacons">
        Where necessary, this site uses cookies to store information about a visitor's preferences and history in order
        to better serve the visitor and/or present the visitor with customized content. Advertising partners and other
        third parties may also use cookies, scripts and/or web beacons to track visitors to our site in order to display
        advertisements and other useful information. Such tracking is done directly by the third parties through their
        own servers and is subject to their own privacy policies.
      </InfoSection>
      <InfoSection heading="Controlling Your Privacy">
        Note that you can change your browser settings to disable cookies if you have privacy concerns. Disabling cookies
        for all sites is not recommended as it may interfere with your use of some sites. The best option is to disable
        or enable cookies on a per-site basis. Consult your browser documentation for instructions on how to block
        cookies and other tracking mechanisms.
      </InfoSection>
      <InfoSection heading="Links & Advertising">
        This website contains links to other websites like youtube, coinmarketcap.com etc. Please be aware that I am not
        responsible for the privacy practices of other websites. I encourage you, when you leave this website, to read
        the privacy policy (or privacy statement) of each and every website you visit, as this particular privacy policy
        applies solely to this particular website. I may use outside advertising networks and companies in order to
        display ads on this site. These ads may contain cookies and/or web beacons in order to collect data in the ad
        serving process. These such cookies and/or web beacons are collected by the companies and/or advertising
        networks, themselves. I do not have any access to this information. If you have any questions or suggestions
        regarding this privacy policy, please feel free to <Link href="/contact">contact us</Link> to let us know
        anything you wish to convey and we'll get back to you as soon as possible. Thank you.
      </InfoSection>
    </PageShell>
  );
}
