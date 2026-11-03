---
title: Understanding Bitcoin, Ethereum and EVM Blockchain Explorers
seoTitle: Bitcoin vs Ethereum and EVM Block Explorers Explained
description: Bitcoin explorers show inputs, outputs and fee rates; EVM explorers show accounts, gas, contract calls and token transfers. Learn to read both, and L2s too.
category: explorer-basics
tags: [bitcoin, ethereum, evm, layer 2, utxo, gas]
date: 2026-11-03
icon: tree
coins: [bitcoin, ethereum, base, arbitrum]
order: 11
related: [what-is-a-blockchain-explorer, find-and-investigate-blockchain-transactions, multichain-blockchain-explorer-for-developers]
---

Open mempool.space and Etherscan side by side and they hardly look like the same kind of website. One talks about inputs, outputs and sat/vB; the other about nonces, gas and internal transactions. That isn't a design choice. Bitcoin and Ethereum keep their books in fundamentally different ways, and every explorer is a view onto its chain's data model.

Once you understand the two models, almost every explorer in the ecosystem becomes readable, because nearly all chains are variations on one of them.

## Bitcoin: a ledger of coins, not accounts

Bitcoin has no balances stored anywhere. It has **unspent transaction outputs (UTXOs)**: individual chunks of bitcoin, each locked to a script (usually "whoever can sign for this address").

A Bitcoin transaction consumes some existing outputs as **inputs** and creates new **outputs**. The inputs must be spent in full, so if you pay 0.3 BTC using a 1 BTC output, the transaction creates two outputs: 0.3 BTC to the recipient and about 0.7 BTC back to a **change address** you control. Whatever is left over between inputs and outputs is the **fee**.

That is why a Bitcoin explorer's transaction page is a two-column diagram of inputs and outputs, and why reading it needs care:

- **The largest output isn't necessarily the payment.** Often it is change. Wallets usually send change to a fresh address, so you can't always tell which output went to whom.
- **An address "balance" is a sum.** The explorer adds up all unspent outputs that pay to that address.
- **Fees are priced by size, not amount.** Explorers show the fee rate in satoshis per virtual byte (sat/vB). A transaction with many inputs costs more to send, whatever the amount.

> [!TIP]
> On a Web3Lens Bitcoin or Litecoin address page, each recent transaction shows its **net effect** on that address (received minus sent), which saves you doing the input/output arithmetic by hand.

### Confirmations and the mempool

An unconfirmed Bitcoin transaction waits in the **mempool**, the set of valid transactions nodes know about but miners have not yet included. Explorers like mempool.space visualise it as upcoming blocks sorted by fee rate. Once mined, a transaction gains one **confirmation** per block built on top. Many services wait for a few confirmations before crediting deposits, because the most recent blocks can in rare cases be replaced.

If a transaction is stuck, the explorer's fee rate compared with current rates tells you why. Wallets can bump the fee with Replace-By-Fee (RBF) or Child-Pays-For-Parent (CPFP). The [gas and fee calculator](/tools/gas-calculator) shows live Bitcoin fee rates next to EVM gas prices.

## Ethereum: a ledger of accounts and contracts

Ethereum keeps a global **state**: every account has a balance and a **nonce** (a counter of transactions it has sent), and contract accounts also have code and storage.

There are two kinds of account:

- **Externally owned accounts (EOAs)**: controlled by a private key. Your wallet address is one.
- **Contract accounts**: controlled by their code. Token contracts, DEX routers and multisigs are contracts.

Since the Pectra upgrade in 2025, an EOA can also delegate to contract code via **EIP-7702**, so a wallet address can run smart-wallet logic. Web3Lens address pages label addresses as EOA, contract or EIP-7702 delegated, because the distinction changes what a transaction to that address can do.

### Gas, fees and the base fee

Each operation in the Ethereum Virtual Machine costs **gas**. A plain ETH transfer costs 21,000 gas; a token swap might cost 150,000 or more. Since EIP-1559 the fee per gas has two parts:

- **Base fee**: set by the protocol from how full recent blocks were, and burned.
- **Priority fee (tip)**: paid to the block proposer.

