import bs58 from 'bs58';
import { getConfig, sendBundle, completeTransactionSigning, delay, validateWallet, createKeypairFromPrivateKey, validateAmount, debugLog, debugError } from '../utils';
import { ApiResponse, Wallet, BundleResult, ValidationResult, Bundle } from '../types';
import { Keypair } from '@solana/web3.js';

// Constants
const MAX_BUNDLES_PER_SECOND = 2;

// Rate limiting state
const rateLimitState = {
  count: 0,
  lastReset: Date.now(),
  maxBundlesPerSecond: MAX_BUNDLES_PER_SECOND
};

// Supported platforms
export type Platform = 'pump' | 'moon' | 'bonk' | 'cook' | 'boop';

// Token metadata interface
export interface TokenMetadata {
  name: string;
  symbol: string;
  image: string;
  description?: string;
  twitter?: string;
  telegram?: string;
  website?: string;
  decimals?: number;
}

// Platform configuration interface
export interface PlatformConfig {
  type?: 'meme' | 'tech'; // For Bonk platform
  rpcUrl?: string;
  trading?: {
    slippageBps?: number;
  };
  jito?: {
    tipAmount?: number;
  };
}

// Token creation configuration interface
export interface TokenCreateConfig {
  platform: Platform;
  metadata: TokenMetadata;
  wallets: string[];
  amounts: number[] | number;
  platformConfig?: PlatformConfig;
}

// Token creation bundle type
export type TokenCreateBundle = Bundle;

// Token creation result interface
export interface TokenCreateResult {
  success: boolean;
  mintAddress?: string;
  transactions?: string[];
  error?: string;
}

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
 * Validate token creation inputs
 */
export const validateTokenCreateInputs = (
  wallets: Wallet[],
  config: TokenCreateConfig
): ValidationResult => {
  try {
    // Validate wallets
    if (!wallets || wallets.length === 0) {
      return { valid: false, error: 'At least one wallet is required' };
    }

    if (wallets.length > 5) {
      return { valid: false, error: 'Maximum 5 wallets allowed' };
    }

    // Validate each wallet
    for (let i = 0; i < wallets.length; i++) {
      const isValidWallet = validateWallet(wallets[i]);
      if (!isValidWallet) {
        return { valid: false, error: `Wallet ${i + 1}: Invalid private key format` };
      }
    }

    // Validate platform
    if (!config.platform) {
      return { valid: false, error: 'Platform is required' };
    }

    const supportedPlatforms: Platform[] = ['pump', 'moon', 'bonk', 'cook', 'boop'];
    if (!supportedPlatforms.includes(config.platform)) {
      return { valid: false, error: `Unsupported platform: ${config.platform}. Supported platforms: ${supportedPlatforms.join(', ')}` };
    }

    // Validate metadata
    if (!config.metadata) {
      return { valid: false, error: 'Token metadata is required' };
    }

    if (!config.metadata.name || !config.metadata.symbol || !config.metadata.image) {
      return { valid: false, error: 'Token name, symbol, and image are required' };
    }

    // Validate amounts
    if (Array.isArray(config.amounts)) {
      for (let i = 0; i < config.amounts.length; i++) {
        if (config.amounts[i] <= 0) {
          return { valid: false, error: `Amount ${i + 1}: must be greater than 0` };
        }
      }
    } else {
      if (config.amounts <= 0) {
        return { valid: false, error: 'Amount must be greater than 0' };
      }
    }

    // Validate wallet addresses
    if (!config.wallets || config.wallets.length === 0) {
      return { valid: false, error: 'At least one wallet address is required' };
    }

    if (config.wallets.length !== wallets.length) {
      return { valid: false, error: 'Number of wallet addresses must match number of wallets' };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: `Validation error: ${error}` };
  }
};

/**
 * Get token creation transactions from backend
 */
