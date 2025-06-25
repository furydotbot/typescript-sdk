import {
  sendBundle,
  completeTransactionSigning,
  createKeypairFromPrivateKey,
  prepareTransactionBundles,
  delay,
  validateWallet,
  validateAmount,
  getConfig,
  getWalletAddress,
  debugLog,
  debugError
} from '../utils';
import {
  Wallet,
  ValidationResult,
  ApiResponse,
  BatchResult,
  BundleResult
} from '../types';

/**
 * Burn configuration interface
 */
export interface BurnConfig {
  walletPublicKey: string;
  tokenAddress: string;
  amount: string;
}

/**
 * Burn result interface
 */
export interface BurnResult {
  success: boolean;
  transactions: string[];
}

/**
 * Get burn transaction from backend
 * The backend will create the transaction for burning tokens
 */
const getBurnTransaction = async (
  config: BurnConfig
): Promise<BurnResult> => {
  try {
    const sdkConfig = getConfig();
    const apiUrl = sdkConfig.apiUrl?.replace(/\/+$/, '');
    
    if (!apiUrl) {
      throw new Error('API URL not configured. Please call configure() with apiUrl first.');
    }
    
    // Prepare request payload
    const requestPayload = {
      walletPublicKey: config.walletPublicKey,
      tokenAddress: config.tokenAddress,
      amount: config.amount
    };
    
    // Debug: Log request payload
    debugLog('🔍 [DEBUG] Burn API Request:');
    debugLog('   URL:', `${apiUrl}/api/tokens/burn`);
    debugLog('   Payload:', JSON.stringify(requestPayload, null, 2));
    
    const response = await fetch(`${apiUrl}/api/tokens/burn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload),
    });

    debugLog('Burn API request sent, status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      debugError(`HTTP error! Status: ${response.status}, Body: ${errorText}`);
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json() as any;
    
    // Debug: Log response data
    debugLog('Burn API Response received successfully');
    debugLog('   Success:', data.success);
    debugLog('   Transactions Count:', data.data?.transactions?.length || 0);
    if (data.error) {
      debugLog('   Error:', data.error);
    }
    if (data.data?.transactions) {
      debugLog('   Transaction IDs:', data.data.transactions.map((tx: string, i: number) => `${i + 1}: ${tx.substring(0, 20)}...`));
    }
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to get partially prepared transactions');
    }
    
    if (!data.data?.transactions || data.data.transactions.length === 0) {
      throw new Error('No transactions received from API');
    }
    
    return {
      success: true,
      transactions: data.data.transactions
    };
  } catch (error) {
    debugError('Error getting burn transaction:', error);
    throw error;
  }
};

/**
 * Validate burn inputs
 */
export const validateBurnInputs = (
  wallet: Wallet,
  tokenAddress: string,
  amount: string
): ValidationResult => {
  // Check if wallet is valid
  if (!validateWallet(wallet)) {
    return { valid: false, error: 'Invalid wallet' };
  }
  
  // Check if token address is provided
  if (!tokenAddress || tokenAddress.trim() === '') {
    return { valid: false, error: 'Token address is required' };
  }
  
  // Validate token address format (basic Solana address validation)
  if (tokenAddress.length < 32 || tokenAddress.length > 44) {
    return { valid: false, error: 'Invalid token address format' };
  }
  
  // Check if amount is valid
  if (!validateAmount(amount)) {
    return { valid: false, error: 'Invalid amount: ' + amount };
  }
  
  return { valid: true };
};

/**
 * Execute token burn
 */
export const burnToken = async (
  wallet: Wallet,
  tokenAddress: string,
  amount: string
): Promise<ApiResponse<BundleResult[]>> => {
  try {
    // Validate inputs
    const validation = validateBurnInputs(wallet, tokenAddress, amount);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }
    
    // Derive wallet address from private key
    const walletAddress = getWalletAddress(wallet.privateKey);
    
    console.log(`Preparing to burn ${amount} tokens from ${walletAddress}`);
    console.log(`Token address: ${tokenAddress}`);
    
    // Step 1: Get partially prepared transactions from backend
    const burnResult = await getBurnTransaction({
      walletPublicKey: walletAddress,
      tokenAddress,
      amount
    });
    
    console.log(`Received ${burnResult.transactions.length} partially prepared transaction(s) from backend`);
    
    // Step 2: Create keypair from private key
    const walletKeypair = createKeypairFromPrivateKey(wallet.privateKey);
    
    // Step 3: Complete transaction signing
    const fullySignedTransactions = completeTransactionSigning(
      burnResult.transactions,
      walletKeypair,
      new Map() // No additional keypairs needed for burn
    );
    console.log(`Completed signing for ${fullySignedTransactions.length} transactions`);
    
    // Step 4: Prepare burn bundles
    const burnBundles = prepareTransactionBundles(fullySignedTransactions);
    console.log(`Prepared ${burnBundles.length} burn bundles`);
    
    // Step 5: Send bundles
    const results: BundleResult[] = [];
    for (let i = 0; i < burnBundles.length; i++) {
      const bundle = burnBundles[i];
      console.log(`Sending bundle ${i+1}/${burnBundles.length} with ${bundle.transactions.length} transactions`);
      
      const result = await sendBundle(bundle.transactions);
      results.push(result);
      
      // Add delay between bundles (except after the last one)
      if (i < burnBundles.length - 1) {
        await delay(500); // 500ms delay
      }
    }
    
    return {
      success: true,
      result: results
    };
  } catch (error) {
    console.error('Burn error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Batch burn tokens
 */
export const batchBurnToken = async (
  wallet: Wallet,
  burns: Array<{
    tokenAddress: string;
    amount: string;
  }>
): Promise<BatchResult> => {
  try {
    console.log(`Starting batch burn with ${burns.length} burns`);
    
    // Return early if no burns
    if (burns.length === 0) {
      return { success: true, results: [] };
    }
    
    // Execute each burn sequentially
    const results: any[] = [];
    for (let i = 0; i < burns.length; i++) {
      const burn = burns[i];
      console.log(`Processing burn ${i+1}/${burns.length}`);
      
      // Execute this burn
      const burnResult = await burnToken(
        wallet,
        burn.tokenAddress,
        burn.amount
      );
      
      if (!burnResult.success) {
        return {
          success: false,
          results,
          error: `Burn ${i+1} failed: ${burnResult.error}`
        };
      }
      
      // Add burn result
      results.push(burnResult.result);
      
      // Add delay between burns (except after the last one)
      if (i < burns.length - 1) {
        await delay(1000); // 1 second delay between burns
      }
    }
    
    return {
      success: true,
      results
    };
  } catch (error) {
    console.error('Batch burn error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};