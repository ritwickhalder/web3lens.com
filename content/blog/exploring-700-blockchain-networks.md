---
title: Exploring 700+ Blockchain Networks with Web3Lens
seoTitle: Exploring 700+ Blockchain Networks with Web3Lens
description: How Web3Lens covers 700+ blockchains in one search box: native results for 14 chains, per-type explorer routes for 200, and honest handling of the long tail.
category: explorer-basics
tags: [multichain, chain coverage, block explorer, layer 2]
date: 2026-11-03
icon: stack
coins: [bitcoin, ethereum, solana, polkadot]
order: 13
related: [how-to-find-the-right-block-explorer, multichain-blockchain-explorer-for-developers, what-is-a-blockchain-explorer]
---

Web3Lens started in 2018 as a single page with a very long drop-down: pick a coin, paste a value, get sent to that coin's explorer. The drop-down is still there, now a searchable chain picker with logos and favourites, and it lists **792 chains and tokens**. That is where the "700+" on the home page comes from.

But "supports 792 chains" can mean very different things. This article explains the three levels of coverage Web3Lens has, what you get at each level, and why the site is deliberately honest about the parts that don't work.

## Level 1: native results for 14 major chains

For the networks most people use day to day, Web3Lens doesn't send you anywhere. It fetches the data from public sources and shows the answer on its own result page:

- **11 EVM chains:** Ethereum, Base, Arbitrum One, OP Mainnet, Polygon, BNB Smart Chain, Avalanche C-Chain, Linea, zkSync Era, Scroll and Gnosis Chain.
- **Bitcoin and Litecoin**, using Esplora-compatible APIs such as mempool.space.
- **Solana**, via public RPC.

An address page shows the balance and its USD estimate, token holdings with spam hidden (and counted, so you know something was hidden), recent activity, whether the address is a wallet or a contract, its ENS name if it has one, and the risk panel described in [Blockchain address risk checks: what users should know](/blog/blockchain-address-risk-checks). A transaction page shows status, confirmations, value and fee in native currency and USD, decoded input and token transfers.

Every section carries its source and fetch time. If a provider is slow, the rest of the page still loads and that section streams in later; if it fails, the section says "unavailable" with the reason. On a heavy address, the first bytes of the page now arrive in tens of milliseconds instead of waiting for the slowest provider.

> [!NOTE]
> "Native" here means Web3Lens reads public blockchain data itself. It doesn't run its own indexer for every chain, so for full history and analytics the explorer links are always one click away on the same page.

## Level 2: explorer routes for 200 chains

For 200 chains, Web3Lens knows the exact URL structure of one or more explorers for each kind of lookup: address, transaction, block, name and free-text search. For example:

- **Bitcoin**: mempool.space, Blockstream, Blockchair and Blockchain.com
- **Ethereum**: Etherscan, Blockscout and Blockchair
- **Cosmos Hub**: Mintscan and ATOMScan
- **Polkadot and Kusama**: Subscan, on Asset Hub and the relay chain
- **Hyperliquid**: the Hyperliquid explorer and HyperEVMScan
- **TON**: Tonviewer; **Sui**: Suiscan; **Aptos**: the Aptos Explorer; **NEAR**: NearBlocks

The first explorer in each list is the default; you can choose another per chain in [settings](/settings) and Web3Lens remembers it in your browser. Each of these chains also has a landing page, for example [Ethereum explorer search](/explorer/ethereum), [Solana explorer search](/explorer/solana) or [Cosmos explorer search](/explorer/cosmos), listing its explorers and what each one supports. The full list is on the [explorers index](/explorer).

Because every route template is checked by the test suite (https only, exactly one placeholder, no private hosts) and every final URL passes a safety check before it opens, a lookup on these chains lands on a real page, not a search results page or a 404.

## Level 3: the long tail

The remaining chains come from the original 2018 list: older proof-of-work coins, early smart-contract platforms, and more than 400 ERC-20 and BEP-20 tokens. For these, Web3Lens keeps the legacy handoff: an explorer URL or a form submission.

Four improvements make the long tail more useful than it used to be:

1. **Tokens inherit their chain's routes.** An ERC-20 token's addresses and hashes now open Etherscan's address or transaction page, rather than a generic search. Waves and Stellar assets do the same on their chain's explorer.
2. **Links were upgraded to https** wherever the health check found https working.
3. **Dead explorers are flagged.** A health check probes every explorer host and each chain's own explorer page, so a coin that was dropped from a shared explorer counts as down too. Chains whose only explorer is down are labelled "explorer down" in the chain picker, and the search offers a web-search fallback plus an "open anyway" option.
4. **Dead chains are retired, with a reason.** In November 2026 every chain was audited. Live projects whose explorer had died or moved got a new one (Nano, Ontology, Siacoin, Ravencoin, Namecoin, IOTA and others), and tokens that became their own chains (Theta, Zilliqa, WAX, Viction…) now open their own explorers. 120 entries with nothing left to search, mostly 2017–2018 coins whose project and explorer are both gone, were removed. Each one is recorded with the reason, and an old link to one of them says why it is gone.

The middle ground still applies to live projects: quietly sending you to a dead domain wastes your time, and quietly removing a chain that still exists hides the fact that its explorer is gone. A live chain with a dead explorer stays listed and flagged until a working explorer is found.

## How the chain picker helps

With hundreds of entries, picking the chain is the slow step, so the picker does most of it for you:

- **Auto-detection.** Paste a value and the matching chain is selected automatically. If the chain you picked doesn't fit the format, a "Switch to" chip suggests the one that does.
- **Favourites and popular chains.** Star the chains you use; they stay at the top.
- **Search by name or ticker** (type HYPE, ARB or XRP), with keyboard navigation. The full list is sorted by name.
- **Logos.** Official coin logos for the major chains make the list scannable.

## Adding chains

New L2s and app-chains keep arriving, and the chain list grows with them. 143 chains have been added since the original list, among them Arbitrum, Base, OP Mainnet, Avalanche, Hyperliquid, Sonic, Berachain, Monad, Unichain, Sei, Blast, Kaia, Cronos, Hedera, Kaspa, Stacks, Starknet, Bitcoin SV, Filecoin, MultiversX, Bittensor, the main Cosmos chains (dYdX, Noble, Neutron, Celestia, Babylon…) and Polkadot parachains. Their explorers come from maintained registries rather than guesswork. If a network you use is missing, or its explorer route is wrong, [send a note](/contact); route fixes are small and quick to ship.

::cta search

## Frequently asked questions

### Does Web3Lens support testnets?

Detection recognises Bitcoin and Cardano testnet address formats and labels them as testnet, so you don't mistake them for mainnet addresses. Native result pages cover mainnets only.

### Why does Web3Lens show balances for some chains but open an explorer for others?

Showing data natively requires reliable free data sources for that chain and code to interpret them. Web3Lens adds a chain natively only when it can show accurate, sourced data; for the rest, the explorer is the better source.

### Is the 700+ figure inflated by tokens?

It counts every entry in the chain picker, and that includes the tokens that had their own entry in the original list (more than 400 ERC-20 and BEP-20 tokens, which now route through Ethereum's and BNB Chain's explorers). The more conservative numbers are on this page too: 200 chains with per-type explorer routes, and 14 with native results.
