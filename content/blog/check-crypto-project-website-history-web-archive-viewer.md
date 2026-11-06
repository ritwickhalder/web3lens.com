---
title: "Check a Crypto Project's Website History Before You Trust It"
seoTitle: "Check a Crypto Project's Website History (Wayback)"
description: Use web archives to see how a token or DeFi site looked before, find removed roadmaps and team pages, and spot rebrands. A step-by-step due-diligence guide.
category: security
tags: [web archive, wayback machine, due diligence, scam research, crypto, browser extension]
date: 2026-11-06
icon: seal
coins: [ethereum, base, solana]
order: 17
related: [blockchain-address-risk-checks, verify-crypto-wallet-address-checksums, scan-webpages-for-blockchain-addresses]
---

A project's website is the one thing it fully controls, and it can change overnight. A roadmap can quietly lose its dates. An audit badge can appear after a launch. A team page can lose three names. A deposit address that was on the page last week can be swapped for a different one. If you only ever look at a site as it is today, you miss the history that often tells the real story. This guide shows how to use web archives for crypto due diligence, and how to combine them with on-chain checks in Web3Lens.

## Why website history matters in crypto

On-chain data is permanent, but promises are not. Web archives fill the gap by keeping dated copies of public pages, which lets you compare claims with what was true at the time.

Useful questions an archive can answer:

- **Was the roadmap real?** Did milestones exist before launch, or were they added afterwards?
- **Who was on the team?** Were names, photos and links present at launch and removed later?
- **What did the terms say?** Did a fee, a lockup or a risk disclosure change after people bought in?
- **Is this a rebrand?** Does the domain have an earlier life as an unrelated project?
- **Did an address change?** Compare the donation, treasury or deposit address on the page across dates.

> [!NOTE]
> An archived page shows what was *publicly served* at a moment in time. It does not prove intent, and a missing capture does not prove anything was hidden. Treat archives as one input, never a verdict.

## Web Archive Viewer in one paragraph

[Web Archive Viewer](https://webinternetarchive.com/) is a free browser extension for Chrome, Firefox and Edge that searches the Wayback Machine and several other web archives from one popup. Instead of visiting each archive's site and typing the URL again, you check them all at once from the page you are already on.

- **Search archives:** check one archive or all of them for the current URL.
- **Snapshot by date:** pick a date and jump to the closest capture.
- **Timeline:** browse captures by year, month and day to see when a page changed.
- **Domain history:** see historical URLs, subdomains and files for a site.
- **Compare versions:** see exactly what changed between two captures, including text, headings, links and metadata (a Pro feature).

![Web Archive Viewer timeline showing captures of a page by year and month with change markers](/blog/products/web-archive-viewer-timeline.png "The timeline view shows every capture by year and month, and marks the ones where the page actually changed.")

## A five-step website check for any token or protocol

### 1. Start from the contract, not the link

Scam sites copy real ones, so do not start from a link in a chat message. Take the **contract address** or the project's name, look it up in [Web3Lens](/), and open the project's website from a source you trust, such as the verified explorer page or the project's own social profile. Web3Lens shows the contract's [verification and risk signals](/blog/blockchain-address-risk-checks) first, so you know how much scrutiny the rest deserves.

### 2. Open the timeline

With the site open, run Web Archive Viewer's timeline. A legitimate project usually has captures going back to before launch, at reasonable intervals. A site with its **first capture on the day the token launched** is not automatically bad, but you should know it.

### 3. Compare the launch-day page with today's

Use **Snapshot by date** to open the page as it was a few days after launch, then compare it with today's. Pay attention to:

- changed percentages, supply numbers or fee wording
- removed disclaimers, lockup periods or vesting schedules
- team members who disappeared
- new "audited" or "partnered with" claims that were not there at launch

With the Compare versions tool, those differences are listed for you instead of requiring you to read two pages side by side.

![Web Archive Viewer comparing two captures of a page, listing text and metadata changes](/blog/products/web-archive-viewer-compare-versions.png "Comparing two captures highlights added and removed text, changed headings and altered metadata.")

### 4. Check the domain's earlier life

Domain history lists the URLs and subdomains the archive has seen. A "new" DeFi site on an old domain may have started as a casino, a coupon blog or an unrelated brand. That is a legitimate reason to ask more questions. Domains also expire and get bought, which is why [how to check domain history before buying](https://webinternetarchive.com/blog/check-domain-history-before-buying) applies to crypto projects too.

### 5. Verify addresses against the page

If the site shows a treasury, donation or deposit address, copy it into Web3Lens. It will detect the format, validate the checksum and run the sanctions and report checks. Then look at that address in older captures: if it differs, find out why before sending anything. The same idea underpins [scanning pages for blockchain addresses](/blog/scan-webpages-for-blockchain-addresses).

## Red flags worth a closer look

| What you see in the archive | What it might mean |
|---|---|
| First capture on launch day, nothing before | A new brand, or a site built only for the launch |
| Team page with no captures, then suddenly full | Team added after attention arrived |
| Terms or fee text edited after launch | Rules changed after people committed funds |
| Treasury address differs between captures | Migration, or something worse. Ask the team publicly |
| Identical text to another project's older site | Copied marketing. Check who is behind each |

None of these is proof of wrongdoing alone. Several together, plus on-chain flags, justify caution.

## Limits you should know

- **Not every page is captured.** Archives crawl what they find, so a missing date is not evidence of a change.
- **Dynamic sites capture poorly.** Single-page apps may archive as a blank shell, so rely on the text and metadata where available.
- **Archives can be wrong about timing.** A capture date is when the crawler visited, not when a change was made.
- **You cannot archive the past.** If a page was never captured, no tool can show it.

For important pages, save your own copy now. Web Archive Viewer's *Archive now* action submits the page you are viewing so there is a dated record you can cite later.

## Install it

- **Chrome:** [Web Archive Viewer on the Chrome Web Store](https://chromewebstore.google.com/detail/web-archive-viewer-%E2%80%93-inte/fgfklknfijhflahngajfoagmoilakebp)
- **Firefox:** [Web Archive Viewer on Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/web-internet-archive-viewer/)
- **Edge:** [Web Archive Viewer on Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/web-archive-viewer-%E2%80%93-wayb/pifalngiecdabdhdjgdibkgehkmmaemp)

::cta risk

## Frequently asked questions

### Can a web archive prove a crypto project is a scam?

No. Archives show what a page said at a point in time. They can reveal changed promises, removed team members or a domain's earlier use, which are good reasons for caution, but they do not show intent. Combine them with on-chain data and contract checks.

### Which archives does Web Archive Viewer search?

It searches the Wayback Machine plus several additional archives from one popup. Check the extension's listing for the current set, since archives are added and removed over time.

### Is checking a site's history free?

Searching archives, snapshot by date, timeline and domain history are free. Comparing two versions, bulk lookups and the research library are Pro features. See [webinternetarchive.com](https://webinternetarchive.com/) for the current plan details.

### What should I do if the site was never archived?

Treat it as unknown, not as bad or good. Lean on the on-chain evidence: contract verification, deployer history, liquidity and holder distribution. Save your own capture so you have a record from today onward.
