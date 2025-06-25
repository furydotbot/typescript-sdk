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
 * Get partially signed transactions from backend for mixing
 * The backend will create and sign with dump wallets
 */
const getMixerTransactions = async (
  senderAddress: string, 
  recipients: { address: string, amount: string }[]
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
    debugLog('🔍 [DEBUG] Mixer API Request:');
    debugLog('   URL:', `${apiUrl}/api/wallets/mixer`);
    debugLog('   Payload:', JSON.stringify(requestPayload, null, 2));
    
    const response = await fetch(`${apiUrl}/api/wallets/mixer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      debugError('❌ [DEBUG] API Error Response:', errorText);
      throw new Error(`HTTP error! Status: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as {
      success: boolean;
      transactions?: string[];
      error?: string;
    };
    
    // Debug: Log response
    debugLog('✅ [DEBUG] Mixer API Response:');
    debugLog('   Success:', data.success);
    debugLog('   Transactions Count:', data.transactions?.length || 0);
    if (data.transactions && data.transactions.length > 0) {
      debugLog('   Transaction IDs:', data.transactions.map((tx: string, i: number) => `${i + 1}: ${tx.substring(0, 20)}...`));
    }
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to get partially signed transactions');
    }
    
    return data.transactions || []; // Array of base58 encoded partially signed transactions
  } catch (error) {
    debugError('Error getting mixer transactions:', error);
    throw error;
  }
};

/**
 * Validate mixing inputs for single recipient
 */
export const validateSingleMixingInputs = (
  senderWallet: Wallet,
  recipientWallet: Wallet,
  senderBalance?: number
): ValidationResult => {
  // Check if sender wallet is valid
  if (!validateWallet(senderWallet)) {
    return { valid: false, error: 'Invalid sender wallet' };
  }
  
  // Check if recipient wallet is valid
  if (!validateWallet(recipientWallet)) {
    return { valid: false, error: 'Invalid recipient wallet data' };
  }
  
  if (!recipientWallet.amount) {
    return { valid: false, error: 'Recipient wallet must have an amount specified' };
  }
  
  if (!validateAmount(recipientWallet.amount)) {
    return { valid: false, error: 'Invalid amount: ' + recipientWallet.amount };
  }
  
  return { valid: true };
};

/**
 * Validate mixing inputs for multiple recipients
 */
export const validateMixingInputs = (
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
    const estimatedFee = 0.01 * recipientWallets.length; // Rough estimate for fees in SOL
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
 * Execute SOL mixing to a single recipient
 */
export const mixSOLToSingleRecipient = async (
  senderWallet: Wallet,
  recipientWallet: Wallet
): Promise<ApiResponse<BundleResult[]>> => {
  try {
    // Derive addresses from private keys
    const senderAddress = getWalletAddress(senderWallet.privateKey);
    const recipientAddress = getWalletAddress(recipientWallet.privateKey);
    
    console.log(`Preparing to mix ${recipientWallet.amount} SOL from ${senderAddress} to ${recipientAddress}`);
    
    // Convert single recipient wallet to backend format
    const recipients = [{
      address: recipientAddress,
      amount: recipientWallet.amount!
    }];
    
    // Step 1: Get partially signed transactions from backend
    // These transactions are already signed by dump wallets created on the backend
    const mixerTransactions = await getMixerTransactions(
      senderAddress, 
      recipients
    );
    console.log(`Received ${mixerTransactions.length} partially signed transactions from backend`);
    
    // Step 2: Create keypairs from private keys
    const senderKeypair = createKeypairFromPrivateKey(senderWallet.privateKey);
    
    // Create a map with the single recipient keypair
    const recipientKeypairsMap = createKeypairMap([recipientWallet]);
    
    // Step 3: Complete transaction signing with sender and recipient keys
    const fullySignedTransactions = completeTransactionSigning(
      mixerTransactions, 
      senderKeypair, 
      recipientKeypairsMap
    );
    console.log(`Completed signing for ${fullySignedTransactions.length} transactions`);
    
    // Step 4: Prepare mixing bundles
    const mixingBundles = prepareTransactionBundles(fullySignedTransactions);
    console.log(`Prepared ${mixingBundles.length} mixing bundles`);
    
    // Step 5: Send bundles
    const results: BundleResult[] = [];
    for (let i = 0; i < mixingBundles.length; i++) {
      const bundle = mixingBundles[i];
      console.log(`Sending bundle ${i+1}/${mixingBundles.length} with ${bundle.transactions.length} transactions`);
      
      const result = await sendBundle(bundle.transactions);
      results.push(result);
      
      // Add delay between bundles (except after the last one)
      if (i < mixingBundles.length - 1) {
        await delay(500); // 500ms delay
      }
    }
    
    return {
      success: true,
      result: results
    };
  } catch (error) {
    console.error('SOL mixing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Batch mix SOL to multiple recipients, processing ONE RECIPIENT AT A TIME
 */
export const batchMixSOL = async (
  senderWallet: Wallet,
  recipientWallets: Wallet[]
): Promise<BatchResult> => {
  try {
    console.log(`Starting batch SOL mixing to ${recipientWallets.length} recipients (1 recipient per batch)`);
    
    // Return early if no recipients
    if (recipientWallets.length === 0) {
      return { success: true, results: [] };
    }
    
    // Process each recipient individually
    const results: any[] = [];
    for (let i = 0; i < recipientWallets.length; i++) {
      const recipientWallet = recipientWallets[i];
      const recipientAddress = getWalletAddress(recipientWallet.privateKey);
      console.log(`Processing recipient ${i+1}/${recipientWallets.length}: ${recipientAddress} (${recipientWallet.amount} SOL)`);
      
      // Execute mixing to single recipient
      const result = await mixSOLToSingleRecipient(senderWallet, recipientWallet);
      
      if (!result.success) {
        return {
          success: false,
          results,
          error: `Mixing to recipient ${i+1} (${recipientAddress}) failed: ${result.error}`
        };
      }
      
      // Add result
      results.push(result.result);
      
      // Add delay between recipients (except after the last one)
      if (i < recipientWallets.length - 1) {
        console.log(`Waiting 3 seconds before processing next recipient...`);
        await delay(3000); // 3 second delay between recipients
      }
    }
    
    console.log(`Successfully completed mixing to all ${recipientWallets.length} recipients`);
    return {
      success: true,
      results
    };
  } catch (error) {
    console.error('Batch SOL mixing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};