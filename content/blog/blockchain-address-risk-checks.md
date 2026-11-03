---
title: "Blockchain Address Risk Checks: What Users Should Know"
seoTitle: "Crypto Address Risk Checks: What They Can Tell You"
description: What sanctions screening, scam reports, contract checks and token approval reviews can and cannot tell you about a crypto address, and how to act on them.
category: security
tags: [risk checks, ofac, scams, token approvals, smart contract security, phishing]
date: 2026-11-03
icon: shield
coins: [ethereum, base, polygon]
order: 3
related: [verify-crypto-wallet-address-checksums, find-and-investigate-blockchain-transactions, bulk-blockchain-search-csv-export]
---

Before you send funds to an address, sign an approval for a token, or interact with a contract, it's worth asking: is there anything known about this address that should stop me? Risk checks try to answer that from public data. They're genuinely useful, and they're also easy to over-trust.

This article explains the main kinds of risk signal, how Web3Lens collects them, and, just as importantly, what "no reports found" does and doesn't mean.

## The most important rule: no reports is not "safe"

Risk databases are built from reports and investigations. A brand-new scam address, a phishing contract deployed an hour ago, or a wallet that's simply never been reported will have no flags at all. Absence of evidence is not evidence of safety.

That's why Web3Lens never labels an address "safe". Results say "no reports in these sources" and list the sources that were checked. If a source was unreachable, the panel says it was unavailable, not that the address is clean.

> [!WARNING]
> Treat a clean risk panel as "nothing known yet", and still do the basics: verify the address against a trusted source, check you're on the right network, and send a small test amount first.

## Signal 1: Sanctions listings

The US Treasury's Office of Foreign Assets Control (OFAC) publishes the Specially Designated Nationals (SDN) list, which includes cryptocurrency addresses tied to sanctioned people and entities. US persons are generally prohibited from dealing with them, and many exchanges and services screen against the list.

Web3Lens ships a **local snapshot** of the SDN list's crypto addresses, refreshed from Treasury's published data. Because it's local, the check:

- runs instantly, in the [address validator](/tools/address-validator), [batch search](/batch), every address page and the extension
- works offline, even with the extension's online lookups switched off
- never sends the address anywhere to be screened

A match shows the list it came from. A snapshot is only as current as its last refresh, and OFAC is one authority among several, so regulated businesses need a full compliance provider. For individuals, though, a hit is an unambiguous signal to stop.

## Signal 2: Reported scam and phishing addresses

Community and commercial databases collect reports of addresses involved in phishing, wallet drainers, fake tokens, honeypots, mixers and theft. On EVM address pages, Web3Lens queries two:

- **Blockscout** reputation and scam flags, where the chain's Blockscout instance provides them
- **GoPlus** malicious-address flags, such as phishing, stealing attack, honeypot-related, suspected blacklisted, mixer and sanctioned

These flags are reported, not proven, and they vary by source. When two sources disagree, read both; the panel shows each one separately with its own result.

![The Web3Lens risk panel for a flagged address: OFAC listed, GoPlus reports of a suspected blacklisted address and stealing attack, and the same address checked across 11 EVM chains](/blog/extension-risk-checks.png "A flagged address: each source is listed separately, and the cross-chain view shows where funds actually are.")

## Signal 3: Contract checks

If the address is a smart contract, the code matters more than any report. Web3Lens checks:

- **Source verification.** Is the source code published and verified on Blockscout or Sourcify? Unverified contracts aren't necessarily malicious, but you can't review what they do.
- **Upgradeability.** Does the contract use an EIP-1967 proxy? If so, the logic can be replaced by whoever controls the admin slot. Web3Lens reads the implementation and admin addresses directly from storage.
- **Ownership.** Does `owner()` return an address? Is it a contract (perhaps a multisig or timelock) or a single wallet?
- **Privileged functions.** Does the verified ABI expose admin-style functions such as `mint`, `pause`, `blacklist`, `setFee`, `upgradeTo` or `withdraw`? Those are normal in many legitimate tokens, but they mean someone can change the rules after you buy in.
- **Token risk flags** from GoPlus for token contracts, such as honeypot behaviour (buyers may not be able to sell), hidden owners or modifiable taxes.

An upgradeable token owned by a single fresh wallet, with a `blacklist` function and unverified source, isn't proof of a scam, but it's a lot of trust to extend.

## Signal 4: Token approvals

When you use a DEX, NFT marketplace or bridge, you usually **approve** a contract to move your tokens. That approval persists until you revoke it. Wallet drainers work by tricking people into approving an attacker's address, often for an "unlimited" amount.

For EVM addresses, Web3Lens reviews the approvals the address has granted:

- **ERC-20 allowances**, found from approval events and then **read live** from each token, so allowances already used up or revoked aren't shown as current
- **NFT operator approvals** (`setApprovalForAll`), which let an operator move every NFT in a collection
- **Spender labels** for well-known protocols, and a **warning when the spender is a wallet** rather than a contract, which is rarely legitimate

Each row links to the token and spender, and the panel links to [revoke.cash](https://revoke.cash) to revoke anything you no longer need. Approval scanning isn't available on Avalanche, BNB Chain and Linea, because no free index answers full-history approval queries there; the panel says so and links to revoke.cash instead.

> [!TIP]
> Review your own approvals every few months, and revoke unlimited approvals to contracts you no longer use. It costs a little gas and removes a whole class of risk.

## Putting it together: a pre-send checklist

1. **Format and checksum**: does the address validate for the chain you're using? ([How to verify addresses and checksums](/blog/verify-crypto-wallet-address-checksums))
2. **Sanctions**: any OFAC match?
3. **Reports**: any phishing, theft or honeypot flags?
4. **Type**: is it the wallet or contract you expected? Check the history too.
5. **Contract trust**: verified, upgradeable, owned by whom, with what powers?
6. **Your own exposure**: what have *you* approved, and to whom?

Web3Lens shows all of this on EVM address pages; try a [known flagged address](/address/ethereum/0x098B716B8Aaf21512996dC57EB0615e2383E2f96) to see a populated risk panel. For lists of addresses, [batch search](/batch) runs the format and sanctions checks in bulk.

## What risk checks can't do

- **Identify people.** Flags describe behaviour reported against an address, not who controls it.
- **Predict the future.** A clean contract can be upgraded tomorrow; a clean wallet can be compromised.
- **Replace judgement.** Urgency, too-good-to-be-true returns and requests for your recovery phrase are red flags no database needs to confirm.

::cta risk

## Frequently asked questions

### Does Web3Lens tell me if an address is safe?

No, and no tool honestly can. Web3Lens reports what specific sources say and shows which sources were checked. "No reports in these sources" is the strongest positive statement it makes.

### How current is the OFAC sanctions data?

It's a snapshot of OFAC's published SDN data, refreshed periodically and bundled with the site and extension. The snapshot's date is recorded with the data. Check OFAC's own search for time-critical decisions.

### Why are there no risk checks for Bitcoin addresses beyond sanctions?

The scam-report and contract sources Web3Lens uses cover EVM chains. Bitcoin and Solana addresses get the OFAC check and full transaction history, so you can still review activity yourself.
