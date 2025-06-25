# Fury SDK

TypeScript SDK for creating, signing, and sending Solana transactions with `solana.fury.bot`.

## Table of Contents

- [Installation](#installation)
- [Initialization](#initialization)
- [Core Concepts](#core-concepts)
  - [Wallet](#wallet)
- [Functionality](#functionality)
  - [Get Quotes](#get-quotes)
  - [Buy Tokens](#buy-tokens)
  - [Sell Tokens](#sell-tokens)
  - [Create Tokens](#create-tokens)
  - [Consolidate SOL](#consolidate-sol)
  - [Distribute SOL](#distribute-sol)
  - [Mix SOL](#mix-sol)
  - [Transfer SOL and Tokens](#transfer-sol-and-tokens)
  - [Burn Tokens](#burn-tokens)
- [Running Examples](#running-examples)

## Installation

```bash
npm install fury-sdk
```

## Initialization

To start using the SDK, you need to initialize it with your API and RPC URLs.

```typescript
import { FurySDK } from 'fury-sdk';

const sdk = new FurySDK({
  apiUrl: 'https://solana.fury.bot', // Replace with your actual API URL
  rpcUrl: 'https://your-rpc-url.com', // Replace with your preferred RPC URL
  rateLimitDelay: 1000, // Optional: delay between requests in milliseconds
  debug: true // Optional: enable debug logging
});
```

## Core Concepts

### Wallet

The `Wallet` object is used to represent a Solana wallet and is required for most operations. It contains the private key and optionally an amount for certain operations.

```typescript
interface Wallet {
  privateKey: string; // Base58 encoded private key
  amount?: string; // Optional: amount in SOL or tokens
}
```

## Functionality

### Get Quotes

You can get buy and sell quotes for a specific token.

```typescript
// Get a buy quote for 0.1 SOL
const buyQuote = await sdk.getBuyQuote('TOKEN_ADDRESS', 0.1);
console.log('Buy quote:', buyQuote.result?.getSummary());

// Get a sell quote for 1,000,000 tokens
const sellQuote = await sdk.getSellQuote('TOKEN_ADDRESS', 1000000);
console.log('Sell quote:', sellQuote.result?.getSummary());
```

### Buy Tokens

You can buy tokens with a single wallet or in a batch with multiple wallets.

**Single Wallet Buy**

```typescript
import { TokenBuyConfig } from 'fury-sdk';

const buyerWallet: Wallet = {
  privateKey: 'YOUR_PRIVATE_KEY'
};

const config: TokenBuyConfig = {
  tokenAddress: 'TOKEN_ADDRESS',
  solAmount: 0.01, // Amount in SOL
  protocol: 'pumpfun', // or 'moonshot', 'raydium'
  slippageBps: 100, // 1% slippage
  jitoTipLamports: 5000 // Optional Jito tip
};

const result = await sdk.buyTokenSingle(buyerWallet, config);
```

**Batch Wallet Buy**

```typescript
const buyerWallets: Wallet[] = [
  { privateKey: 'PRIVATE_KEY_1' },
  { privateKey: 'PRIVATE_KEY_2' }
];

const result = await sdk.buyTokenBatch(buyerWallets, config);
```

### Sell Tokens

You can sell tokens with a single wallet or in a batch with multiple wallets.

**Single Wallet Sell**

```typescript
import { TokenSellConfig } from 'fury-sdk';

const sellerWallet: Wallet = {
  privateKey: 'YOUR_PRIVATE_KEY'
};

const config: TokenSellConfig = {
  tokenAddress: 'TOKEN_ADDRESS',
  sellPercent: 50, // Sell 50% of the token balance
  protocol: 'pumpfun', // or 'moonshot', 'raydium'
  slippageBps: 100, // 1% slippage
  jitoTipLamports: 5000 // Optional Jito tip
};

const result = await sdk.sellTokenSingle(sellerWallet, config);
```

**Batch Wallet Sell**

```typescript
const sellerWallets: Wallet[] = [
  { privateKey: 'PRIVATE_KEY_1' },
  { privateKey: 'PRIVATE_KEY_2' }
];

const result = await sdk.sellTokenBatch(sellerWallets, config);
```

### Create Tokens

You can create new tokens on different platforms like `pump`, `bonk`, `moon`, `cook`, `boop`.

```typescript
import { TokenCreateConfig, Platform } from 'fury-sdk';

const wallets: Wallet[] = [
  { privateKey: 'CREATOR_PRIVATE_KEY' },
  { privateKey: 'BUYER_1_PRIVATE_KEY' },
  { privateKey: 'BUYER_2_PRIVATE_KEY' }
];

const config: TokenCreateConfig = {
  platform: 'bonk' as Platform,
  metadata: {
    name: 'My Test Token',
    symbol: 'MTT',
    description: 'A test token created with FurySDK',
    image: 'https://example.com/token.png'
  },
  wallets: wallets.map(w => getWalletAddress(w.privateKey)),
  amounts: [0.01, 0.01, 0.01]
};

const result = await sdk.createTokenSingle(wallets, config);
```

### Consolidate SOL

Consolidate SOL from multiple source wallets into a single receiver wallet.

```typescript
const sourceWallets: Wallet[] = [
  { privateKey: 'SOURCE_1_PRIVATE_KEY' },
  { privateKey: 'SOURCE_2_PRIVATE_KEY' }
];

const receiverWallet: Wallet = {
  privateKey: 'RECEIVER_PRIVATE_KEY'
};

const percentage = 80; // Consolidate 80% of SOL from each source wallet

const result = await sdk.consolidateSOL(sourceWallets, receiverWallet, percentage);
```

### Distribute SOL

Distribute SOL from a sender wallet to multiple recipient wallets.

```typescript
const senderWallet: Wallet = {
  privateKey: 'SENDER_PRIVATE_KEY'
};

const recipientWallets: Wallet[] = [
  { privateKey: 'RECIPIENT_1_PRIVATE_KEY', amount: '0.01' },
  { privateKey: 'RECIPIENT_2_PRIVATE_KEY', amount: '0.02' }
];

const result = await sdk.distributeSOL(senderWallet, recipientWallets);
```

For larger batches, you can use `batchDistributeSOL`.

### Mix SOL

Mix SOL from a sender wallet to one or more recipient wallets.

```typescript
const senderWallet: Wallet = {
  privateKey: 'SENDER_PRIVATE_KEY'
};

const recipients: Wallet[] = [
  { privateKey: 'RECIPIENT_1_PRIVATE_KEY', amount: '0.02' },
  { privateKey: 'RECIPIENT_2_PRIVATE_KEY', amount: '0.015' }
];

const result = await sdk.batchMixSOL(senderWallet, recipients);
```

### Transfer SOL and Tokens

Transfer SOL or a specific token from a sender wallet to a receiver address.

**Transfer SOL**

```typescript
const senderWallet: Wallet = {
  privateKey: 'SENDER_PRIVATE_KEY'
};

const receiverAddress = 'RECEIVER_PUBLIC_KEY';

const result = await sdk.transferSOL(senderWallet, receiverAddress, '0.1'); // Transfer 0.1 SOL
```

**Transfer Tokens**

```typescript
const tokenAddress = 'TOKEN_MINT_ADDRESS';

const result = await sdk.transferToken(senderWallet, receiverAddress, tokenAddress, '100'); // Transfer 100 tokens
```

### Burn Tokens

Burn tokens from a wallet, permanently removing them from circulation.

**Single Token Burn**

```typescript
const wallet: Wallet = {
  privateKey: 'YOUR_PRIVATE_KEY'
};

const tokenAddress = 'TOKEN_MINT_ADDRESS';
const burnAmount = '100'; // Amount of tokens to burn

// Validate burn inputs first
const validation = sdk.validateTokenBurn(wallet, tokenAddress, burnAmount);
if (!validation.valid) {
  console.error('Burn validation failed:', validation.error);
  return;
}

const result = await sdk.burnToken(wallet, tokenAddress, burnAmount);
```

**Batch Token Burn**

```typescript
const burnOperations = [
  {
    tokenAddress: 'TOKEN_MINT_ADDRESS_1',
    amount: '50'
  },
  {
    tokenAddress: 'TOKEN_MINT_ADDRESS_2',
    amount: '25'
  }
];

const result = await sdk.batchBurnToken(wallet, burnOperations);
```

## Running Examples

This repository includes several example files that demonstrate the SDK's functionality. To run them:

1.  Clone the repository.
2.  Install the dependencies:

    ```bash
    npm install
    ```

3.  Each example file can be run directly using `ts-node`. For example, to run the buy example:

    ```bash
    npx ts-node buy-example.ts
    ```

    Make sure to replace the placeholder private keys and token addresses in the example files with your own.