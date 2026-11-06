---
title: "Make Clean, Redacted Crypto Screenshots with Edit Page"
seoTitle: "Redact Wallet Addresses in Crypto Screenshots"
description: Edit any page locally to blur wallet addresses, fix typos and remove banners before you screenshot, so tutorials and bug reports never leak private details.
category: security
tags: [edit page, screenshots, privacy, redact, wallet address, documentation, browser extension]
date: 2026-11-06
icon: cursor
coins: [ethereum, bitcoin, base]
order: 20
related: [verify-crypto-wallet-address-checksums, web3lens-developer-tools-guide, browser-context-menu-blockchain-lookups]
---

Screenshots are how crypto knowledge spreads: a bug report to a support team, a step in a tutorial, a transaction shown to an accountant, a post in a community chat. They are also how people accidentally publish their entire financial footprint. A single image of an explorer page can show a full wallet address, a balance, every counterparty and a timestamped history, and a wallet address can be linked to a person over time. This guide shows how to prepare clean, redacted screenshots using [Edit Page](https://editpage.dev/), a visual webpage editor for your browser, and how to check the result before you share it.

## Why redact crypto screenshots

On-chain data is public, so some people assume there is nothing to hide. In practice, three things go wrong:

- **Addresses can identify you.** Once an address is linked to your name, handle or exchange account, anyone can follow its full history, forever.
- **Balances invite targeting.** A screenshot showing a large balance is a signal to scammers and, in the worst cases, to people who know where you live.
- **Pasted text leaks more than you think.** Browser tabs, bookmarks bars, extension icons and profile avatars show up in the frame.

Redaction is not paranoia. It is the same habit as blurring a card number.

## What Edit Page does, and what it does not

Edit Page lets you change a page *in your own browser* by clicking elements. You can edit text, adjust CSS, hide or remove elements, and inspect the structure of the page. The changes are local: they do not change the real website, other visitors never see them, and reloading the page without saved edits brings the original back.

For screenshots, that means you can:

- **Replace text** such as an address, name or amount with a placeholder.
- **Blur or hide elements** such as balance cards, avatars and notification banners.
- **Remove noise** such as cookie notices, pop-ups and promotional bars.
- **Fix typos or wording** in documentation screenshots.
- **Capture the result** with the built-in screenshot tool or your own.

![Edit Page editing heading text directly on a web page with a floating format toolbar](/blog/products/edit-page-edit-text.png "Click any text on the page and type. The change is local to your browser and gone when you reload.")

## A redaction workflow, step by step

### 1. Decide what the viewer needs to see

Before touching anything, write down what the screenshot must prove: "this transaction failed with this error", or "this button is missing". Everything else is a candidate for removal.

### 2. Open the page and look for private details

Common leaks in an explorer or wallet screenshot:

- the sender and receiver addresses
- your own balance and portfolio value
- ENS names and handles
- the browser bookmarks bar, tab titles and open-tab favicons
- notification badges with unrelated information

An address shows up in many places on one page: the header, the table, the breadcrumb and sometimes the tab title.

### 3. Replace sensitive text with a clear placeholder

Click the address and replace it with something like `0x1234…abcd` or `[redacted]`. Keep the format realistic when the format matters to the bug you are reporting. If you are demonstrating an error with a malformed address, you may want to keep the length but change the characters.

> [!TIP]
> If you need a harmless example for a tutorial, use a public, well-known address rather than your own, such as the [USDC token contract](/address/ethereum/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48). It belongs to a public contract, not a person.

### 4. Hide whole elements instead of blurring them

A blur effect can look reassuring while remaining partly legible, and blurred text in a shared page copy can be recovered. For anything sensitive, **remove or replace the element** rather than blurring it. Balances, avatars and account menus are best deleted from view entirely.

### 5. Clean up the frame

Remove banners, ads and unrelated panels so the viewer sees only what matters. Use the page inspector to select the right container when a banner is deeply nested.

![Edit Page inspector showing an element's box model, CSS rules and accessibility information](/blog/products/edit-page-inspect-elements.png "The inspector shows the selected element's box model, CSS rules and accessibility details, which helps when you need to hide exactly the right container.")

### 6. Capture, then inspect the image

Take the screenshot and open the image at full size. Check every corner: the title bar, the scrollbar area, the tab strip and any tooltips. Redaction only counts if the final file is clean.

### 7. Share the image, not the page

Share a **flattened image file**, not an exported page or a saved copy of the HTML. A page copy can contain the original text underneath your edits. An image contains only what you see.

## Verify your example before you publish it

If your screenshot shows an address as an example, make sure it is a valid one. A tutorial with a wrong-length or bad-checksum address teaches readers to copy a broken value. Paste your example into Web3Lens first: it detects the format and checks the checksum, and [how to verify addresses and checksums](/blog/verify-crypto-wallet-address-checksums) explains what each result means.

## Other good uses in a crypto workflow

- **Documentation:** capture consistent, tidy screenshots of explorer pages for your help centre.
- **Bug reports:** show exactly what you saw, with private data removed. Developers appreciate a clear image over a long description.
- **Accessibility tests:** try a larger font, higher contrast or extra line spacing on a dense table to see how it reads, then save the preference for that site.
- **Mock-ups:** test a copy change on your own project's page before asking a developer to build it.

## A note on safety

Edit Page changes what *you* see, which makes it easy to misuse. A modified screenshot of a balance or a transaction is not evidence of anything. Never use edits to misrepresent a real transaction, and treat any screenshot you receive from someone else as unverified. If a screenshot matters, look the transaction up yourself in a block explorer using the hash. See [finding and investigating transactions](/blog/find-and-investigate-blockchain-transactions).

## Install it

- **Chrome:** [Edit Webpage on the Chrome Web Store](https://chromewebstore.google.com/detail/edit-webpage/dcemlmncjcljhjfbijimcamijgfdgieb)
- **Firefox:** [Edit Page on Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/edit-page-visual-web-editor/)
- **Edge:** [Edit Page on Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/joobaocbkihjpoijghmpifmnecpdcbaa)

Edit Page also has a short guide, [how to change the font on any website](https://editpage.dev/blog/how-to-change-the-font-on-any-website), which shows the basics of editing styles.

::cta extension

## Frequently asked questions

### Does Edit Page change the real website?

No. Edits happen in your own browser. The website, its server and other visitors are not affected, and reloading the page without saving the edits restores the original.

### Is blurring a wallet address enough?

Not for anything you care about. Blurs can be partial or reversible in some cases. Replace the text with a placeholder or hide the element, then inspect the final image at full size.

### Why redact addresses if blockchain data is public?

Because an address linked to your identity exposes your whole financial history. Publishing one in a screenshot makes that link easy to make. Redaction keeps the link from forming.

### Can I use edited screenshots as proof of a transaction?

No. Anyone can edit a page, so an image proves nothing by itself. Share the transaction hash and let the other person check it in a block explorer.
