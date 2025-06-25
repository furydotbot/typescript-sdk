import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { getConfig, sendBundle, completeTransactionSigning, delay, validateWallet, createKeypairFromPrivateKey, validateAmount, debugLog, debugError } from '../utils';
import { ApiResponse, Wallet, BundleResult, ValidationResult, Bundle } from '../types';

// Constants
const MAX_BUNDLES_PER_SECOND = 2;

// Rate limiting state
const rateLimitState = {
  count: 0,
  lastReset: Date.now(),
  maxBundlesPerSecond: MAX_BUNDLES_PER_SECOND
};

// Supported protocols
export type Protocol = 'pumpfun' | 'moonshot' | 'launchpad' | 'raydium' | 'pumpswap' | 'jupiter' | 'boopfun';

// Interfaces
export interface TokenBuyConfig {
  tokenAddress: string;
  solAmount: number;
  protocol: Protocol;
  slippageBps?: number; // Slippage in basis points (e.g., 100 = 1%)
  jitoTipLamports?: number; // Custom Jito tip
}

// Use Bundle interface from types.ts instead of TokenBuyBundle
export type TokenBuyBundle = Bundle;

/**
 * Check rate limit and wait if necessary
 */
const checkRateLimit = async (): Promise<void> => {
  const now = Date.now();
  
  if (now - rateLimitState.lastReset >= 1000) {
    rateLimitState.count = 0;
    rateLimitState.lastReset = now;
  }
  
  if (rateLimitState.count >= rateLimitState.maxBundlesPerSecond) {
    const waitTime = 1000 - (now - rateLimitState.lastReset);
    await delay(waitTime);
    rateLimitState.count = 0;
    rateLimitState.lastReset = Date.now();
  }
  
  rateLimitState.count++;
};



/**
 * Get partially prepared transactions from backend
 */
