---
title: "Web3Lens Browser Extension: Features, Privacy and Productivity"
seoTitle: "Web3Lens Extension: Features, Privacy and Permissions"
description: What the Web3Lens extension for Chrome, Firefox and Edge does, which permissions it uses and why, and what data leaves your browser (and what never does).
category: browser-extension
tags: [browser extension, chrome, firefox, edge, privacy, permissions]
date: 2026-11-03
icon: puzzle
coins: [ethereum, bitcoin, solana, base]
order: 2
related: [browser-context-menu-blockchain-lookups, scan-webpages-for-blockchain-addresses, web3lens-developer-tools-guide]
---

Crypto-related browser extensions have a mixed reputation, and for good reason: some of the most damaging wallet thefts have come through extensions with broad permissions or remote code. So before describing what the Web3Lens extension does, this article spends as much time on what it **can't** do, and why it was built that way.

## What the extension does

The extension brings the website's search, detection, risk checks and tools into Chrome, Firefox and Microsoft Edge, available from any tab.

### The popup

Click the toolbar icon or press **Alt+Shift+W**. The popup has five tabs:

- **Lookup**: a search box with auto-detection for 30+ formats and checksum validation, compact results (balance, type, risk flags) with Copy and Save buttons, recent searches and example queries.
- **Scan page**: lists the addresses, hashes and names on the current tab, with Copy all and Check all. See [how to scan webpages for blockchain addresses](/blog/scan-webpages-for-blockchain-addresses).
- **Tools**: all seven developer tools inline (unit converter, address validator, hex and hashes, timestamps, gas calculator, calldata decoder, raw transaction decoder).
- **Gas**: live Bitcoin fee rates and EVM gas prices with the cost of a transfer.
- **Saved**: your labelled addresses with a filter, favourites and one-click lookups.

### Everywhere else in the browser

- **Right-click any selected text** for "Look up on Web3Lens" or "Open in its block explorer".
- **Type `w3` and a space** in the address bar for detection-aware suggestions. Both are covered in [how to use browser context menus for faster blockchain lookups](/blog/browser-context-menu-blockchain-lookups).

### The full-page app

The popup's "open in a tab" button opens a full-page version with native result pages (balances, tokens, transactions, decoded input, risk checks and token approvals), the cross-chain view across 11 EVM chains, batch search with CSV export, saved addresses and settings.

![The Web3Lens extension popup with an auto-detected Ethereum address, the chains it could belong to, and Open in explorer, Save and Copy buttons](/blog/extension-lookup.png "The popup's Lookup tab: detection and checksum status as you paste, with the matching chains.")

### Looks and language

The extension uses the website's design in light, dark or system theme, with the same chain picker, logos and favourites. Its interface is available in **15 languages**: English, Spanish, Portuguese, French, German, Japanese, Korean, Simplified Chinese, Russian, Indonesian, Turkish, Italian, Polish, Dutch and Thai. It follows your browser's language by default and can be changed in settings. Chain names, symbols, addresses and hashes are never translated.

## Permissions, and why each one is needed

| Permission | Why |
|---|---|
| `storage` | Your settings, saved labels and notes, and recent searches, kept on your device. |
| `contextMenus` | The two right-click entries. The extension sees only the text you selected, and only when you click an entry. |
| `activeTab` | Temporary access to the current tab, granted by the browser only when you open the Scan page tab. |
| `scripting` | Runs the bundled page-scan function in that tab for that one action. No other script is ever injected. |

Just as telling is what it **doesn't** request:

- **No host permissions.** It can't read or change any website on its own.
- **No content scripts.** Nothing runs inside the pages you visit in the background.
- **No access to your browsing history, tabs list, cookies or downloads.**
- **No wallet connection** and no account. It never asks you to sign anything.
- **No remote code.** All JavaScript ships in the package; the extension's Content Security Policy only allows network connections to `https://web3lens.com`.

These constraints are enforced in the project's test suite: the build fails if permissions or the CSP loosen, if the three browsers' manifests drift apart, or if the packaged code is out of date with its source.

## What data leaves your browser

Detection, checksums, explorer links, the developer tools, saved labels and the OFAC sanctions snapshot all work **entirely locally**.

When you run a lookup that needs live chain data (a balance, a transaction, the risk panel, gas prices), the extension sends that one address, hash or name to the Web3Lens API at web3lens.com, which queries public blockchain data sources and returns the result. Nothing else is sent: no browsing data, no page contents, no identifiers, no analytics.

Switch **Online lookups** off in settings and the extension makes no network requests at all. You still get detection, checksum validation, explorer links, the tools, saved addresses and the sanctions check. The footer of the popup always tells you which mode you're in. The [privacy policy](/privacy-policy) has the full details.

> [!NOTE]
> The extension contains no analytics, ads or trackers. It's open source, and the Firefox submission includes a source archive that rebuilds byte-identical bundles from a clean checkout.

## Installing it

The extension is free for all three browsers:

- **Chrome:** [Web3Lens on the Chrome Web Store](https://chromewebstore.google.com/detail/blockchain-explorer-web3/bigcbkdjbbmgdicfejljnklmgbpmajlf)
- **Firefox:** [Web3Lens on Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/blockchain-explorer-web3-lens/)
- **Edge:** [Web3Lens on Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/cadpfffbbdjebfjjibmbbnjbcmajajdd)

Brave and Vivaldi install it from the Chrome Web Store. Install only from these official listings: a copy offered anywhere else isn't ours. The [extension page](/extension) picks the right store for your browser, and explains how to load it from the open-source folders on GitHub instead.

## Productivity tips

- **Pin the toolbar icon** so the popup is always one click away.
- **Star your chains** in the chain picker; favourites appear first everywhere.
- **Set a preferred explorer** per chain if you prefer, say, Blockscout or mempool.space.
- **Label addresses you trust** in Saved. Labels show up next to those addresses in results, a simple defence against [look-alike address poisoning](/blog/verify-crypto-wallet-address-checksums).
- **Use `w3` as a quick validator**: the suggestion flags a checksum mismatch before you go anywhere.

The extension also links to the developer's other free browser tools from its Info dialog, including [CentPage](https://www.centpage.com/), a fast productivity startpage and dashboard for new tabs, and [SummaryTube](https://summarytube.com) for summarising long YouTube videos, which is handy for the conference talks and protocol explainers that crypto research tends to involve.

::cta extension

## Frequently asked questions

### Is the Web3Lens extension a wallet?

No. It never holds keys, never connects to your wallet and never asks you to sign anything. It only reads public blockchain data.

### Can the extension see the websites I visit?

No. It has no host permissions or content scripts. It can read the current tab only when you open the Scan page tab, and only the text of that one page.

### Which browsers does it work in?

Chrome, Firefox and Microsoft Edge, each from its official store, plus Chromium-based browsers such as Brave and Vivaldi through the Chrome Web Store. There's no Safari version, and mobile Chrome and Edge don't support extensions.

### Does it work on Firefox for Android?

The popup, tools and lookups do. Firefox for Android doesn't support extension context menus or address-bar keywords, so those two features are desktop-only.

### Does it cost anything?

No. It's free, with no ads, accounts or paid tiers.