const getTokenCreateTransactions = async (
  config: TokenCreateConfig
): Promise<Bundle[]> => {
  try {
    const sdkConfig = getConfig();
    const baseUrl = sdkConfig.apiUrl?.replace(/\/+$/, '');
    
    debugLog('🔗 [DEBUG] Getting token creation transactions from:', `${baseUrl}/api/create`);
    debugLog('📦 [DEBUG] Request payload:', config);
    
    const response = await fetch(`${baseUrl}/api/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      const errorText = await response.text();
      debugError('❌ [DEBUG] API Error Response:', errorText);
      throw new Error(`HTTP error! Status: ${response.status} - ${errorText}`);
    }

    const data: any = await response.json();
    debugLog('✅ [DEBUG] Token creation API response:', data);
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to get token creation transactions');
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
      const bundles: TokenCreateBundle[] = [];
      
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
      const bundles: TokenCreateBundle[] = [];
      
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
    debugError('Error getting token creation transactions:', error);
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
  
  // Use the first keypair as sender (creator)
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
 * Create token with single configuration
 */
export const createTokenSingle = async (
  wallets: Wallet[],
  config: TokenCreateConfig
): Promise<ApiResponse<BundleResult[]>> => {
  try {
    console.log(`🚀 Starting token creation on ${config.platform} platform`);
    console.log(`📝 Token: ${config.metadata.name} (${config.metadata.symbol})`);
    console.log(`👥 Wallets: ${wallets.length}`);
    
    // Validate inputs
    const validation = validateTokenCreateInputs(wallets, config);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }
    
    // Check rate limit
    await checkRateLimit();
    
    // Get transaction bundles from backend
    const bundles = await getTokenCreateTransactions(config);
    console.log(`📦 Received ${bundles.length} bundles from backend`);
    
    if (!bundles || bundles.length === 0) {
      return {
        success: false,
        error: 'No transaction bundles received from backend'
      };
    }
    
    // Create keypairs from private keys
    const walletKeypairs = wallets.map(wallet => createKeypairFromPrivateKey(wallet.privateKey));
    console.log(`🔑 Created ${walletKeypairs.length} keypairs from wallets`);
    
    const results: BundleResult[] = [];
    
    // Process each bundle
    for (let i = 0; i < bundles.length; i++) {
      const bundle = bundles[i];
      console.log(`🔄 Processing bundle ${i + 1}/${bundles.length} with ${bundle.transactions.length} transactions`);
      console.log(`📋 Bundle ${i + 1} transactions:`, bundle.transactions.map((tx, idx) => `${idx}: ${tx.substring(0, 20)}...`));
      
      try {
        // Complete signing for this bundle
        const signedBundle = completeBundleSigning(bundle, walletKeypairs);
        console.log(`✅ Bundle ${i + 1} signed successfully with ${signedBundle.transactions.length} transactions`);
        console.log(`📋 Signed bundle ${i + 1} transactions:`, signedBundle.transactions.map((tx, idx) => `${idx}: ${tx.substring(0, 20)}...`));
        
        // Send the bundle
        const bundleResult = await sendBundle(signedBundle.transactions);
        console.log(`🚀 Bundle ${i + 1} sent:`, bundleResult);
        
        results.push(bundleResult);
      } catch (error) {
         console.error(`❌ Error processing bundle ${i + 1}:`, error);
         results.push({
           jsonrpc: '2.0',
           id: i,
           error: {
             code: -1,
             message: error instanceof Error ? error.message : 'Unknown error'
           }
         } as BundleResult);
      }
      
      // Add delay between bundles to respect rate limits
      if (i < bundles.length - 1) {
        await delay(100);
      }
    }
    
    return {
      success: true,
      result: results
    };
    
  } catch (error) {
    console.error('❌ Token creation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Create tokens in batch with multiple configurations
 */
export const createTokenBatch = async (
  walletConfigs: { wallets: Wallet[], config: TokenCreateConfig }[]
): Promise<ApiResponse<BundleResult[][]>> => {
  try {
    console.log(`🚀 Starting batch token creation for ${walletConfigs.length} configurations`);
    
    const allResults: BundleResult[][] = [];
    
    for (let i = 0; i < walletConfigs.length; i++) {
      const { wallets, config } = walletConfigs[i];
      console.log(`\n📦 Processing configuration ${i + 1}/${walletConfigs.length}`);
      
      const result = await createTokenSingle(wallets, config);
      
      if (result.success && result.result) {
        allResults.push(result.result);
      } else {
        console.error(`❌ Configuration ${i + 1} failed:`, result.error);
        // Add empty result to maintain array structure
        allResults.push([]);
      }
      
      // Add delay between configurations
      if (i < walletConfigs.length - 1) {
        await delay(500);
      }
    }
    
    return {
      success: true,
      result: allResults
    };
    
  } catch (error) {
    console.error('❌ Batch token creation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};