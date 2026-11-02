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
    <PageShell eyebrow="Legal" title="Privacy Policy">
      <Intro>
        Here at {SITE.name} we take your privacy very seriously. This privacy policy describes what personal information
        we collect about you and how we use it here.
      </Intro>
      <InfoSection index={1} heading="Information Collection">
        All web servers track basic information about their visitors. This information includes, but is not limited to,
        IP addresses, browser details, timestamps and referring pages. None of this information can personally identify
        specific visitors to this site. The information is tracked for routine administration and maintenance purposes,
        and lets me know what pages and information are useful and helpful to visitors.
      </InfoSection>
      <InfoSection index={2} heading="Blockchain lookups">
        When you ask for balances, transactions, risk checks or live gas prices, the address, hash or name you entered is sent to our
        servers, which fetch public blockchain data from these providers: public JSON-RPC endpoints (publicnode.com and the chains' own
        public RPCs), Blockscout, mempool.space, Blockstream, litecoinspace.org, the Solana RPC, CoinGecko (prices), GoPlus Security and
        Sourcify (risk and verification data), and openchain.xyz / 4byte.directory (only when you ask to look up an unknown function
        selector). Each provider sees the request coming from our servers, not from you. Results are cached briefly in server memory and
        by our hosting provider's CDN to limit load on these free services; we don't keep a history of what you looked up and don't link
        lookups to people. Requests are rate-limited per IP address. Detection, checksum validation, explorer links, the developer tools
        and the OFAC sanctions check run in your browser and send nothing.
      </InfoSection>
      <InfoSection index={3} heading="Stored in your browser">
        Recent searches, saved addresses with your labels and notes, and your settings are kept in your browser's local storage (or the
        extension's storage) and never sent to us. You can export or delete them on the <Link href="/saved">Saved</Link> and{' '}
        <Link href="/settings">Settings</Link> pages. Shared investigation links carry their contents in the part of the URL after the
        “#”, which browsers don't send to servers; anyone you give such a link to can read it.
      </InfoSection>
      <InfoSection index={4} heading="Browser extension">
        The Web3Lens extension for Chrome, Firefox and Edge stores its data on your device only. It reads the text you select when you use
        the right-click menu, and reads the current page only when you click “Find addresses on this page”. When online lookups are on (the
        default; you can turn them off in its settings), the addresses and hashes you look up are sent to web3lens.com as described above.
        It contains no analytics, ads or remote code, and needs no account or wallet.
      </InfoSection>
      <InfoSection index={5} heading="Cookies & Web Beacons">
        Where necessary, this site uses cookies to store information about a visitor's preferences and history in order
        to better serve the visitor and/or present the visitor with customized content. Advertising partners and other
        third parties may also use cookies, scripts and/or web beacons to track visitors to our site in order to display
        advertisements and other useful information. Such tracking is done directly by the third parties through their
        own servers and is subject to their own privacy policies.
      </InfoSection>
      <InfoSection index={6} heading="Controlling Your Privacy">
        Note that you can change your browser settings to disable cookies if you have privacy concerns. Disabling cookies
        for all sites is not recommended as it may interfere with your use of some sites. The best option is to disable
        or enable cookies on a per-site basis. Consult your browser documentation for instructions on how to block
        cookies and other tracking mechanisms.
      </InfoSection>
      <InfoSection index={7} heading="Links & Advertising">
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
