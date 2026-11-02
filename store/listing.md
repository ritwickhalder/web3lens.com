# Listing copy

Use the same copy in all three stores unless a field below says otherwise.

## Name

Comes from the manifest (Chrome limit 75 characters; 59 used):

> Blockchain Explorer – Scan Blockchain & Web3 Block Explorer

## Short description / summary

Chrome (comes from the manifest, ≤132 characters; 130 used):

> Scan blockchain networks, find block explorers, look up crypto addresses and transaction hashes on 769+ blockchains with Web3Lens.

Firefox summary (≤250 characters):

> Paste or right-click any blockchain address, transaction hash or ENS name. Web3Lens recognises the format and chain, checks the checksum, opens the right explorer page, and shows balances and risk checks. No account, no wallet, no tracking.

## Detailed description

Web3Lens is a multichain blockchain explorer and search tool: one search box to scan blockchain networks and jump
to the right block explorer for any address, transaction or block.

**Crypto address and transaction hash lookup**
Paste an address, transaction hash, block number or ENS name and Web3Lens works out what it is and which chain it
belongs to (30+ formats across Bitcoin, Ethereum and EVM chains, Solana, Tron, XRP, Cosmos, Cardano, Polkadot,
TON and more), verifies the checksum so typos are caught before you send anything, and opens the right page on the
right block explorer. 789 blockchain networks are covered in total.

**Multichain explorer results in the extension**
For 14 major chains (Ethereum, Base, Arbitrum, OP Mainnet, Polygon, BNB Chain, Avalanche, Linea, zkSync, Scroll,
Gnosis, Bitcoin, Litecoin and Solana) it shows the answer itself: balances, token holdings, recent activity,
transaction details with decoded input, and the same address across 11 EVM chains. Every number says where it
came from and when; anything a source can't provide is shown as unavailable, never guessed.

**Risk checks**
The OFAC sanctions list (works offline), reported scam addresses, contract verification, upgradeable proxies and
owners, and the token approvals an address has granted. "No reports" is never presented as "safe".

**Web3 tools and shortcuts**
• Right-click any selected address or hash: "Look up on Web3Lens" or "Open in its block explorer"
• Type w3 and a space in the address bar to search from there
• "Find addresses on this page" (reads the page only when you click it)
• Developer tools: unit converter (wei/gwei/ETH, sats/BTC), address validator, hex and hashes, timestamps,
  gas calculator and live gas tracker, calldata decoder/encoder, raw transaction decoder with sender recovery
• Batch search for up to 50 values with CSV export
• Saved labels and notes, favourite chains, preferred explorers: stored only in your browser
• Light and dark themes

**Privacy**
No account, no wallet connection, no analytics, no ads, no remote code. The extension has no access to your
browsing history or page content beyond the text you select or a page you explicitly scan. Lookups you run are
sent to web3lens.com to fetch public blockchain data; switch "Online lookups" off in settings to keep everything in
your browser (detection, explorer links, tools and the sanctions check still work).

## Category

- Chrome: Tools
- Edge: Developer tools
- Firefox: Search Tools, Other

## Single purpose (Chrome)

Look up blockchain addresses, transactions and names: detect the format and chain, open the matching block
explorer page, and show public on-chain data and risk information about it.

## Permission justifications

| Permission | Justification |
|---|---|
| `storage` | Saves the user's settings, saved address labels and notes, and recent searches on their device. |
| `contextMenus` | Adds "Look up on Web3Lens" and "Open in its block explorer" to the right-click menu for selected text. |
| `activeTab` | Lets the user scan the current tab for addresses and hashes, only when they click "Find addresses on this page". |
| `scripting` | Runs the bundled page-scan function in the active tab for that same user-initiated action; no other script is injected. |
| Host permissions | None requested. |
| Remote code | None. All JavaScript is packaged; network access is limited to https://web3lens.com by the extension's CSP. |

## Notes for reviewers (Edge, AMO)

- No login is needed. To test: open the popup, paste `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045` (detected as an
  EVM address, chain chips appear) and press Search for live results; or right-click any selected address.
- The bundles are built with esbuild from the TypeScript in the source archive (`npm ci && npm run ext:build`); they
  are not minified.
- Network requests go only to https://web3lens.com/api/v1 and only when the user runs a lookup. "Online lookups" can be
  turned off in the extension's settings.

## URLs

- Homepage: https://web3lens.com/extension
- Support: https://web3lens.com/contact
- Privacy policy: https://web3lens.com/privacy-policy
