---
title: How to Find and Investigate Blockchain Transactions
seoTitle: How to Find and Investigate Blockchain Transactions
description: A step-by-step workflow for tracing a crypto transaction: find the hash and chain, read status and fees, decode contract calls and follow token transfers.
category: addresses-and-transactions
tags: [transactions, investigation, calldata, token transfers, tracing]
date: 2026-11-03
icon: receipt
coins: [ethereum, bitcoin, solana]
order: 9
related: [bitcoin-ethereum-evm-block-explorers-explained, blockchain-address-risk-checks, web3lens-developer-tools-guide]
---

"Where is my money?" is the most common question in crypto support, and the answer is almost always on-chain. Whether you're chasing a missing deposit, checking what a contract call really did, or tracing funds after a scam, the method is the same: find the transaction, read it carefully, and follow the value.

This guide walks through that workflow with the tools on Web3Lens and the chain's own explorers.

## Step 1: Get the transaction hash

Everything starts with the **transaction hash** (also called transaction ID, txid or, on Solana, signature). Where to find it:

- **Your wallet's activity list**: every wallet links each entry to an explorer; the hash is in that link.
- **An exchange's withdrawal history**: look for "TxID" or "transaction hash". If it's missing, the exchange hasn't broadcast the withdrawal yet, and no explorer will find it.
- **The sender**: ask for the hash, not a screenshot. Screenshots are trivial to fake; hashes are verifiable.

If all you have is an address, open the address and find the transaction in its history by time and amount.

> [!TIP]
> You can paste an explorer link instead of the bare hash. Web3Lens extracts the hash (or address) from links such as `https://etherscan.io/tx/0x…` and from payment URIs, so you don't need to trim them.

## Step 2: Find out which chain it's on

A Bitcoin txid is 64 hex characters; an EVM hash is `0x` plus 64 hex; a Solana signature is 87–88 base58 characters. For Bitcoin and Solana the chain is clear. For `0x` hashes it isn't: the same format is used on Ethereum, Base, Arbitrum, OP Mainnet, Polygon, BNB Chain and every other EVM network.

When you paste an `0x` hash into [Web3Lens search](/) without choosing a chain, the search page runs a **transaction locator** that checks 11 EVM chains and tells you which one the transaction was mined on. That alone resolves a surprising number of "my transaction doesn't exist" tickets: it exists, on a different network than the one being searched.

## Step 3: Read the status, confirmations and fee

On the transaction page, check these first:

- **Status.** *Success*, *failed* or *pending*. A failed EVM transaction did not move the value it attempted to move, but it still paid gas.
- **Confirmations.** How many blocks have been built on top. A deposit stuck at "pending" for an exchange usually means it's waiting for its required confirmation count.
- **Fee.** On Bitcoin, compare the fee rate (sat/vB) with current rates: a transaction paying far below the market rate can sit in the mempool for a long time. On EVM chains, check the gas price against the [live gas tracker](/gas).
- **Timestamp.** When the block was produced. Block timestamps are set by miners or validators within protocol limits, so treat them as approximate to the second. The [timestamp converter](/tools/timestamp-converter) converts Unix and hex block timestamps to your time zone.

Web3Lens's native [transaction pages](/tx/bitcoin/a1075db55d416d3ca199f55b6084e2115b9345e16c5cf302fc80e9d5fbf5d48d) show status, confirmations, value and fee in native currency and USD for Bitcoin, Litecoin, Solana and 11 EVM chains. That example is the famous 2010 "pizza" transaction, in which 10,000 BTC bought two pizzas.

## Step 4: Work out what actually happened

### Simple transfers

For a native transfer, From, To and Value tell the whole story. On Bitcoin, remember the change output: the payment is usually the output that doesn't go back to the sender's wallet. Web3Lens shows Bitcoin inputs and outputs with the fee rate, and Solana transactions as balance changes per account, which is often clearer than the raw instruction list.

### Contract calls

