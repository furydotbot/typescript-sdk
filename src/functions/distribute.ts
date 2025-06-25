import { 
  sendBundle, 
  completeTransactionSigning, 
  createKeypairFromPrivateKey,
  createKeypairMap,
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
 * Get partially signed transactions from backend
 * The backend will create and sign with dump wallets
 */
const getDistributeTransactions = async (
  senderAddress: string, 
  recipients: Wallet[]
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
      sender: senderAddress,
      recipients: recipients
    };
    
    // Debug: Log request payload
    debugLog('🔍 [DEBUG] Distribute API Request:');
    debugLog('   URL:', `${apiUrl}/api/wallets/distribute`);
    debugLog('   Payload:', JSON.stringify(requestPayload, null, 2));
    
    const response = await fetch(`${apiUrl}/api/wallets/distribute`, {
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
    debugLog('✅ [DEBUG] Distribute API Response:');
    debugLog('   Success:', data.success);
    debugLog('   Transactions Count:', data.transactions?.length || 0);
    if (data.error) {
      debugLog('   Error:', data.error);
    }
    if (data.transactions) {
      debugLog('   Transaction IDs:', data.transactions.map((tx, i) => `${i + 1}: ${tx.substring(0, 20)}...`));
    }
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to get partially signed transactions');
    }
    
    return data.transactions || []; // Array of base58 encoded partially signed transactions
  } catch (error) {
    debugError('Error getting partially prepared transactions:', error);
    throw error;
  }
};

/**
 * Validate distribution inputs
 */
export const validateDistributionInputs = (
  senderWallet: Wallet,
  recipientWallets: Wallet[],
  senderBalance?: number
): ValidationResult => {
  // Check if sender wallet is valid
  if (!validateWallet(senderWallet)) {
    return { valid: false, error: 'Invalid sender wallet' };
  }
  
  // Check if recipient wallets are valid
  if (!recipientWallets.length) {
    return { valid: false, error: 'No recipient wallets' };
  }
  
  for (const wallet of recipientWallets) {
    if (!validateWallet(wallet)) {
      return { valid: false, error: 'Invalid recipient wallet data' };
    }
    
    if (!wallet.amount) {
      return { valid: false, error: 'Recipient wallet must have an amount specified' };
    }
    
    if (!validateAmount(wallet.amount)) {
      return { valid: false, error: 'Invalid amount: ' + wallet.amount };
    }
  }
  
  // Calculate total amount
  const totalAmount = recipientWallets.reduce(
    (sum, wallet) => sum + parseFloat(wallet.amount!), 0
  );
  
  // Check if sender has enough balance (including some extra for fees) - only if balance is provided
  if (senderBalance !== undefined) {
    const estimatedFee = 0.01; // Rough estimate for fees in SOL
    if (totalAmount + estimatedFee > senderBalance) {
      return {
        valid: false,
        error: `Insufficient balance. Need at least ${totalAmount + estimatedFee} SOL, but have ${senderBalance} SOL`
      };
    }
  }
  
  return { valid: true };
};

/**
 * Execute SOL distribution
 */
export const distributeSOL = async (
  senderWallet: Wallet,
  recipientWallets: Wallet[]
): Promise<ApiResponse<BundleResult[]>> => {
  try {
    // Derive addresses from private keys
    const senderAddress = getWalletAddress(senderWallet.privateKey);
    console.log(`Preparing to distribute SOL from ${senderAddress} to ${recipientWallets.length} recipients`);
    
    // Convert wallet data to recipient format for backend
    const recipients = recipientWallets.map(wallet => ({
      address: getWalletAddress(wallet.privateKey),
      amount: wallet.amount!, // Non-null assertion since validation ensures amount exists
      privateKey: wallet.privateKey
    }));
    
    // Step 1: Get transactions 
    const DistributeTransactions = await getDistributeTransactions(
      senderAddress, 
      recipients
    );
    console.log(`Received ${DistributeTransactions.length} partially signed transactions from backend`);
    
    // Step 2: Create keypairs from private keys
    const senderKeypair = createKeypairFromPrivateKey(senderWallet.privateKey);
    
    // Create a map of recipient public keys to keypairs for faster lookups
    const recipientKeypairsMap = createKeypairMap(recipientWallets);
    
    // Step 3: Complete transaction signing with sender and recipient keys
    const fullySignedTransactions = completeTransactionSigning(
      DistributeTransactions, 
      senderKeypair, 
      recipientKeypairsMap
    );
    console.log(`Completed signing for ${fullySignedTransactions.length} transactions`);
    
    // Step 4: Prepare distribution bundles
    const distributionBundles = prepareTransactionBundles(fullySignedTransactions);
    console.log(`Prepared ${distributionBundles.length} distribution bundles`);
    
    // Step 5: Send bundles
    const results: BundleResult[] = [];
    for (let i = 0; i < distributionBundles.length; i++) {
      const bundle = distributionBundles[i];
      console.log(`Sending bundle ${i+1}/${distributionBundles.length} with ${bundle.transactions.length} transactions`);
      
      const result = await sendBundle(bundle.transactions);
      results.push(result);
      
      // Add delay between bundles (except after the last one)
      if (i < distributionBundles.length - 1) {
        await delay(500); // 500ms delay
      }
    }
    
    return {
      success: true,
      result: results
    };
  } catch (error) {
    console.error('SOL distribution error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Batch distribute SOL to multiple recipients, splitting into groups of max 3 recipients per request
 */
export const batchDistributeSOL = async (
  senderWallet: Wallet,
  recipientWallets: Wallet[]
): Promise<BatchResult> => {
  try {
    console.log(`Starting batch SOL distribution to ${recipientWallets.length} recipients`);
    
    // Return early if no recipients
    if (recipientWallets.length === 0) {
      return { success: true, results: [] };
    }
    
    // If 3 or fewer recipients, just call distributeSOL directly
    if (recipientWallets.length <= 3) {
      const result = await distributeSOL(senderWallet, recipientWallets);
      return { 
        success: result.success, 
        results: result.success ? [result.result] : [], 
        error: result.error 
      };
    }
    
    // Split recipients into batches of max 3
    const MAX_RECIPIENTS_PER_BATCH = 3;
    const batches: Wallet[][] = [];
    
    for (let i = 0; i < recipientWallets.length; i += MAX_RECIPIENTS_PER_BATCH) {
      batches.push(recipientWallets.slice(i, i + MAX_RECIPIENTS_PER_BATCH));
    }
    
    console.log(`Split distribution into ${batches.length} batches of max ${MAX_RECIPIENTS_PER_BATCH} recipients each`);
    
    // Execute each batch sequentially
    const results: any[] = [];
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Processing batch ${i+1}/${batches.length} with ${batch.length} recipients`);
      
      // Execute this batch
      const batchResult = await distributeSOL(senderWallet, batch);
      
      if (!batchResult.success) {
        return {
          success: false,
          results,
          error: `Batch ${i+1} failed: ${batchResult.error}`
        };
      }
      
      // Add batch result
      results.push(batchResult.result);
      
      // Add delay between batches (except after the last one)
      if (i < batches.length - 1) {
        await delay(3000); // 3 second delay between batches
      }
    }
    
    return {
      success: true,
      results
    };
  } catch (error) {
    console.error('Batch SOL distribution error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};