The fee is `gas used × (base fee + tip)`, never more than the sender's max fee. An EVM explorer shows gas limit, gas used, the effective gas price and the total fee. The live [gas tracker](/gas) shows current base fees and tips on 11 EVM chains along with what a transfer, a token transfer and a swap would cost.

### What a contract call looks like

When you interact with a contract, the transaction's **input data** encodes the function and its arguments. The first four bytes are the **function selector**, the start of the keccak256 hash of the function's signature. For example `0xa9059cbb` is `transfer(address,uint256)`, the standard ERC-20 transfer.

A good EVM explorer decodes that input using the contract's verified ABI. If the contract isn't verified, it may fall back to a database of known signatures, which is a guess and should be labelled as one. Web3Lens transaction pages do exactly that: verified ABI from Blockscout first, then common signatures clearly marked as a guess. The [calldata and ABI decoder](/tools/abi-decoder) does the same for any calldata you paste.

### Token transfers and internal transactions

Tokens don't move by themselves; a contract updates its own internal ledger and emits a `Transfer` event. Explorers read those events to build the **token transfers** list. Likewise, ETH moved by contract code (for example a DEX paying you out) appears as an **internal transaction**, not in the top-level value field. If a transaction shows "Value: 0 ETH" but you received something, look in those two sections.

## EVM layer 2s and sidechains: one format, many chains

Base, Arbitrum One, OP Mainnet, Linea, zkSync Era, Scroll, Polygon PoS, BNB Smart Chain, Avalanche C-Chain and Gnosis Chain all run the EVM model above. That has two consequences:

1. **Their explorers look almost identical.** Most are Etherscan-family sites or Blockscout instances, so everything you learned above transfers.
2. **The same address exists on all of them.** `0xd8dA…6045` is the same account on every EVM chain, controlled by the same key, with separate balances and histories on each.

The second point is why a single-chain explorer can mislead you: the funds you're looking for may simply be on another network. Web3Lens's cross-chain view looks up an `0x` address on 11 EVM chains in one request and shows where it has a balance or activity, and its transaction locator finds which chain a `0x` hash was mined on. [Why a multichain explorer is essential for Web3 developers](/blog/multichain-blockchain-explorer-for-developers) goes further into that workflow.

## Bitcoin vs EVM explorers at a glance

| | Bitcoin explorer | EVM explorer |
|---|---|---|
| Data model | UTXOs (coins) | Accounts with balances and nonces |
| Transaction shape | Inputs → outputs, change | From → to, value, input data |
| Fee unit | sat/vB | gas × gwei per gas |
| Smart contracts | Limited scripts | Full contracts, decoded calls |
| Tokens | Not native (protocols layered on top) | ERC-20/721/1155 via events |
| Address shared across chains? | No | Yes, across all EVM chains |

## Other models you'll meet

- **Solana** uses accounts too, but transactions list every account they touch up front, and tokens live in separate token accounts owned by your wallet. Explorers show balance changes per account.
- **Cosmos SDK chains** (Cosmos Hub, Osmosis, Celestia, Injective) use accounts with bech32 addresses and message-based transactions; Mintscan covers most of them.
- **Litecoin, Dogecoin, Dash, Zcash and Bitcoin Cash** follow Bitcoin's UTXO model, so Bitcoin-style explorers such as Blockchair and litecoinspace read the same way.

::cta search

## Frequently asked questions

### Why does my Bitcoin transaction have two outputs when I only paid one person?

One output is the payment and the other is change returning to your wallet. Inputs must be spent in full, so the remainder comes back to you minus the fee.

### Why did my failed Ethereum transaction still cost a fee?

The network did the computation up to the point where the transaction reverted, and gas pays for computation, not success. Explorers show the revert status and, when available, the reason.

### Can I see Base or Arbitrum transactions on Etherscan?

Not on etherscan.io, which covers Ethereum mainnet. Base and Arbitrum have their own explorers (BaseScan, Arbiscan and Blockscout instances). Web3Lens picks the right one when you choose the chain.