On EVM chains, many transactions are calls to contracts: swaps, approvals, mints, bridge deposits. Three parts of the page matter:

1. **Decoded input.** The function that was called and its arguments. Web3Lens decodes it with the contract's verified ABI when Blockscout has one, and otherwise matches the function selector against common signatures, clearly labelled as a guess.
2. **Token transfers.** The `Transfer` events emitted during the call. This is where swapped and received tokens appear.
3. **Internal value transfers.** Native currency moved by the contract code itself.

Be especially careful with **approvals**. A call to `approve(spender, amount)` (selector `0x095ea7b3`) moves no tokens, but it lets the spender move them later. A huge or "unlimited" amount to an unknown spender is a classic sign of a phishing signature. [Blockchain address risk checks](/blog/blockchain-address-risk-checks) explains how to review and revoke approvals.

### When you only have raw data

Sometimes you have calldata or a signed transaction but no explorer page, for example from a wallet's "advanced" view before you sign. Two tools help:

- The [calldata and ABI decoder](/tools/abi-decoder) decodes calldata with an ABI you paste, a function signature, or a built-in list of common functions.
- The [raw transaction decoder](/tools/transaction-decoder) decodes a signed raw EVM transaction (legacy, EIP-2930, EIP-1559, blob and EIP-7702 types) and recovers the sender, entirely in your browser and without broadcasting it.

Decoding before you sign is one of the best habits you can build: you see the real function and recipient, not the dApp's description of them.

## Step 5: Follow the money

To trace funds onward, open the recipient address and look at what happened next. Useful questions:

- **Is the recipient a contract or a wallet?** Funds sent to a DEX router or bridge continue elsewhere; follow the token transfers.
- **Is it labelled?** Exchange deposit and hot-wallet addresses are often labelled by explorers. A transfer into an exchange is usually the end of the public trail; only the exchange can link it to an account.
- **Does it exist on other chains?** For `0x` addresses, Web3Lens shows the same address across 11 EVM chains, which reveals bridged funds quickly.
- **Are there risk flags?** Sanctions listings, reported-scam flags or a freshly created address that immediately forwards everything are all worth noting.

![A Web3Lens address result for the USDC contract on Ethereum, showing balance, tokens, activity and labels, each section with its source and fetch time](/blog/extension-results.png "Every section names its source and fetch time; a section that can't be loaded says so instead of guessing.")

## Step 6: Document what you find

Investigations involve many addresses, and it's easy to lose track. Web3Lens has three features for this:

- **Saved addresses** ([/saved](/saved)): give an address a label and notes, mark favourites, and export or import the list as JSON. Labels appear wherever that address shows up. Everything is stored in your browser, not on a server.
- **Batch search** ([/batch](/batch)): paste every address and hash from your notes to check formats, checksums and sanctions in one go, then export a CSV.
- **Shareable investigations**: from batch search, "Copy share link" creates a link that contains the whole list, encoded in the URL fragment. The fragment is never sent to the server, so the list is shared only with whoever you give the link to. Labels in a shared investigation are shown as the sender's claims, not facts.

When you report a scam to an exchange or the authorities, the transaction hashes, addresses, amounts and timestamps are what they need. A tidy CSV beats a stack of screenshots.

::cta batch

## Frequently asked questions

### Why can't I find my transaction on the explorer?

Either it hasn't been broadcast yet (common with exchange withdrawals), it was dropped from the mempool, or you're looking on the wrong chain or explorer. Paste the hash into Web3Lens without choosing a chain; for `0x` hashes it searches 11 EVM chains.

### Can I cancel or reverse a confirmed transaction?

No. Once confirmed, it's final. A *pending* transaction can sometimes be replaced by one paying a higher fee (RBF on Bitcoin, or a same-nonce replacement on EVM chains), but that's done from the sender's wallet before it confirms.

### Can an explorer tell me who owns an address?

Only if that link has been made public, for example a labelled exchange wallet or an ENS name the owner set. Explorers don't know identities; they know addresses.
