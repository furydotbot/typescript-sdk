import { 
  sendBundle, 
  completeTransactionSigning, 
  createKeypairFromPrivateKey,
  createKeypairMap,
  prepareTransactionBundles,
  delay,
  validateWallet,
  getConfig,
  getWalletAddress,
  debugLog,
  debugError
} from '../utils';
import { 
  Wallet, 
  ValidationResult, 
  ApiResponse, 
  BundleResult
} from '../types';

/**
 * Get partially prepared consolidation transactions from backend
 * The backend will create transactions without signing them
 */
const getConsolidateTransactions = async (
  sourceAddresses: string[], 
  receiverAddress: string,
  percentage: number
): Promise<string[]> => {
  try {
    const config = getConfig();
    // Use apiUrl if available, fallback to baseUrl for backward compatibility
    const apiUrl = (config.apiUrl)?.replace(/\/+$/, '');
    
    if (!apiUrl) {
      throw new Error('API URL not configured. Please call configure() with apiUrl or baseUrl first.');
    }
    
    // Prepare request payload
    const requestPayload = {
      sourceAddresses,
      receiverAddress,
      percentage
    };
    
    // Debug: Log request payload
    debugLog('🔍 [DEBUG] Consolidate API Request:');
    debugLog('   URL:', `${apiUrl}/api/wallets/consolidate`);
    debugLog('   Payload:', JSON.stringify(requestPayload, null, 2));
    
    const response = await fetch(`${apiUrl}/api/wallets/consolidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      debugLog('❌ [DEBUG] HTTP Error Response:');
      debugLog('   Status:', response.status);
      debugLog('   Status Text:', response.statusText);
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json() as { success: boolean; error?: string; transactions?: string[] };
    
    // Debug: Log response data
    debugLog('✅ [DEBUG] Consolidate API Response:');
    debugLog('   Success:', data.success);
    debugLog('   Transactions Count:', data.transactions?.length || 0);
    if (data.error) {
      debugLog('   Error:', data.error);
    }
    if (data.transactions) {
      debugLog('   Transaction IDs:', data.transactions.map((tx, i) => `${i + 1}: ${tx.substring(0, 20)}...`));
    }
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to get partially prepared transactions');
    }
    
    return data.transactions || []; // Array of base58 encoded partially prepared transactions
  } catch (error) {
    debugError('Error getting partially prepared transactions:', error);
    throw error;
  }
};



/**
 * Validate consolidation inputs
 */
export const validateConsolidationInputs = (
  sourceWallets: Wallet[],
  receiverWallet: Wallet,
  percentage: number,
  sourceBalances?: Map<string, number>
): ValidationResult => {
  // Check if receiver wallet is valid
  if (!validateWallet(receiverWallet)) {
    return { valid: false, error: 'Invalid receiver wallet' };
  }
  
  // Check if source wallets are valid
  if (!sourceWallets.length) {
    return { valid: false, error: 'No source wallets' };
  }
  
  for (const wallet of sourceWallets) {
    if (!validateWallet(wallet)) {
      return { valid: false, error: 'Invalid source wallet data' };
    }
    
    // Check balance if provided
    if (sourceBalances) {
      const address = getWalletAddress(wallet.privateKey);
      const balance = sourceBalances.get(address) || 0;
      if (balance <= 0) {
        return { valid: false, error: `Source wallet ${address.substring(0, 6)}... has no balance` };
      }
    }
  }
  
  // Check if percentage is valid
  if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
    return { valid: false, error: 'Percentage must be between 1 and 100' };
  }
  
  return { valid: true };
};

/**
 * Execute SOL consolidation
 */
export const consolidateSOL = async (
  sourceWallets: Wallet[],
  receiverWallet: Wallet,
  percentage: number
): Promise<ApiResponse<BundleResult[]>> => {
  try {
    // Derive addresses from private keys
    const receiverAddress = getWalletAddress(receiverWallet.privateKey);
    const sourceAddresses = sourceWallets.map(wallet => getWalletAddress(wallet.privateKey));
    
    console.log(`Preparing to consolidate ${percentage}% of SOL from ${sourceWallets.length} wallets to ${receiverAddress}`);
    
    // Step 1: Get partially prepared transactions from backend
    const partiallyPreparedTransactions = await getConsolidateTransactions(
      sourceAddresses,
      receiverAddress,
      percentage
    );
    console.log(`Received ${partiallyPreparedTransactions.length} partially prepared transactions from backend`);
    
    // Step 2: Create keypairs from private keys
    const receiverKeypair = createKeypairFromPrivateKey(receiverWallet.privateKey);
    
    // Create a map of source public keys to keypairs for faster lookups
    const sourceKeypairsMap = createKeypairMap(sourceWallets);
    
    // Step 3: Complete transaction signing with source and receiver keys
    const fullySignedTransactions = completeTransactionSigning(
      partiallyPreparedTransactions,
      receiverKeypair,
      sourceKeypairsMap
    );
    console.log(`Completed signing for ${fullySignedTransactions.length} transactions`);
    
    // Step 4: Prepare consolidation bundles
    const consolidationBundles = prepareTransactionBundles(fullySignedTransactions);
    console.log(`Prepared ${consolidationBundles.length} consolidation bundles`);
    
    // Step 5: Send bundles
    const results: BundleResult[] = [];
    for (let i = 0; i < consolidationBundles.length; i++) {
      const bundle = consolidationBundles[i];
      console.log(`Sending bundle ${i+1}/${consolidationBundles.length} with ${bundle.transactions.length} transactions`);
      
      const result = await sendBundle(bundle.transactions);
      results.push(result);
      
      // Add delay between bundles (except after the last one)
      if (i < consolidationBundles.length - 1) {
        await delay(500); // 500ms delay
      }
    }
    
    return {
      success: true,
      result: results
    };
  } catch (error) {
    console.error('SOL consolidation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};