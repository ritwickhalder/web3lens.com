import { Browser, CreditCard, Eye, Key } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { PageArt } from '@/components/content/PageArt';
import { FactStrip, type InfoItem, InfoSections, Intro, OnThisPage, PageShell } from '@/components/content/PageShell';
import { EXTENSION_STORES, SITE } from '@/config/site';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Privacy Policy',
  description: `What information ${SITE.domain} collects and how it is used.`,
  path: '/privacy-policy',
});

/** A summary of the sections below; each line restates something the policy says. */
const AT_A_GLANCE = [
  { icon: Eye, title: 'Lookups stay anonymous', body: "We don't keep a history of what you looked up or link lookups to people." },
  { icon: Browser, title: 'Saved items stay local', body: 'Searches, labels and settings live in your browser unless you turn on Pro sync.' },
  { icon: Key, title: 'No wallet secrets', body: 'We never ask for, receive or store private keys or seed phrases.' },
  { icon: CreditCard, title: 'Payments via Paddle', body: 'Card details go to Paddle, never to us.' },
];

export default function PrivacyPolicyPage() {
  const sections: InfoItem[] = [
    {
      id: 'collection',
      heading: 'Information Collection',
      body: (
        <>
          All web servers track basic information about their visitors. This information includes, but is not limited to,
          IP addresses, browser details, timestamps and referring pages. None of this information can personally identify
          specific visitors to this site. The information is tracked for routine administration and maintenance purposes,
          and lets me know what pages and information are useful and helpful to visitors.
        </>
      ),
    },
    {
      id: 'lookups',
      heading: 'Blockchain lookups',
      body: (
        <>
          When you ask for balances, transactions, risk checks or live gas prices, the address, hash or name you entered is sent to our
          servers, which fetch public blockchain data from these providers: public JSON-RPC endpoints (publicnode.com and the chains' own
          public RPCs), Blockscout, mempool.space, Blockstream, litecoinspace.org, the Solana RPC, CoinGecko (prices), GoPlus Security and
          Sourcify (risk and verification data), and openchain.xyz / 4byte.directory (only when you ask to look up an unknown function
          selector). Each provider sees the request coming from our servers, not from you. Results are cached briefly in server memory and
          by our hosting provider's CDN to limit load on these free services; we don't keep a history of what you looked up and don't link
          lookups to people. Requests are rate-limited per IP address. Detection, checksum validation, explorer links, the developer tools
          and the OFAC sanctions check run in your browser and send nothing.
        </>
      ),
    },
    {
      id: 'browser-storage',
      heading: 'Stored in your browser',
      body: (
        <>
          Recent searches, saved addresses with your labels and notes, and your settings are kept in your browser's local storage (or the
          extension's storage) and never sent to us, unless you have Pro and cloud sync copies them to your account (see below). You can export or delete them on the <Link href="/saved">Saved</Link> and{' '}
          <Link href="/settings">Settings</Link> pages. Shared investigation links carry their contents in the part of the URL after the
          “#”, which browsers don't send to servers; anyone you give such a link to can read it.
        </>
      ),
    },
    {
      id: 'extension',
      heading: 'Browser extension',
      body: (
        <>
          The Web3Lens extension for Chrome, Firefox and Edge stores its data on your device only. It reads the text you select when you use
          the right-click menu, and reads the current page only when you open the “Scan page” tab in its popup (the text is searched for addresses on your device and not sent anywhere). When online lookups are on (the
          default; you can turn them off in its settings), the addresses and hashes you look up are sent to web3lens.com as described above.
          It contains no analytics, ads or remote code, and needs no wallet; signing in is optional. It is published only on the official stores:{' '}
          {EXTENSION_STORES.map((s, i) => (
            <span key={s.id}>
              {i > 0 && (i === EXTENSION_STORES.length - 1 ? ' and ' : ', ')}
              {s.url ? (
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.name}
                </a>
              ) : (
                s.name
              )}
            </span>
          ))}
          . Copies offered anywhere else are not ours.
        </>
      ),
    },
    {
      id: 'account',
      heading: 'Optional account and payments',
      body: (
        <>
          You can use Web3Lens without an account. If you sign in with Google, we receive and store your name, email address and profile
          picture, plus the sessions that keep you signed in on the website and in the extension (you can end them on your account page).
          Google's sign-in tokens are stored encrypted, and we ask Google for nothing beyond your basic profile. To enforce plan limits we
          count usage per day (a number, not what you looked up; without an account the count is keyed by a salted hash of
          your IP address, never the address itself). With Pro, the saved addresses, labels, notes, collections and
          investigations you choose to keep in your account are stored so they reach your other devices, and API keys are
          stored only as hashes. Addresses you put on your watchlist are checked against public blockchain data, and if you
          turn on email alerts we send them to your Google email (every email has a one-click unsubscribe link). Deleting your account deletes all of them. We never ask for, receive or store private keys, seed phrases or any other
          wallet secret. Payments are handled by Paddle, our merchant of record: card details go to Paddle, never to us, and we keep only the
          subscription status Paddle reports. Signing in uses a cookie that keeps your session; it is not used for tracking. You can delete
          your account at any time from the account page.
        </>
      ),
    },
    {
      id: 'cookies',
      heading: 'Cookies & Web Beacons',
      body: (
        <>
          Where necessary, this site uses cookies to store information about a visitor's preferences and history in order
          to better serve the visitor and/or present the visitor with customized content. Advertising partners and other
          third parties may also use cookies, scripts and/or web beacons to track visitors to our site in order to display
          advertisements and other useful information. Such tracking is done directly by the third parties through their
          own servers and is subject to their own privacy policies.
        </>
      ),
    },
    {
      id: 'controls',
      heading: 'Controlling Your Privacy',
      body: (
        <>
          Note that you can change your browser settings to disable cookies if you have privacy concerns. Disabling cookies
          for all sites is not recommended as it may interfere with your use of some sites. The best option is to disable
          or enable cookies on a per-site basis. Consult your browser documentation for instructions on how to block
          cookies and other tracking mechanisms.
        </>
      ),
    },
    {
      id: 'links',
      heading: 'Links & Advertising',
      body: (
        <>
          This website contains links to other websites like youtube, coinmarketcap.com etc. Please be aware that I am not
          responsible for the privacy practices of other websites. I encourage you, when you leave this website, to read
          the privacy policy (or privacy statement) of each and every website you visit, as this particular privacy policy
          applies solely to this particular website. I may use outside advertising networks and companies in order to
          display ads on this site. These ads may contain cookies and/or web beacons in order to collect data in the ad
          serving process. These such cookies and/or web beacons are collected by the companies and/or advertising
          networks, themselves. I do not have any access to this information. If you have any questions or suggestions
          regarding this privacy policy, please feel free to <Link href="/contact">contact us</Link> to let us know
          anything you wish to convey and we'll get back to you as soon as possible. Thank you.
        </>
      ),
    },
  ];

  return (
    <PageShell
      eyebrow="Legal"
      title="Privacy Policy"
      lead="What we collect, what stays on your device, and what the website, extensions and accounts send where."
      art={<PageArt scene="privacy" />}
      aside={<OnThisPage items={sections} />}
    >
      <Intro>
        Here at {SITE.name} we take your privacy very seriously. This privacy policy describes what personal information
        we collect about you and how we use it here.
      </Intro>
      <FactStrip items={AT_A_GLANCE} />
      <InfoSections items={sections} />
    </PageShell>
  );
}
