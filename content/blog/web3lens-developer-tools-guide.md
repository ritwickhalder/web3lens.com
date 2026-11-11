---
title: A Guide to Web3Lens Developer Tools and Blockchain Utilities
seoTitle: Web3Lens Developer Tools: A Practical Guide
description: Seven free blockchain utilities that run in your browser, from a wei converter to calldata and raw transaction decoders, with worked examples to paste.
category: developer-tools
tags: [developer tools, abi decoder, keccak256, unit converter, raw transaction, gas]
date: 2026-11-03
icon: wrench
coins: [ethereum, bitcoin, solana]
order: 5
related: [multichain-blockchain-explorer-for-developers, find-and-investigate-blockchain-transactions, bulk-blockchain-search-csv-export]
---

Smart-contract work involves a lot of small conversions: wei to ether, a selector to a function name, a hex timestamp to a date, a raw signed transaction to something a human can read. Most developers keep a pile of bookmarks or one-off scripts for these. Web3Lens puts them in one place, at [web3lens.com/tools](/tools) and inside the browser extension, with two rules: exact maths, and nothing leaves your browser unless the tool needs live data.

This guide walks through each tool with an example you can paste.

## 1. Unit converter

[Open the unit converter](/tools/unit-converter)

Converts between a chain's base unit and its display unit:

- **wei ↔ gwei ↔ ether** (1 ether = 10¹⁸ wei, 1 gwei = 10⁹ wei)
- **satoshis ↔ bitcoin** (1 BTC = 10⁸ sats)
- **lamports ↔ SOL** (1 SOL = 10⁹ lamports)
- **any token decimals**: USDC uses 6, most ERC-20 tokens 18, WBTC 8

Everything uses BigInt arithmetic, so there's no floating-point rounding. Try `1500000000000000000` wei: it's exactly `1.5` ether, and `115792089237316195423570985008687907853269984665640564039457584007913129639935` (2²⁵⁶ − 1, the "unlimited" approval amount) converts without losing a digit.

> [!TIP]
> When a contract call takes a token amount, convert with the token's own `decimals()`, not 18. Sending `1000000000000000000` to a 6-decimal token means a trillion tokens, not one.

## 2. Address validator

[Open the address validator](/tools/address-validator)

Paste an address and see its format, chain candidates and checksum status: EIP-55 for EVM addresses, Base58Check for Bitcoin-family and Tron, bech32/bech32m for SegWit, Taproot, Cosmos and Cardano, CashAddr, SS58 with BLAKE2b, Stellar and TON CRC16. It also checks the local OFAC sanctions snapshot. [How to verify cryptocurrency wallet addresses and checksum validity](/blog/verify-crypto-wallet-address-checksums) explains what each result means.

## 3. Hex, text and hashes

[Open hex, text and hashes](/tools/hex-converter)

A grab bag for low-level data:

- **hex ↔ decimal**, including reading a 32-byte word as a signed `int256` (two's complement), handy for event data and storage slots
- **UTF-8 ↔ hex**, for revert strings and `bytes` arguments
- **keccak256 and SHA-256** of text or raw bytes

Hashing a function signature gives you its **selector**. `keccak256("transfer(address,uint256)")` starts with `a9059cbb`, which is why every ERC-20 transfer's calldata starts with `0xa9059cbb`. Hash `Transfer(address,address,uint256)` and you get the event topic `0xddf252ad…` you'll see in logs.

## 4. Timestamp converter

[Open the timestamp converter](/tools/timestamp-converter)

Converts Unix timestamps in seconds, milliseconds, microseconds or nanoseconds, and hex block timestamps such as `0x65f1c5a0` from raw RPC responses, to UTC and your local time zone, and dates back to timestamps. It also detects the unit from the number of digits, which catches the classic seconds-vs-milliseconds bug.

## 5. Gas and fee calculator

[Open the gas and fee calculator](/tools/gas-calculator)

Enter a gas limit and fee parameters to see the cost of a transaction, with EIP-1559 maths: `gas used × min(max fee, base fee + priority fee)`. It loads **live gas prices for 11 EVM chains** and **Bitcoin fee rates**, so you can answer "what does a swap cost on Base vs Arbitrum right now?" in dollars. The live data is the one part that needs a network request; for a dashboard view, see the [gas tracker](/gas), which refreshes every 30 seconds while the page is visible.

## 6. Calldata and ABI decoder

[Open the calldata decoder](/tools/abi-decoder)

Paste transaction input data and decode it in one of three ways:

1. **With a JSON ABI** you paste (from a verified contract or your build output). This is the reliable path.
2. **With a function signature**, such as `swapExactTokensForTokens(uint256,uint256,address[],address,uint256)`.
3. **With the built-in list** of common functions: ERC-20, ERC-721, multicall and popular DEX calls.

If the selector isn't known locally, you can opt in to an online lookup against community signature databases (openchain.xyz, with 4byte.directory as a fallback). Treat those results as candidates: different functions can share a selector, and anyone can submit signatures.

The same tool works in reverse, **encoding** a call from a signature and arguments, which is useful for multisig transactions and quick scripts.

Try this ERC-20 transfer of 1 USDC (6 decimals) to `vitalik.eth`'s address:

```
0xa9059cbb000000000000000000000000d8da6bf26964af9d7eed9e03e53415d37aa9604500000000000000000000000000000000000000000000000000000000000f4240
```

## 7. Raw transaction decoder

[Open the raw transaction decoder](/tools/transaction-decoder)

Paste a signed raw EVM transaction (the `0x02f8…` hex that wallets and scripts produce before broadcasting) and see every field: type, chain ID, nonce, gas limit, fees, recipient, value, data, access list, blob hashes and, for EIP-7702, the authorisations. It supports legacy, EIP-2930, EIP-1559, EIP-4844 blob and EIP-7702 set-code transactions, and **recovers the sender** from the signature with a native secp256k1 implementation.

Nothing is broadcast. That makes it useful for:

- checking what a hardware wallet or script actually signed
- debugging "invalid sender" or wrong chain ID errors
- reviewing EIP-7702 authorisations, which hand control of an account to contract code. The decoder warns about exactly this.

![The raw transaction decoder showing a decoded EIP-7702 transaction with recovered sender, chain id, nonce, gas and fee fields](/blog/extension-tools.png "The raw transaction decoder, here in the extension, decoding an EIP-7702 transaction locally and recovering its sender.")

## Beyond single values: batch search

When you have a list instead of one value, [batch search](/batch) checks a list of addresses, hashes or names at once and exports CSV. See [How to perform bulk blockchain searches and export results to CSV](/blog/bulk-blockchain-search-csv-export).

## Privacy and trust

All seven tools are client-side code shipped with the page (and bundled in the extension). Only two things make network requests: live gas prices, and the optional selector lookup when you ask for it. The code is open source on [GitHub](https://github.com/ritwickhalder/web3lens.com), and the codecs are tested against reference vectors and mainnet transaction fixtures.

If you build for the web more broadly, the same developer also maintains [Web Developer Tools](https://webdevelopertools.dev), a set of everyday utilities for formatting, encoding and inspecting web data.

::cta extension

## Frequently asked questions

### Are the Web3Lens developer tools free?

Yes, with no sign-up, ads or usage limits on the local tools. The live gas data and selector lookups are rate-limited like the rest of the public API.

### Can I use the tools offline?

Once the page is loaded, everything except live gas prices and online selector lookups works offline. The extension's tools work offline by design.

### Is it safe to paste a signed transaction into the decoder?

It's decoded locally and never broadcast. A signed transaction can't be altered, but anyone who has it could broadcast it, so treat it as you would any pending transaction and don't paste it into tools you don't trust.
