# Fury API TypeScript SDK

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

A TypeScript SDK for interacting with the Fury API (solana.fury.bot) to perform various operations on the Solana blockchain, such as buying/selling tokens, creating tokens, managing wallets, and retrieving analytics.

**Disclaimer:** This SDK might be based on reverse-engineering or observation of the Fury API. Use at your own risk. Ensure you understand the implications of the actions you perform, especially regarding private key handling and transaction signing. The underlying API and its behavior may change without notice.

## Features

*   Fetch transactions for buying and selling SPL tokens (Pump.fun, Raydium, etc.).
*   Fetch transactions for creating new SPL tokens.
*   Fetch transactions for transferring, burning, and cleaning tokens.
*   Send signed transactions via Jito bundles or standard RPC.
*   Manage wallets: Distribute and consolidate SOL.
*   Retrieve PNL analytics for wallets and tokens.
*   Generate new mint keypairs via the API.
*   Utility function to sign transactions using `@solana/web3.js`.
*   Typed interfaces for API requests and responses.
*   Basic error handling for API and network issues.

## Prerequisites

*   Node.js (v18 or later recommended)
*   npm or yarn

## Installation (This Project Setup)

If you are working directly within this project repository:

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```
2.  Install dependencies:
    ```bash
    npm install
    # or
    yarn install
    ```

## Configuration

### Wallet Private Key

**SECURITY WARNING:** Never commit your private keys to version control or expose them publicly.

The example script (`example.ts`) prompts for your wallet's base58 private key via the command line. For more secure applications, consider using environment variables or a dedicated secrets management solution:

1.  Create a `.env` file in the project root (this file is ignored by Git via `.gitignore`).
2.  Add your private key:
    ```dotenv
    # .env
    WALLET_PRIVATE_KEY=YourBase58PrivateKeyHere
    ```
3.  Use a library like `dotenv` to load this variable in your script:
    ```bash
    npm install dotenv
    # or
    yarn add dotenv
    ```
    ```typescript
    import * as dotenv from 'dotenv';
    dotenv.config(); // Load .env file

    const privateKey = process.env.WALLET_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error("Missing WALLET_PRIVATE_KEY in .env file");
    }
    // ... load keypair using privateKey
    ```
