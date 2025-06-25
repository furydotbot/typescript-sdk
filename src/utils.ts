import { Keypair, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';

// Define interface for bundle result
export interface BundleResult {
  jsonrpc: string;
  id: number;
  result?: string;
  error?: {
    code: number;
    message: string;
  };
}

import { SDKConfig } from './types';

// Default configuration
let config: SDKConfig = {
  baseUrl: '',
  apiUrl: '',
  debug: false
};

/**
 * Configure the SDK with base URL and other settings
 */
export const configure = (newConfig: SDKConfig): void => {
  config = { ...config, ...newConfig };
};

/**
 * Get the current configuration
 */
export const getConfig = (): SDKConfig => config;

/**
 * Debug logging utility - only logs when debug is enabled
 */
export const debugLog = (...args: any[]): void => {
  if (config.debug) {
    console.log(...args);
  }
};

/**
 * Debug error logging utility - only logs when debug is enabled
 */
export const debugError = (...args: any[]): void => {
  if (config.debug) {
    console.error(...args);
  }
};

/**
 * Send bundle to Jito block engine via backend proxy
 */
export const sendBundle = async (encodedBundle: string[]): Promise<BundleResult> => {
  try {
    // Use apiUrl if available, fallback to baseUrl for backward compatibility
    const apiUrl = (config.apiUrl || config.baseUrl)?.replace(/\/+$/, '') || '';
    
    if (!apiUrl) {
      throw new Error('API URL not configured. Please call configure() with apiUrl or baseUrl first.');
    }
    
    // Send to our backend proxy instead of directly to Jito
    debugLog('🔗 [DEBUG] Sending bundle to:', `${apiUrl}/api/transactions/send`);
    debugLog('📦 [DEBUG] Bundle payload:', { transactions: encodedBundle });
    
    const response = await fetch(`${apiUrl}/api/transactions/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactions: encodedBundle
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      debugError('❌ [DEBUG] Send bundle API error:', errorText);
      throw new Error(`HTTP error! Status: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json() as any;
    debugLog('✅ [DEBUG] Send bundle API response:', data);
    
    // Handle different response formats
    if (data.result !== undefined) {
      return data.result as BundleResult;
    } else if (data.success !== undefined) {
      // If the response has success field, return the whole response as result
      return data as BundleResult;
    } else {
      // Return the data as-is if no specific format
      return data as BundleResult;
    }
  } catch (error) {
    debugError('Error sending bundle:', error);
    throw error;
  }
};

/**
 * Complete transaction signing with sender and recipient keys
 */
export const completeTransactionSigning = (
  TransactionsBase58: string[], 
  senderKeypair: Keypair,
  recipientKeypairs: Map<string, Keypair>
): string[] => {
  try {
    return TransactionsBase58.map(txBase58 => {
      // Deserialize transaction
      const txBuffer = bs58.decode(txBase58);
      const transaction = VersionedTransaction.deserialize(txBuffer);
      
      // Extract transaction message to determine required signers
      const message = transaction.message;
      const requiredSigners: Keypair[] = [];
      
      // Check which accounts are required signers by examining the transaction message
      // Only add keypairs for accounts that are actually required signers
      const signerKeys = message.staticAccountKeys.slice(0, message.header.numRequiredSignatures);
      
      for (const accountKey of signerKeys) {
        const pubkeyStr = accountKey.toBase58();
        if (pubkeyStr === senderKeypair.publicKey.toBase58()) {
          requiredSigners.push(senderKeypair);
        } else if (recipientKeypairs.has(pubkeyStr)) {
          requiredSigners.push(recipientKeypairs.get(pubkeyStr)!);
        }
      }
      
      // If no required signers found, default to sender (this shouldn't happen in normal cases)
      if (requiredSigners.length === 0) {
        requiredSigners.push(senderKeypair);
      }
      
      // Complete the signing for the transaction
      transaction.sign(requiredSigners);
      
      // Serialize and encode the fully signed transaction
      return bs58.encode(transaction.serialize());
    });
  } catch (error) {
    console.error('Error completing transaction signing:', error);
    throw error;
  }
};

/**
 * Create keypair from private key string
 */
export const createKeypairFromPrivateKey = (privateKey: string): Keypair => {
  return Keypair.fromSecretKey(bs58.decode(privateKey));
};

/**
 * Create a map of public keys to keypairs for efficient lookups
 */
export const createKeypairMap = (wallets: { privateKey: string }[]): Map<string, Keypair> => {
  const keypairMap = new Map<string, Keypair>();
  wallets.forEach(wallet => {
    const keypair = createKeypairFromPrivateKey(wallet.privateKey);
    keypairMap.set(keypair.publicKey.toBase58(), keypair);
  });
  return keypairMap;
};

/**
 * Prepare distribution bundles from signed transactions with max 5 transactions per bundle
 */
export const prepareTransactionBundles = (signedTransactions: string[]): { transactions: string[] }[] => {
  const MAX_TRANSACTIONS_PER_BUNDLE = 5;
  const bundles: { transactions: string[] }[] = [];
  
  for (let i = 0; i < signedTransactions.length; i += MAX_TRANSACTIONS_PER_BUNDLE) {
    bundles.push({
      transactions: signedTransactions.slice(i, i + MAX_TRANSACTIONS_PER_BUNDLE)
    });
  }
  
  return bundles;
};

/**
 * Add delay between operations
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Validate wallet data
 */
export const validateWallet = (wallet: { privateKey: string }): boolean => {
  return !!wallet.privateKey;
};

/**
 * Get SOL balance for a wallet
 */
export const getWalletBalance = async (privateKey: string, rpcUrl: string): Promise<number> => {
  try {
    const { Connection, LAMPORTS_PER_SOL } = await import('@solana/web3.js');
    const connection = new Connection(rpcUrl);
    const keypair = createKeypairFromPrivateKey(privateKey);
    const balance = await connection.getBalance(keypair.publicKey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    throw error;
  }
};

/**
 * Get wallet address from private key
 */
export const getWalletAddress = (privateKey: string): string => {
  const keypair = createKeypairFromPrivateKey(privateKey);
  return keypair.publicKey.toBase58();
};

/**
 * Validate amount string
 */
export const validateAmount = (amount: string): boolean => {
  return !isNaN(parseFloat(amount)) && parseFloat(amount) > 0;
};