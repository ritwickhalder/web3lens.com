---
title: How to Scan Webpages for Blockchain Addresses and Transactions
seoTitle: How to Scan a Webpage for Crypto Addresses and Hashes
description: Find every crypto address, transaction hash and ENS name on a page with the Web3Lens extension's Scan page tab, then check them in bulk. Nothing is sent.
category: browser-extension
tags: [browser extension, page scan, research, privacy, activeTab]
date: 2026-11-03
icon: scan
coins: [ethereum, bitcoin, solana, cosmos]
order: 7
related: [browser-context-menu-blockchain-lookups, bulk-blockchain-search-csv-export, web3lens-browser-extension-features-privacy]
---

Some pages are full of addresses: a governance proposal listing multisig signers, an exploit post-mortem tracing stolen funds, a token's documentation with contract addresses on six chains, a forum thread of donation addresses. Copying them out one at a time is slow and error-prone, and it's easy to miss one or grab a truncated version.

The **Scan page** tab in the Web3Lens browser extension does that extraction for you. This guide explains how to use it, what it detects, and the deliberately narrow way it reads pages.

## Using Scan page

1. Open the page you want to scan.
2. Click the Web3Lens icon in the toolbar (or press **Alt+Shift+W**).
3. Choose the **Scan page** tab. The scan runs as soon as the tab opens.

The popup lists what it found: each value shortened for display, with its detected type and chain, for example "EVM address · Ethereum" or "Bitcoin address · Bitcoin". From there you can:

- **Click any result** to look it up in the popup's Lookup tab: format, checksum, chain, explorer links and (with online lookups on) balances and risk flags.
- **Copy all** to put the full, normalised values on your clipboard, one per line.
- **Check all** to open them in the extension's batch view, which validates every value, checks the OFAC sanctions snapshot and exports a CSV. [How to perform bulk blockchain searches and export results to CSV](/blog/bulk-blockchain-search-csv-export) covers that step.
- **Rescan** after the page changes, for example when an infinite-scroll list has loaded more items.

> [!TIP]
> "Copy all" copies the **normalised** values: EVM addresses come out in their EIP-55 checksummed form, which is safer to paste into other tools than the page's original spelling.

## What it detects

The scanner looks for the shapes of common identifiers in the page's visible text:

- EVM addresses (`0x` + 40 hex) and EVM transaction hashes (`0x` + 64 hex)
- Bitcoin and Litecoin SegWit/Taproot addresses (`bc1…`, `ltc1…`)
- Cosmos-family addresses (`cosmos1…`, `osmo1…`, `celestia1…`, `inj1…`)
- Cardano addresses (`addr1…`, `stake1…`)
- Base58 addresses for Bitcoin, Litecoin, Dogecoin, Tron and XRP
- Stellar addresses (`G…`)
- Solana-style base58 addresses and signatures
- ENS names (`….eth`)

Every candidate then goes through the same detector as the website, inside the extension, so results carry a proper label and checksum status. Things that aren't useful to look up are dropped: bare block numbers, and 64-character hex strings without `0x`, which are too ambiguous to label (they could be a Bitcoin txid or many other things).

Anything that looks like a **secret** is never listed. If a page contains a recovery phrase or a private key in a recognised format, the scan ignores it rather than putting it in a list you might copy.

The popup shows the first 30 results. For pages with more, use Copy all or Check all in batches, or narrow the page (many explorers and forums let you filter).

## How it reads the page, and what it doesn't

Scanning a page is a sensitive capability, so it's built around the browser's most restrictive model:

- **Only when you ask.** The extension has no content scripts and no host permissions. It can't see any page on its own. When you open the Scan page tab (or press Rescan), the browser's `activeTab` permission grants temporary access to the current tab for that one action, and the extension injects one small, bundled function.
- **Only visible text.** That function reads the page's rendered text (`innerText`), not form fields, cookies, storage or network traffic. It returns a list of candidate strings and nothing else.
- **Nothing is sent anywhere.** Matching, detection and checksum validation all happen inside the extension. The page's contents never leave your browser. Only if you then click a result and run an online lookup does that single value go to web3lens.com for public blockchain data, and you can switch online lookups off entirely in settings.
- **No remote code.** The injected function is part of the extension package, reviewed with it, and can't be changed from a server.

Browsers don't allow extensions to run on some pages, such as the browser's own settings pages and extension stores. On those, Scan page shows a short message explaining that the page can't be read.

## Practical uses

- **Incident response.** Scan an exploit write-up to collect attacker and victim addresses, then batch-check them for sanctions listings and open each one's cross-chain view.
- **Due diligence.** Scan a project's docs to list every contract address it claims, then check each one is a verified contract on the expected chain.
- **Donations and payouts.** Scan a list of payout addresses and validate checksums before anyone sends anything.
- **Research.** Collect the addresses mentioned in a governance thread or a news article to follow them later. Save them with labels in the extension's Saved tab.

![The Web3Lens extension's batch view listing six values with their type, checksum status, OFAC flag and explorer link](/blog/extension-batch.png "Check all sends the scanned values to the batch view: type, checksum and sanctions status for each, with CSV export.")

## Scan page vs right-click lookups

Scan page is for "everything on this page". When you only care about one value, selecting it and using the right-click menu is faster: see [How to use browser context menus for faster blockchain lookups](/blog/browser-context-menu-blockchain-lookups). Both use the same detector, and both work without leaving the page you're reading.

::cta extension

## Frequently asked questions

### Does the extension scan every page I visit?

No. It has no content scripts and no host permissions, so it can't read pages in the background. A page is read only when you open the Scan page tab on it or press Rescan.

### Why didn't the scan find an address I can see?

It reads the page's text. Addresses inside images, canvas elements, cross-origin frames or truncated displays (`0x1234…abcd`) can't be found. Truncated addresses can't be looked up anyway; open the full value from the site.

### Does Scan page work offline?

Yes. Finding and checking addresses is entirely local. Only optional lookups of balances and risk data need a connection.