const getTokenBuyTransactions = async (
  walletAddresses: string[], 
  tokenConfig: TokenBuyConfig,
  customAmounts?: number[]
): Promise<Bundle[]> => {
  try {
    const config = getConfig();
    const baseUrl = config.apiUrl?.replace(/\/+$/, '');
    
    debugLog('🔗 [DEBUG] Getting token buy transactions from:', `${baseUrl}/api/tokens/buy`);
    debugLog('📦 [DEBUG] Request payload:', {
      walletAddresses,
      tokenAddress: tokenConfig.tokenAddress,
      protocol: tokenConfig.protocol,
      solAmount: tokenConfig.solAmount,
      amounts: customAmounts,
      slippageBps: tokenConfig.slippageBps || 100,
      jitoTipLamports: tokenConfig.jitoTipLamports || 5000
    });
    
    const response = await fetch(`${baseUrl}/api/tokens/buy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        walletAddresses,
        tokenAddress: tokenConfig.tokenAddress,
        protocol: tokenConfig.protocol,
        solAmount: tokenConfig.solAmount,
        amounts: customAmounts, // Optional custom amounts per wallet
        slippageBps: tokenConfig.slippageBps || 100, // Default 1% slippage
        jitoTipLamports: tokenConfig.jitoTipLamports || 5000 // Default tip
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      debugError('❌ [DEBUG] API Error Response:', errorText);
      throw new Error(`HTTP error! Status: ${response.status} - ${errorText}`);
    }

    const data: any = await response.json();
    debugLog('✅ [DEBUG] Token buy API response:', data);
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to get token buy transactions');
    }
    
    // Handle different response formats
    if (data.bundles && Array.isArray(data.bundles)) {
      return data.bundles.map((bundle: any) =>
        Array.isArray(bundle) ? { transactions: bundle } : bundle
      );
    } else if (data.transactions && Array.isArray(data.transactions)) {
      // Split transactions into multiple bundles if more than 5 transactions
      const transactions = data.transactions;
      const maxTransactionsPerBundle = 5;
      const bundles: TokenBuyBundle[] = [];
      
      for (let i = 0; i < transactions.length; i += maxTransactionsPerBundle) {
        const chunk = transactions.slice(i, i + maxTransactionsPerBundle);
        bundles.push({ transactions: chunk });
      }
      
      console.log(`📦 Split ${transactions.length} transactions into ${bundles.length} bundles (max ${maxTransactionsPerBundle} per bundle)`);
      return bundles;
    } else if (Array.isArray(data)) {
      // Split array data into multiple bundles if more than 5 transactions
      const transactions = data;
      const maxTransactionsPerBundle = 5;
      const bundles: TokenBuyBundle[] = [];
      
      for (let i = 0; i < transactions.length; i += maxTransactionsPerBundle) {
        const chunk = transactions.slice(i, i + maxTransactionsPerBundle);
        bundles.push({ transactions: chunk });
      }
      
      console.log(`📦 Split ${transactions.length} transactions into ${bundles.length} bundles (max ${maxTransactionsPerBundle} per bundle)`);
      return bundles;
    } else {
      throw new Error('No transactions returned from backend');
    }
  } catch (error) {
    debugError('Error getting token buy transactions:', error);
    throw error;
  }
};

/**
 * Complete bundle signing with wallet keypairs using utils function
 */
const completeBundleSigning = (
  bundle: Bundle, 
  walletKeypairs: Keypair[]
): Bundle => {
  if (!bundle.transactions || !Array.isArray(bundle.transactions)) {
    console.error("Invalid bundle format, transactions property is missing or not an array:", bundle);
    return { transactions: [] };
  }

  // Create a map of public keys to keypairs for the utils function
  const keypairMap = new Map<string, Keypair>();
  walletKeypairs.forEach(kp => {
    keypairMap.set(kp.publicKey.toBase58(), kp);
  });
  
  // Use the first keypair as sender (primary signer)
  const senderKeypair = walletKeypairs[0];
  
  // Use completeTransactionSigning from utils
  const signedTransactions = completeTransactionSigning(
    bundle.transactions,
    senderKeypair,
    keypairMap
  );
  
  return { transactions: signedTransactions };
};

/**
 * Execute token buy operation for a single wallet
 */
export const buyTokenSingle = async (
  wallet: Wallet,
  tokenConfig: TokenBuyConfig
): Promise<ApiResponse<BundleResult[]>> => {
  try {
    console.log(`🚀 Starting single token buy for ${tokenConfig.protocol} protocol`);
    console.log(`📝 Token: ${tokenConfig.tokenAddress}`);
    console.log(`💰 Amount: ${tokenConfig.solAmount} SOL`);
    
    // Validate inputs
    const validation = validateTokenBuyInputs([wallet], tokenConfig);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }
    
    // Get wallet address from private key
    const keypair = Keypair.fromSecretKey(bs58.decode(wallet.privateKey));
    const walletAddress = keypair.publicKey.toBase58();
    
    // Step 1: Get partially prepared transactions from backend
    const partiallyPreparedBundles = await getTokenBuyTransactions(
      [walletAddress],
      tokenConfig
    );
    console.log(`📦 Received ${partiallyPreparedBundles.length} bundles from backend`);
    
    // Step 2: Complete transaction signing
    const signedBundles = partiallyPreparedBundles.map(bundle =>
      completeBundleSigning(bundle, [keypair])
    );
    console.log(`✍️  Completed signing for ${signedBundles.length} bundles`);
    
    // Step 3: Send bundles with rate limiting
    const results: BundleResult[] = [];
    for (let i = 0; i < signedBundles.length; i++) {
      const bundle = signedBundles[i];
      console.log(`📤 Sending bundle ${i + 1}/${signedBundles.length} with ${bundle.transactions.length} transactions`);
      
      await checkRateLimit();
      const result = await sendBundle(bundle.transactions);
      results.push(result);
      
      // Add delay between bundles (except after the last one)
      if (i < signedBundles.length - 1) {
        await delay(500);
      }
    }
    
    console.log(`✅ Successfully completed token buy operation`);
    return {
      success: true,
      result: results
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Token buy error:', errorMessage);
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Execute token buy operation for multiple wallets (batch)
 */
export const buyTokenBatch = async (
  wallets: Wallet[],
  tokenConfig: TokenBuyConfig,
  customAmounts?: number[]
): Promise<ApiResponse<BundleResult[][]>> => {
  try {
    console.log(`🚀 Starting batch token buy for ${tokenConfig.protocol} protocol`);
    console.log(`📝 Token: ${tokenConfig.tokenAddress}`);
    console.log(`👥 Wallets: ${wallets.length}`);
    console.log(`💰 Amount: ${tokenConfig.solAmount} SOL per wallet`);
    
    // Validate inputs
    const validation = validateTokenBuyInputs(wallets, tokenConfig);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }
    
    // Create keypairs and extract addresses
    const walletKeypairs = wallets.map(wallet => 
      Keypair.fromSecretKey(bs58.decode(wallet.privateKey))
    );
    const walletAddresses = walletKeypairs.map(kp => kp.publicKey.toBase58());
    
    // Step 1: Get partially prepared transactions from backend
    const partiallyPreparedBundles = await getTokenBuyTransactions(
      walletAddresses,
      tokenConfig,
      customAmounts
    );
    console.log(`📦 Received ${partiallyPreparedBundles.length} bundles from backend`);
    
    // Step 2: Complete transaction signing
    const signedBundles = partiallyPreparedBundles.map(bundle =>
      completeBundleSigning(bundle, walletKeypairs)
    );
    console.log(`✍️  Completed signing for ${signedBundles.length} bundles`);
    
    // Step 3: Send bundles with rate limiting
    const results: BundleResult[][] = [];
    for (let i = 0; i < signedBundles.length; i++) {
      const bundle = signedBundles[i];
      console.log(`📤 Sending bundle ${i + 1}/${signedBundles.length} with ${bundle.transactions.length} transactions`);
      
      await checkRateLimit();
      const result = await sendBundle(bundle.transactions);
      results.push([result]); // Wrap in array for consistency
      
      // Add delay between bundles (except after the last one)
      if (i < signedBundles.length - 1) {
        await delay(500);
      }
    }
    
    console.log(`✅ Successfully completed batch token buy operation`);
    return {
      success: true,
      result: results
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Batch token buy error:', errorMessage);
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Validate token buy inputs
 */
export const validateTokenBuyInputs = (
  wallets: Wallet[],
  tokenConfig: TokenBuyConfig
): ValidationResult => {
  // Check if token config is valid
  if (!tokenConfig.tokenAddress) {
    return { valid: false, error: 'Invalid token address' };
  }
  
  if (!validateAmount(tokenConfig.solAmount.toString())) {
    return { valid: false, error: 'Invalid SOL amount' };
  }
  
  // Validate protocol
  const supportedProtocols: Protocol[] = ['pumpfun', 'moonshot', 'launchpad', 'raydium', 'pumpswap', 'jupiter', 'boopfun'];
  if (!supportedProtocols.includes(tokenConfig.protocol)) {
    return { valid: false, error: `Unsupported protocol: ${tokenConfig.protocol}. Supported: ${supportedProtocols.join(', ')}` };
  }
  
  // Check if wallets are valid
  if (!wallets.length) {
    return { valid: false, error: 'No wallets provided' };
  }
  
  for (const wallet of wallets) {
    if (!validateWallet(wallet)) {
      return { valid: false, error: 'Invalid wallet private key' };
    }
    
    try {
      // Validate private key format using utils function
      createKeypairFromPrivateKey(wallet.privateKey);
    } catch (error) {
      return { valid: false, error: 'Invalid private key format' };
    }
  }
  
  return { valid: true };
};