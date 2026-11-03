---
title: How to Use Browser Context Menus for Faster Blockchain Lookups
seoTitle: Right-Click Blockchain Lookups in Your Browser
description: Look up any address, hash or ENS name without copy and paste: the Web3Lens right-click menu, the w3 address-bar keyword and keyboard shortcuts.
category: browser-extension
tags: [browser extension, context menu, omnibox, keyboard shortcuts, productivity]
date: 2026-11-03
icon: cursor
coins: [ethereum, bitcoin, tron]
order: 6
related: [scan-webpages-for-blockchain-addresses, web3lens-browser-extension-features-privacy, how-to-find-the-right-block-explorer]
---

Count the steps in a typical lookup: select the address, copy it, open a new tab, type the explorer's domain (or search for it), paste into the search box, notice it's the wrong network, try another explorer. Six or seven actions for something you might do dozens of times a day.

The Web3Lens extension reduces that to one or two. This guide covers the three shortcuts it adds to Chrome, Firefox and Edge, the right-click menu, the `w3` keyword and the toolbar shortcut, plus a trick that works without installing anything.

## The right-click menu

Select any address, transaction hash, block number or ENS name on any page and right-click. The extension adds two entries, each showing the text you selected:

- **Look up "…" on Web3Lens** opens a new tab with the result: for supported chains, a full result page with balance, tokens, recent activity and risk checks; otherwise the search view showing what the value is and where to look it up.
- **Open "…" in its block explorer** skips Web3Lens and opens the right page on the chain's explorer directly: the address page for addresses, the transaction page for hashes. If you've chosen a preferred explorer for that chain, it uses that one.

Both entries run the value through the same detector as the website first. That gives you a few things for free:

- **Messy selections are cleaned up.** Selected a whole explorer link, or a `bitcoin:` / `ethereum:` payment URI with an amount on the end? The address or hash inside is extracted.
- **The chain is worked out for you.** A `T…` address goes to Tronscan, a `bc1…` address to mempool.space, an ENS name to Etherscan's name lookup.
- **Secrets are never searched.** If the selection is a recovery phrase or private key, it's not looked up; you get a warning instead.

> [!NOTE]
> The extension only sees the text you selected, and only when you click one of its menu entries. It has no access to the rest of the page.

## The w3 address-bar keyword

The extension registers the keyword **w3** in your browser's address bar (the "omnibox"). Click the address bar or press Ctrl+L (⌘L on macOS), type `w3`, a space, and then paste or type the value:

```
w3 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
w3 vitalik.eth
w3 bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq
```

As you type, suggestions show what the value was detected as and on which chains: "EVM address on Ethereum", "EVM address on Base", and so on, up to six. Pick one to go straight to that chain, or press Enter for the best match. If the checksum doesn't match, the suggestion says so before you go anywhere, which makes `w3` a quick typo check too.

Press **Alt+Enter** instead of Enter to open the result in a new tab rather than replacing the current one.

## The toolbar popup and its shortcut

**Alt+Shift+W** opens the extension's popup from anywhere (you can change the key in your browser's extension shortcuts settings). The popup's Lookup tab gives you a search box with auto-detection, compact results with risk flags, and your recent searches. The other tabs hold the developer tools, the live gas tracker, your saved addresses and the [Scan page](/blog/scan-webpages-for-blockchain-addresses) feature.

## Without the extension: Web3Lens as a search engine

If you can't install extensions (a locked-down work browser, for example), you can still get most of the address-bar speed:

- **Add Web3Lens as a site search.** web3lens.com publishes an OpenSearch description, so Firefox and other browsers can offer it as a search engine. In Chrome and Edge, add a site search in settings with the URL `https://web3lens.com/search?q=%s` and a keyword of your choice.
- **Use the keyboard on the site.** On [web3lens.com](/), press `/` or Ctrl+K (⌘K) to jump to the search box from anywhere on the page.
- **Bookmark the search page.** `https://web3lens.com/search?q=…` links are shareable, so a lookup can be sent to a colleague as a URL. See [how to bookmark Web3Lens](/bookmark).

## Choosing what "Look up" does

By default, "Look up on Web3Lens" shows the Web3Lens result page when the chain has native data, and falls back to the explorer otherwise. If you'd rather always land on the block explorer, change the search action in the extension's settings (or in [settings](/settings) on the website). If you turn **online lookups** off, lookups never contact any server: detection, checksums and explorer links still work, and nothing leaves your browser except the explorer page you choose to open.

## A faster daily workflow

A few combinations that save the most time:

1. **Checking a deposit address in a chat or email:** select → right-click → *Look up*. Check the format, checksum and risk flags before sending.
2. **Following a hash from a support ticket:** select → right-click → *Open in its block explorer*.
3. **A value in your clipboard:** Ctrl+L, `w3`, space, paste, Enter.
4. **A page full of addresses:** Alt+Shift+W → Scan page → Check all.

::cta extension

## Frequently asked questions

### Why don't I see the Web3Lens entries in the right-click menu?

They appear only when text is selected. Some pages block text selection, and browsers don't run extension menus on their own internal pages. Firefox for Android doesn't support extension context menus or address-bar keywords, so those two features are desktop-only there.

### Does the w3 keyword send what I type to a server?

No. Suggestions are computed inside the extension. A lookup only reaches web3lens.com when you run one with online lookups enabled, and then only the value you looked up is sent.

### Can I choose Blockscout instead of Etherscan for "Open in its block explorer"?

Yes. Set a preferred explorer per chain in settings, and both the right-click menu and the popup will use it.
