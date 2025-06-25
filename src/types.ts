/**
 * Wallet interface
 */
export interface Wallet {
  privateKey: string; // Base58 encoded private key
  amount?: string; // Optional - not used for sender
}

/**
 * Balance check options
 */
export interface BalanceCheckOptions {
  enabled: boolean;
  rpcUrl?: string;
}

/**
 * Bundle interface
 */
export interface Bundle {
  transactions: string[]; // Base58 encoded transaction data
}

/**
 * Bundle result interface from Jito block engine
 */
export interface BundleResult {
  jsonrpc: string;
  id: number;
  result?: string;
  error?: {
    code: number;
    message: string;
  };
}

/**
 * Generic API response interface
 */
export interface ApiResponse<T = any> {
  success: boolean;
  result?: T;
  error?: string;
}


/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * SDK configuration interface
 */
export interface SDKConfig {
  baseUrl?: string;
  apiUrl?: string;
  rpcUrl?: string;
  rateLimitDelay?: number;
  maxBundlesPerSecond?: number;
  maxRecipientsPerBatch?: number;
  debug?: boolean; // Enable/disable debug logging
}

/**
 * Rate limiting state interface
 */
export interface RateLimitState {
  count: number;
  lastReset: number;
  maxBundlesPerSecond: number;
}

/**
 * Transaction signing options
 */
export interface SigningOptions {
  senderKeypair: any; // Keypair from @solana/web3.js
  recipientKeypairs?: Map<string, any>;
}

/**
 * Batch operation result
 */
export interface BatchResult {
  success: boolean;
  results?: any[];
  error?: string;
}