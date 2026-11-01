/** Beginner's guide FAQ (ported from legacy/blockchain-guide.html). */
export type GuideEntry = { question: string; answer: string; youtubeId?: string };

export const GUIDE: GuideEntry[] = [
  {
    question: 'What is the blockchain ?',
    answer:
      'A blockchain is a continuously growing list of records, called blocks, which are linked and secured using cryptography. In other words, Blockchain is a digital ledger in which transactions made in bitcoin or another cryptocurrency are recorded chronologically and publicly. Check out this cool video to get a better understanding of how the blockchain works.',
    youtubeId: '6WG7D47tGb0',
  },
  {
    question: 'What is Bitcoin and what are cryptocurrencies ?',
    answer:
      'A cryptocurrency is a digital asset designed to work as a medium of exchange that uses cryptography to secure its transactions, to control the creation of additional units, and to verify the transfer of assets. Bitcoin is a cryptocurrency. It is the first decentralized digital currency, as the system works without a central bank or single administrator. Check out this cool video below that explains how cryptocurrencies work.',
    youtubeId: 'YIVAluSL9SU',
  },
  {
    question: 'How to buy and sell cryptocurrencies ?',
    answer:
      'Now that you have a basic understanding of what cryptocurrencies are, we take a look at buying and trading cryptocurrencies. Trading is the buying and selling of cryptocurrencies with the aim of getting a profit short term or long term. There are a number of marketplaces on the internet where cryptocurrencies can be bought and sold. To buy these Bitcoins there are a number of payment methods too wherein you can exchange your local currency for cryptocurrencies like Bitcoin on an online exchange. You can also sell your cryptocurrencies on these exchanges. Some example of online worldwide exchanges are Binance, Bittrex, Poloniex, Kucoin etc.',
  },
  {
    question: 'What is cryptocurrency mining and how to mine cryptocurrencies ?',
    answer:
      'Mining in the simplest of terms is the process of generating cryptocurrencies. Cryptocurrency mining is a process in which transactions for various forms of cryptocurrency are verified and added to the blockchain digital ledger. Each time a cryptocurrency transaction is made, a cryptocurrency miner is responsible for ensuring the authenticity of information and updating the blockchain with the transaction. The mining process itself involves competing with other cryptominers to solve complicated mathematical problems with cryptographic hash functions that are associated with a block containing the transaction data. The first cryptocurrency miner to crack the code is rewarded by being able to authorize the transaction, and in return for the service provided, cryptominers earn small amounts of cryptocurrency of their own. In order to be competitive with other cryptominers, though, a cryptocurrency miner needs a computer with specialized hardware.',
    youtubeId: 'GmOzih6I1zs',
  },
  {
    question: 'What are cryptocurrency wallets ?',
    answer:
      "Wallets are important for any user as this is where your cryptocurrencies are stored. It's quite crucial to read and research to choose a good cryptocurrency wallet to keep your cryptocurrencies safe. It's often said that it's better to keep your cryptocurrencies on hardware or software wallets where you control and keep the private keys safe, instead of keeping them on an online exchange which are often prone to hacks. There are different type of cryptocurrency wallets like software wallet, hardware wallet, web wallet and paper wallets.",
    youtubeId: 'd8IBpfs9bf4',
  },
  {
    question: 'What are NFTs ?',
    answer:
      'NFT stands for non-fungible token. A fungible item is an asset that can be readily interchanged - like money. But if something is non-fungible, then this is impossible which means it has unique properties so it cannot be interchanged with something else. It could be a unique painting, a house, a digital domain name which is one of a kind. NFTs are such "one-of-a-kind" asset in the digital world that can be traded, but they have no tangible form of any sort.',
    youtubeId: 'zpROwouRo_M',
  },
  {
    question: 'What is DEFI ?',
    answer:
      '"DeFi" stands for Decentralized Finance is a financial system that operates independently and does not rely on centralized financial intermediaries like banks, lenders or insurance funds. Instead, users have the ability to transfer, trade, invest, and transact peer to peer using cryptocurrencies via automated smart contracts, eliminating the need of centralized traditional systems.',
    youtubeId: 'k9HYC0EJU6E',
  },
];
