---
title: ENS Domains, Wallet Addresses and Web3 Identity Explained
seoTitle: ENS Domains and Web3 Identity Explained
description: How ENS names resolve to wallet addresses, what primary names and reverse records are, how off-chain names like jesse.base.eth work, and how to stay safe.
category: addresses-and-transactions
tags: [ens, web3 identity, reverse resolution, ccip-read, names]
date: 2026-11-03
icon: identity
coins: [ethereum, base]
order: 8
related: [identify-blockchain-addresses-and-transaction-hashes, verify-crypto-wallet-address-checksums, find-and-investigate-blockchain-transactions]
---

`0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045` is hard to remember and easy to get wrong. `vitalik.eth` is neither. The Ethereum Name Service (ENS) maps readable names to addresses, and over the years it has become the closest thing Web3 has to a username system.

This guide explains how ENS resolution actually works, why "this address's name" and "this name's address" are two different lookups, how newer off-chain names work, and what to check before trusting a name.

## Names are pointers, not addresses

An ENS name is a record in the ENS registry on Ethereum. The registry stores, for each name, an **owner** and a **resolver**: a contract that answers questions about the name. Asking "what address does `vitalik.eth` point to?" means:

1. Compute the name's **namehash**, a recursive keccak256 hash of its labels, and normalise the name first (ENSIP-15) so that different spellings of the same name agree.
2. Ask the registry which resolver is set for that namehash.
3. Ask the resolver for the address record.

Because the answer comes from a resolver, the owner can change it at any time. A name that pointed to one wallet last month can point to another today. That's a feature (you can rotate wallets without changing your name) but it means you should resolve a name at the moment you use it, not rely on an old screenshot.

ENS names can also hold addresses for other chains (ENSIP-9 multichain records), plus text records such as an avatar, website or social handles.

## Forward and reverse resolution

There are two directions:

- **Forward resolution**: name → address. "Send to `vitalik.eth`" uses this.
- **Reverse resolution**: address → name. Wallets and explorers use this to display a name instead of a hex address.

Reverse resolution uses a separate **reverse record** (the "primary name") that the address owner sets. Anyone can point their own name's forward record at someone else's address, so a correct implementation always **verifies** the reverse record: look up the address's claimed primary name, then forward-resolve that name and check it returns the same address. If it doesn't, the name must not be displayed.

Web3Lens address pages on EVM chains show the ENS primary name when the reverse record exists and checks out, and searching a name resolves it on-chain before showing results.

## Off-chain and subdomain names: wildcards and CCIP-read

Registering every name on Ethereum mainnet costs gas, so many projects issue names off-chain. Two standards make that work:

- **Wildcard resolution (ENSIP-10)** lets a resolver answer for every subdomain of a name, such as `*.base.eth`, without a registry entry for each one.
- **CCIP-read (EIP-3668)** lets a resolver say "ask this gateway", fetch a signed answer from an off-chain server, and verify that answer on-chain through a callback.

That's how names like `jesse.base.eth` resolve. It also creates new trust questions: the gateway is a web server. Web3Lens follows CCIP-read with safeguards: the gateway's answer is verified on-chain by the resolver's callback; lookups raised by a different contract than the one asked are refused; gateways must be public https hostnames (no IP addresses or internal names); and responses have size, time and round-trip limits.

## Other naming systems

ENS is the largest, but not the only one:

| Name ending | System | Chain |
|---|---|---|
| `.eth` | Ethereum Name Service | Ethereum (resolves addresses for many chains) |
| `.sol` | Solana Name Service | Solana |
| `.ton` | TON DNS | TON |
| `.near` | NEAR account names | NEAR (the name *is* the account) |

Web3Lens recognises all four and routes each to the right resolver or explorer. NEAR is different: a `.near` name is the account ID itself, not a pointer to one.

## Names as identity

Because names are owned by addresses and carry text records, they've become a light identity layer:

- **Profiles.** Avatar, description, website, social links and other chain addresses in one place.
- **Login and display.** "Sign-in with Ethereum" sessions and many dApps show your primary name.
- **Reputation.** Long-lived names with history are harder to fake than fresh addresses.

But a name is not proof of real-world identity. It proves control of a wallet, nothing more. A name that looks like a brand or a public figure might belong to anyone.

## Safety checklist for names

1. **Resolve at send time.** Records can change. Look at the resolved address right before you send.
2. **Read the name character by character.** Unicode look-alikes (Cyrillic `а` vs Latin `a`) and extra hyphens make convincing fakes. Normalisation rules block some but not all confusables.
3. **Check the resolved address's history.** A "well-known" name that resolves to an address with no history deserves suspicion.
4. **Prefer verified primary names** when reading addresses in explorers and wallets.
5. **Save the resolved address** you've verified. Web3Lens [saved addresses](/saved) store labels in your browser, so next time you see that address you'll see your own label.

> [!NOTE]
> Expired names can be re-registered by someone else. If you send to a name you haven't used for a long time, check that it still resolves to the address you expect.

## Looking up names on Web3Lens

Type a name such as `vitalik.eth` into the [search box](/) or the extension's `w3` address-bar keyword. Web3Lens detects it as an ENS name, resolves it on-chain (including wildcard and CCIP-read names) and shows the address page with balance, tokens, activity and risk checks. From there, the cross-chain view shows the same address on 11 EVM chains.

Developers can resolve names programmatically with the public `/api/v1/resolve?q=` endpoint, which the extensions use too. [Why a multichain explorer is essential for Web3 developers](/blog/multichain-blockchain-explorer-for-developers) lists the rest of the API.

::cta search

## Frequently asked questions

### Can one ENS name hold Bitcoin and Solana addresses too?

Yes. ENS supports address records for many chains (ENSIP-9), so a single name can resolve to an Ethereum address, a Bitcoin address and others. Whether a wallet uses those records depends on the wallet.

### Why does an explorer show a different name than I expected for an address?

It shows the address owner's **primary name** from the reverse record, which may differ from other names that point to the address. Only the address owner can set the primary name.

### Is an ENS name an NFT?

Yes. `.eth` names are tokens that can be transferred and traded. Whoever holds the token controls the name's records, which is another reason to resolve a name every time you use it.
