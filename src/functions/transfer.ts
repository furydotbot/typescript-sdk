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
 * Transfer configuration interface
 */
export interface TransferConfig {
  senderPublicKey: string;
  receiver: string;
  tokenAddress?: string; // Optional - if not provided, transfers SOL
  amount: string;
}

/**
 * Transfer result interface
 */
export interface TransferResult {
  success: boolean;
  transactions: string[];
}

/**
 * Get transfer transaction from backend
 * The backend will create the transaction based on transfer type (SOL or token)
 */
const getTransferTransaction = async (
  config: TransferConfig
): Promise<TransferResult> => {
  try {
    const sdkConfig = getConfig();
    const apiUrl = sdkConfig.apiUrl?.replace(/\/+$/, '');
    
    if (!apiUrl) {
      throw new Error('API URL not configured. Please call configure() with apiUrl first.');
    }
    
    // Prepare request payload
    const requestPayload = {
      senderPublicKey: config.senderPublicKey,
      receiver: config.receiver,
      tokenAddress: config.tokenAddress,
      amount: config.amount
    };
    
    // Debug: Log request payload
    debugLog('🔍 [DEBUG] Transfer API Request:');
    debugLog('   URL:', `${apiUrl}/api/tokens/transfer`);
    debugLog('   Payload:', JSON.stringify(requestPayload, null, 2));
    
    const response = await fetch(`${apiUrl}/api/tokens/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload),
    });

    debugLog('Transfer API request sent, status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      debugError(`HTTP error! Status: ${response.status}, Body: ${errorText}`);
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json() as any;
    
    // Debug: Log response data
    debugLog('Transfer API Response received successfully');
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
    debugError('Error getting transfer transaction:', error);
    throw error;
  }
};

/**
 * Validate transfer inputs
 */
export const validateTransferInputs = (
  senderWallet: Wallet,
  receiverAddress: string,
  amount: string,
  tokenAddress?: string
): ValidationResult => {
  // Check if sender wallet is valid
  if (!validateWallet(senderWallet)) {
    return { valid: false, error: 'Invalid sender wallet' };
  }
  
  // Check if receiver address is provided
  if (!receiverAddress || receiverAddress.trim() === '') {
    return { valid: false, error: 'Receiver address is required' };
  }
  
  // Validate receiver address format (basic Solana address validation)
  if (receiverAddress.length < 32 || receiverAddress.length > 44) {
    return { valid: false, error: 'Invalid receiver address format' };
  }
  
  // Check if amount is valid
  if (!validateAmount(amount)) {
    return { valid: false, error: 'Invalid amount: ' + amount };
  }
  
  // If token address is provided, validate it
  if (tokenAddress && (tokenAddress.length < 32 || tokenAddress.length > 44)) {
    return { valid: false, error: 'Invalid token address format' };
  }
  
  return { valid: true };
};

/**
 * Execute SOL or token transfer
 */
export const transferTokens = async (
  senderWallet: Wallet,
  receiverAddress: string,
  amount: string,
  tokenAddress?: string
): Promise<ApiResponse<BundleResult[]>> => {
  try {
    // Validate inputs
    const validation = validateTransferInputs(senderWallet, receiverAddress, amount, tokenAddress);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }
    
    // Derive sender address from private key
    const senderAddress = getWalletAddress(senderWallet.privateKey);
    const transferType = tokenAddress ? 'TOKEN' : 'SOL';
    
    console.log(`Preparing to transfer ${amount} ${transferType} from ${senderAddress} to ${receiverAddress}`);
    if (tokenAddress) {
      console.log(`Token address: ${tokenAddress}`);
    }
    
    // Step 1: Get partially prepared transactions from backend
    const transferResult = await getTransferTransaction({
      senderPublicKey: senderAddress,
      receiver: receiverAddress,
      tokenAddress,
      amount
    });
    
    console.log(`Received ${transferResult.transactions.length} partially prepared transaction(s) from backend`);
    
    // Step 2: Create keypair from private key
    const senderKeypair = createKeypairFromPrivateKey(senderWallet.privateKey);
    
    // Step 3: Complete transaction signing
    const fullySignedTransactions = completeTransactionSigning(
      transferResult.transactions,
      senderKeypair,
      new Map() // No additional keypairs needed for simple transfers
    );
    console.log(`Completed signing for ${fullySignedTransactions.length} transactions`);
    
    // Step 4: Prepare transfer bundles
    const transferBundles = prepareTransactionBundles(fullySignedTransactions);
    console.log(`Prepared ${transferBundles.length} transfer bundles`);
    
    // Step 5: Send bundles
    const results: BundleResult[] = [];
    for (let i = 0; i < transferBundles.length; i++) {
      const bundle = transferBundles[i];
      console.log(`Sending bundle ${i+1}/${transferBundles.length} with ${bundle.transactions.length} transactions`);
      
      const result = await sendBundle(bundle.transactions);
      results.push(result);
      
      // Add delay between bundles (except after the last one)
      if (i < transferBundles.length - 1) {
        await delay(500); // 500ms delay
      }
    }
    
    return {
      success: true,
      result: results
    };
  } catch (error) {
    console.error('Transfer error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Execute SOL transfer (convenience function)
 */
export const transferSOL = async (
  senderWallet: Wallet,
  receiverAddress: string,
  amount: string
): Promise<ApiResponse<BundleResult[]>> => {
  return transferTokens(senderWallet, receiverAddress, amount);
};

/**
 * Execute token transfer (convenience function)
 */
export const transferToken = async (
  senderWallet: Wallet,
  receiverAddress: string,
  amount: string,
  tokenAddress: string
): Promise<ApiResponse<BundleResult[]>> => {
  return transferTokens(senderWallet, receiverAddress, amount, tokenAddress);
};

/**
 * Batch transfer to multiple recipients
 */
export const batchTransfer = async (
  senderWallet: Wallet,
  transfers: Array<{
    receiverAddress: string;
    amount: string;
    tokenAddress?: string;
  }>
): Promise<BatchResult> => {
  try {
    console.log(`Starting batch transfer with ${transfers.length} transfers`);
    
    // Return early if no transfers
    if (transfers.length === 0) {
      return { success: true, results: [] };
    }
    
    // Execute each transfer sequentially
    const results: any[] = [];
    for (let i = 0; i < transfers.length; i++) {
      const transfer = transfers[i];
      console.log(`Processing transfer ${i+1}/${transfers.length}`);
      
      // Execute this transfer
      const transferResult = await transferTokens(
        senderWallet,
        transfer.receiverAddress,
        transfer.amount,
        transfer.tokenAddress
      );
      
      if (!transferResult.success) {
        return {
          success: false,
          results,
          error: `Transfer ${i+1} failed: ${transferResult.error}`
        };
      }
      
      // Add transfer result
      results.push(transferResult.result);
      
      // Add delay between transfers (except after the last one)
      if (i < transfers.length - 1) {
        await delay(1000); // 1 second delay between transfers
      }
    }
    
    return {
      success: true,
      results
    };
  } catch (error) {
    console.error('Batch transfer error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};