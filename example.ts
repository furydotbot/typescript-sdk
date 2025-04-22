import { FurySDK, Protocol, signTransactions, BuyTokenRequest, SellRequest, TransactionSendRequest, isRpcSendResponse, FuryError } from './furySdk'; // Adjust path if needed
import { Keypair } from '@solana/web3.js';
import * as readline from 'node:readline/promises'; // For reading input
import { stdin as input, stdout as output } from 'node:process';
import bs58 from 'bs58';
// Helper function to load Keypair from Base58 private key
function loadKeypairFromBase58(base58PrivateKey: string): Keypair {
    try {
        const secretKeyBytes = bs58.decode(base58PrivateKey);
        // Important: Solana Keypair expects a 64-byte array (secret + public)
        // If the input is just the 32-byte secret, create the Keypair from the secret key part.
        if (secretKeyBytes.length === 64) {
             return Keypair.fromSecretKey(secretKeyBytes);
        } else if (secretKeyBytes.length === 32) {
             // Handle cases where only the 32-byte secret might be provided
             // (less common for user input but possible)
             console.warn("Provided key seems to be 32 bytes (secret only), deriving full keypair.");
             return Keypair.fromSecretKey(secretKeyBytes); // fromSecretKey handles 32 or 64 bytes correctly
        } else {
            throw new Error(`Invalid secret key length: ${secretKeyBytes.length}. Expected 32 or 64 bytes.`);
        }
    } catch (e) {
        console.error("Failed to decode base58 private key:", e);
        throw new Error("Invalid base58 private key provided.");
    }
}


async function main() {
    const rl = readline.createInterface({ input, output });
    let privateKey = '';
    try {
        privateKey = await rl.question('Enter wallet private key (base58): ');
    } finally {
        rl.close();
    }

    if (!privateKey) {
        console.error("Private key is required.");
        return;
    }

    let wallet: Keypair;
    try {
        wallet = loadKeypairFromBase58(privateKey.trim());
        console.log(`Using wallet: ${wallet.publicKey.toBase58()}`);
    } catch (error) {
        console.error("Failed to load wallet:", error);
        return;
    }

    const client = new FurySDK(); // Uses default base URL

    // --- Example: Health Check ---
    try {
        console.log("\nChecking API Health...");
        const health = await client.healthCheck();
        console.log("Health Check Response:", health);
    } catch (error) {
        console.error("Health Check Failed:", error instanceof FuryError ? error.message : error);
    }

    // --- Example: Buy Token (Commented out by default) ---

    try {
        console.log("\nAttempting to get buy transactions...");
        const buyRequest: BuyTokenRequest = {
            walletAddresses: [wallet.publicKey.toBase58()],
            // Use a Devnet token or a safe mainnet one for testing if needed
            tokenAddress: "Bq5nFQ82jBYcFKRzUSximpCmCg5t8L8tVMqsn612pump", // Replace with actual token
            solAmount: 0.001, // Small amount for testing
            protocol: Protocol.Pumpfun,
            jitoTipLamports: 10000, // Example tip (0.00001 SOL)
            // slippageBps: 50, // Example: 0.5% slippage
        };
        const buyResponse = await client.buyToken(buyRequest);
        console.log("Buy Token Response:", buyResponse);

        if (buyResponse.success && buyResponse.transactions.length > 0) {
            console.log("\nSigning buy transactions...");
            const signedBuyTxs = await signTransactions(buyResponse.transactions, [wallet]);
            console.log("Signed Buy Transactions (base58):", signedBuyTxs);

            console.log("\nSending buy transactions (using Jito)...");
            const sendBuyRequest: TransactionSendRequest = {
                transactions: signedBuyTxs,
                useRpc: false, // Use Jito
            };
            const sendBuyResponse = await client.sendTransaction(sendBuyRequest);
            console.log("Send Buy Transaction Response:", sendBuyResponse);
            // You would typically monitor the Jito bundle or RPC tx signatures here
        }
    } catch (error) {
         if (error instanceof FuryError) {
             console.error("Buy Token Flow Error:", error.message);
             if(error.apiError) console.error("API Error Details:", error.apiError);
         } else {
             console.error("Buy Token Flow Error:", error);
         }
    }

    // --- Example: Sell Token (Commented out by default) ---
    /*
     try {
        console.log("\nAttempting to get sell transactions...");
        const sellRequest: SellRequest = {
            walletAddresses: [wallet.publicKey.toBase58()],
            tokenAddress: "Bq5nFQ82jBYcFKRzUSximpCmCg5t8L8tVMqsn612pump", // Replace with actual token
            percentage: 100, // Sell 100%
            protocol: Protocol.Pumpfun,
        };
        const sellResponse = await client.sellToken(sellRequest);
        console.log("Sell Token Response:", sellResponse);

        if (sellResponse.success && sellResponse.transactions.length > 0) {
            console.log("\nSigning sell transactions...");
            const signedSellTxs = await signTransactions(sellResponse.transactions, [wallet]);
            console.log("Signed Sell Transactions (base58):", signedSellTxs);

            console.log("\nSending sell transactions (using RPC)...");
             const sendSellRequest: TransactionSendRequest = {
                transactions: signedSellTxs,
                useRpc: true, // Use RPC
            };
            const sendSellResponse = await client.sendTransaction(sendSellRequest);
            console.log("Send Sell Transaction Response:", sendSellResponse);

            if (isRpcSendResponse(sendSellResponse)) {
                console.log("RPC Signatures:", sendSellResponse.result.rpc);
                // You would typically monitor these signatures on an explorer
            }
        }
    } catch (error) {
         if (error instanceof FuryError) {
             console.error("Sell Token Flow Error:", error.message);
             if(error.apiError) console.error("API Error Details:", error.apiError);
         } else {
             console.error("Sell Token Flow Error:", error);
         }
    }
    */

   // --- Example: Get PNL (Commented out by default) ---
    /*
    try {
        console.log("\nFetching PNL...");
        const pnlResponse = await client.analyticsPnl(
            [wallet.publicKey.toBase58()], // Can add more addresses
            "Bq5nFQ82jBYcFKRzUSximpCmCg5t8L8tVMqsn612pump", // Replace token address
            { includeTimestamp: true }
        );
        console.log("PNL Response:", JSON.stringify(pnlResponse, null, 2));
    } catch (error) {
        if (error instanceof FuryError) {
            console.error("PNL Error:", error.message);
            if(error.apiError) console.error("API Error Details:", error.apiError);
        } else {
            console.error("PNL Error:", error);
        }
    }
    */

   // --- Example: Generate Mint Address (Commented out by default) ---
   /*
   try {
        console.log("\nGenerating Mint Address...");
        const mintResponse = await client.generateMint();
        console.log("Generated Mint Response:", mintResponse);
   } catch (error) {
       if (error instanceof FuryError) {
            console.error("Generate Mint Error:", error.message);
            if(error.apiError) console.error("API Error Details:", error.apiError);
        } else {
            console.error("Generate Mint Error:", error);
        }
   }
   */

}

main().catch(error => {
    console.error("\nUnhandled Exception in main:", error);
});