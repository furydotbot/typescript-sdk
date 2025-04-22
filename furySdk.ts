import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  Keypair,
  PublicKey,
  Signer,
  VersionedTransaction,
  TransactionMessage,
  TransactionSignature,
} from '@solana/web3.js';
import bs58 from 'bs58';

// --------------------------------------------
// Enums and Types
// --------------------------------------------

export enum Protocol {
  Raydium = 'raydium',
  Jupiter = 'jupiter',
  Pumpfun = 'pumpfun',
  Moonshot = 'moonshot',
  Pumpswap = 'pumpswap',
  Auto = 'auto',
}

// Helper to convert enum from string (useful if needed)
export function protocolFromString(s: string): Protocol {
  const lowerS = s.toLowerCase();
  if (lowerS in Protocol) {
    return Protocol[lowerS as keyof typeof Protocol];
  }
  throw new Error(`Invalid protocol: ${s}`);
}

// --------------------------------------------
// Analytics PNL
// --------------------------------------------

export interface AnalyticsPnlOptions {
  includeTimestamp: boolean;
}

export interface AnalyticsPnlRequest {
  addresses: string; // Comma-separated list
  tokenAddress: string;
  options: AnalyticsPnlOptions;
}

export interface AnalyticsPnlData {
  profit: number;
  timestamp: string;
}

export interface AnalyticsPnlResponse {
  success: boolean;
  // Where key is wallet address and value is details
  data: Record<string, AnalyticsPnlData>;
}

// --------------------------------------------
// Token buy
// --------------------------------------------
export interface BuyTokenRequest {
  walletAddresses: string[];
  tokenAddress: string;
  solAmount: number;
  protocol: Protocol;
  affiliateAddress?: string;
  affiliateFee?: string; // Consider using number if it represents basis points or similar
  jitoTipLamports?: number; // Use number, bigint might be safer for large lamport amounts
  slippageBps?: number; // Use number
  amounts?: number[]; // TODO: maybe remove
  useRpc?: boolean; // TODO: maybe remove (default seems false based on send request)
}

export interface BuyTokenResponse {
  success: boolean;
  transactions: string[]; // Base58 encoded serialized VersionedTransactions
}

// --------------------------------------------
// Token sell
// --------------------------------------------
export interface SellRequest {
  walletAddresses: string[];
  tokenAddress: string;
  percentage: number; // Represents percentage (0-100)
  protocol: Protocol;
  affiliateAddress?: string;
  affiliateFee?: string; // Consider number
  jitoTipLamports?: number; // Consider bigint
  slippageBps?: number;
}

export interface SellResponse {
  success: boolean;
  transactions: string[]; // Base58 encoded serialized VersionedTransactions
}

// --------------------------------------------
// Token transfer
// --------------------------------------------
export interface TokenTransferRequest {
  senderPublicKey: string;
  receiver: string;
  tokenAddress: string;
  amount: string; // Keep as string to handle large numbers / decimals precisely
}

export interface TokenTransferData {
  transaction: string; // Base58 encoded serialized VersionedTransaction
  blockhash: string;
  last_valid_block_height: number; // Rust u64 maps to number in TS (be mindful of JS limits)
  transfer_type: string;
}

export interface TokenTransferResponse {
  success: boolean;
  data: TokenTransferData;
}

// --------------------------------------------
// Token creation
// --------------------------------------------
export interface TokenCreationMetadata {
  name: string;
  symbol: string;
  description?: string;
  telegram?: string;
  twitter?: string;
  website?: string;
  file: string; // URL or potentially base64 data? Rust uses String, assume URL for now.
}

export interface TokenCreation {
  metadata: TokenCreationMetadata;
  defaultSolAmount: number;
}

export interface TokenCreationConfig {
  tokenCreation: TokenCreation;
}

export interface TokensCreateRequest {
  walletAddresses: string[];
  mintPubkey: string;
  config: TokenCreationConfig;
  amounts: number[];
}

export interface TokensCreateResponse {
  success: boolean;
  transactions: string[]; // Base58 encoded serialized VersionedTransactions
}

// --------------------------------------------
// Token burn
// --------------------------------------------
export interface TokenBurnRequest {
  walletPublicKey: string;
  tokenAddress: string;
  amount: number; // Floating point amount
}

export interface TokenBurnData {
  transaction: string; // Base58 encoded serialized VersionedTransaction
  blockhash: string;
  amount: number;
  decimals: number; // Rust u64 maps to number
  token_mint: string;
  associated_token_address: string;
}

export interface TokenBurnResponse {
  success: boolean;
  data: TokenBurnData;
}

// --------------------------------------------
// Token cleaner
// --------------------------------------------
export interface TokenCleanerRequest {
  sellerAddress: string;
  buyerAddress: string;
  tokenAddress: string;
  sellPercentage: number;
  buyPercentage: number;
  walletAddresses: string[]; // Addresses associated with the cleaner operation?
  buyAmount: number; // SOL amount for the buy part?
}

export interface TokenCleanerResponse {
  success: boolean;
  transactions: string[]; // Base58 encoded serialized VersionedTransactions
}

// --------------------------------------------
// Transaction send
// --------------------------------------------
export interface TransactionSendRequest {
  transactions: string[]; // Base58 encoded SIGNED serialized VersionedTransactions
  useRpc: boolean;
}

// Specific types for discriminated union based on useRpc might be better,
// but mirroring Rust structure for now.
export interface JitoTxResult {
  jito: string; // Bundle ID or similar Jito confirmation
}

export interface JitoTransactionSendResponse {
  success: boolean;
  result: JitoTxResult;
}

export interface RpcTxResult {
  rpc: string[]; // Transaction signatures
}

export interface RpcTransactionSendResponse {
  success: boolean;
  result: RpcTxResult;
}

// Type guard to help differentiate response types after calling sendTransaction
export function isJitoSendResponse(
  response: JitoTransactionSendResponse | RpcTransactionSendResponse
): response is JitoTransactionSendResponse {
  return (response as JitoTransactionSendResponse).result?.jito !== undefined;
}

export function isRpcSendResponse(
  response: JitoTransactionSendResponse | RpcTransactionSendResponse
): response is RpcTransactionSendResponse {
  return (response as RpcTransactionSendResponse).result?.rpc !== undefined;
}


// --------------------------------------------
// Health check
// --------------------------------------------
export interface HealthCheckResponse {
  status: string;
}

// --------------------------------------------
// Generate mint
// --------------------------------------------
export interface GenerateMintResponse {
  pubkey: string;
}

// --------------------------------------------
// Wallets distribute
// --------------------------------------------
export interface WalletsDistributeRecipient {
  address: string;
  amount: number; // SOL amount
}

export interface WalletsDistributeRequest {
  sender: string;
  recipients: WalletsDistributeRecipient[];
}

export interface WalletsDistributeResponse {
  success: boolean;
  transactions: string[]; // Base58 encoded serialized VersionedTransactions
}

// --------------------------------------------
// Wallets consolidate
// --------------------------------------------
export interface WalletsConsolidateRequest {
  sourceAddresses: string[];
  receiverAddress: string;
  percentage: number; // Percentage of SOL balance (0-100)
}

export interface WalletsConsolidateResponse {
  success: boolean;
  transactions: string[]; // Base58 encoded serialized VersionedTransactions
}

// --------------------------------------------
// Error handling
// --------------------------------------------
export interface ErrorResponse {
  success: boolean; // Will likely be false
  error?: string;
  details?: string;
}

export class FuryError extends Error {
  public readonly isApiError: boolean;
  public readonly apiError?: ErrorResponse; // If it's an API error
  public readonly status?: number; // HTTP status if available
  public readonly originalError?: Error | AxiosError; // Underlying network/axios error

  constructor(message: string, options?: {
    apiError?: ErrorResponse,
    status?: number,
    originalError?: Error | AxiosError
  }) {
    super(message);
    this.name = 'FuryError';
    this.isApiError = !!options?.apiError;
    this.apiError = options?.apiError;
    this.status = options?.status;
    this.originalError = options?.originalError;

    // Maintains proper stack trace in V8 environments (Node, Chrome)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FuryError);
    }
  }
}

// --------------------------------------------
// SDK Client
// --------------------------------------------

interface RequestOptions {
  baseUrl?: string;
}

export class FurySDK {
  private client: AxiosInstance;
  public baseUrl: string;

  constructor(axiosInstance?: AxiosInstance, baseUrl: string = 'https://solana.fury.bot/api/') {
    this.client = axiosInstance || axios.create();
    // Ensure trailing slash for easy endpoint joining
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  }

  /**
   * Checks the health of the Fury API.
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    // Health check often lives at the root, not /api/
    const healthUrl = this.baseUrl.replace(/api\/$/, ''); // Remove api/ if present
    return this._sendGetRequest<HealthCheckResponse>(
        'health',
         undefined,
         { baseUrl: healthUrl }
    );
  }

  /**
   * Creates transactions to buy a token.
   * @param data - Request details for buying a token.
   * @returns The buy token response containing transactions to be signed.
   */
  async buyToken(data: BuyTokenRequest): Promise<BuyTokenResponse> {
    return this._sendPostRequest<BuyTokenResponse, BuyTokenRequest>('tokens/buy', data);
  }

 /**
  * Creates transactions to sell a token.
  * @param data - Request details for selling a token.
  * @returns The sell token response containing transactions to be signed.
  */
  async sellToken(data: SellRequest): Promise<SellResponse> {
    return this._sendPostRequest<SellResponse, SellRequest>('tokens/sell', data);
  }

  /**
   * Sends signed transactions to the network via Jito or RPC.
   * Note: The return type is a union. Use the provided type guards (isJitoSendResponse, isRpcSendResponse)
   * to determine the actual response structure based on the `useRpc` flag in the request.
   * @param data - Request containing signed transactions and send method.
   * @returns The transaction send response.
   */
  async sendTransaction(data: TransactionSendRequest): Promise<JitoTransactionSendResponse | RpcTransactionSendResponse> {
      // The API endpoint seems to be the same, the response type differs based on `useRpc`
      if (data.useRpc) {
          return this._sendPostRequest<RpcTransactionSendResponse, TransactionSendRequest>('transactions/send', data);
      } else {
          return this._sendPostRequest<JitoTransactionSendResponse, TransactionSendRequest>('transactions/send', data);
      }
  }

  /**
   * Creates a transaction to transfer SPL tokens.
   * @param data - Request details for the token transfer.
   * @returns The token transfer response containing the transaction to be signed.
   */
  async tokenTransfer(data: TokenTransferRequest): Promise<TokenTransferResponse> {
    return this._sendPostRequest<TokenTransferResponse, TokenTransferRequest>('tokens/transfer', data);
  }

  /**
   * Creates transactions for setting up a new token (e.g., on Pump.fun).
   * @param data - Request details for token creation.
   * @returns The token creation response containing transactions to be signed.
   */
  async tokensCreate(data: TokensCreateRequest): Promise<TokensCreateResponse> {
    return this._sendPostRequest<TokensCreateResponse, TokensCreateRequest>('tokens/create', data);
  }

 /**
  * Creates a transaction to burn SPL tokens.
  * @param data - Request details for burning tokens.
  * @returns The token burn response containing the transaction to be signed.
  */
  async tokenBurn(data: TokenBurnRequest): Promise<TokenBurnResponse> {
    return this._sendPostRequest<TokenBurnResponse, TokenBurnRequest>('tokens/burn', data);
  }

  /**
   * Creates transactions for the token cleaner service.
   * @param data - Request details for the token cleaner.
   * @returns The token cleaner response containing transactions to be signed.
   */
  async tokenCleaner(data: TokenCleanerRequest): Promise<TokenCleanerResponse> {
    return this._sendPostRequest<TokenCleanerResponse, TokenCleanerRequest>('tokens/cleaner', data);
  }

  /**
   * Retrieves Profit and Loss (PNL) analytics for given wallets and a token.
   * @param addresses - Array of wallet public key strings.
   * @param tokenAddress - The SPL token address string.
   * @param options - PNL calculation options.
   * @returns The PNL analytics response.
   */
  async analyticsPnl(
    addresses: string[],
    tokenAddress: string,
    options: AnalyticsPnlOptions
  ): Promise<AnalyticsPnlResponse> {
    const requestData: AnalyticsPnlRequest = {
      addresses: addresses.join(','),
      tokenAddress,
      options,
    };
    return this._sendPostRequest<AnalyticsPnlResponse, AnalyticsPnlRequest>('analytics/pnl', requestData);
  }

  /**
   * Generates a new keypair suitable for use as a mint address.
   * @returns The public key of the generated mint address.
   */
  async generateMint(): Promise<GenerateMintResponse> {
    return this._sendGetRequest<GenerateMintResponse>('utilities/generate-mint');
  }

  /**
   * Creates transactions to distribute SOL from a sender to multiple recipients.
   * @param data - Request details for the SOL distribution.
   * @returns The distribution response containing transactions to be signed.
   */
  async walletsDistribute(data: WalletsDistributeRequest): Promise<WalletsDistributeResponse> {
    return this._sendPostRequest<WalletsDistributeResponse, WalletsDistributeRequest>('wallets/distribute', data);
  }

  /**
   * Creates transactions to consolidate SOL from multiple source wallets to a single receiver.
   * @param data - Request details for the SOL consolidation.
   * @returns The consolidation response containing transactions to be signed.
   */
  async walletsConsolidate(data: WalletsConsolidateRequest): Promise<WalletsConsolidateResponse> {
    return this._sendPostRequest<WalletsConsolidateResponse, WalletsConsolidateRequest>('wallets/consolidate', data);
  }

  // --------------------------------------------
  // Private Helper Methods
  // --------------------------------------------

  private async _sendPostRequest<T, D>(
    endpoint: string,
    data: D,
    options?: RequestOptions
  ): Promise<T> {
    const url = `${options?.baseUrl || this.baseUrl}${endpoint}`;
    try {
      const response = await this.client.post<T>(url, data, {
          headers: { 'Content-Type': 'application/json' },
      });
      return this._processResponse<T>(response);
    } catch (error) {
      this._handleRequestError(error, url); // Throws FuryError
    }
  }

  private async _sendGetRequest<T>(
    endpoint: string,
    params?: Record<string, string>,
    options?: RequestOptions
  ): Promise<T> {
    const url = `${options?.baseUrl || this.baseUrl}${endpoint}`;
    try {
      const response = await this.client.get<T>(url, { params });
      return this._processResponse<T>(response);
    } catch (error) {
        this._handleRequestError(error, url); // Throws FuryError
    }
  }

  // Type assertion for Axios response data
  private _processResponse<T>(response: { status: number; data: any }): T {
       // Assuming successful status codes are in the 2xx range
       // The Rust code seems to check response.json().await regardless of status first,
       // then checks success boolean or status. Axios typically throws for non-2xx.
       // If the API *always* returns 200 even for logical errors (e.g., { success: false, ... }),
       // this logic might need adjustment based on API behavior.

       // Let's assume standard HTTP practice: 2xx is success, others are errors.
       // If the API returns 2xx but `success: false`, that's handled by the caller checking the response `success` field.
       // Axios throws for non-2xx, which is caught by _handleRequestError.
       // So, if we are here, it's likely a 2xx response.
       return response.data as T;

       // --- Alternative if API *always* returns 200 OK ---
       // if (response.data && typeof response.data.success === 'boolean' && !response.data.success) {
       //     const apiError: ErrorResponse = {
       //         success: false,
       //         error: response.data.error || 'API indicated failure',
       //         details: response.data.details
       //     };
       //     throw new FuryError(apiError.error || 'API Error', { apiError, status: response.status });
       // }
       // return response.data as T;
       // --- End Alternative ---
  }


  private _handleRequestError(error: any, url: string): never {
      if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError<ErrorResponse>;
          const status = axiosError.response?.status;
          const responseData = axiosError.response?.data;

          // Check if the response data looks like our API's ErrorResponse
          if (responseData && typeof responseData.success === 'boolean' && !responseData.success) {
              const apiError: ErrorResponse = {
                  success: false, // Explicitly set
                  error: responseData.error || 'API Error',
                  details: responseData.details,
              };
               throw new FuryError(
                   `API Error (${status}): ${apiError.error}${apiError.details ? ` - ${apiError.details}` : ''}`,
                   { apiError, status, originalError: axiosError }
               );
          } else {
              // Network error or unexpected response format
              throw new FuryError(
                  `Request Failed (${status || 'Network Error'}): ${axiosError.message} at ${url}`,
                  { status, originalError: axiosError }
               );
          }
      } else {
          // Non-axios error
          const genericError = error instanceof Error ? error : new Error(String(error));
          throw new FuryError(
              `An unexpected error occurred: ${genericError.message}`,
              { originalError: genericError }
          );
      }
  }
}


// --------------------------------------------
// Utility Functions (like sign_transactions)
// --------------------------------------------

/**
 * Signs an array of base58 encoded transactions with the provided signers.
 *
 * @param serializedTxs - An array of base58 encoded, potentially partially signed VersionedTransactions.
 * @param signers - An array of Signer objects (Keypairs) required to sign the transactions.
 *                  This function assumes the signers provided are sufficient for the missing signatures.
 * @returns A promise that resolves to an array of base58 encoded, fully signed VersionedTransactions.
 * @throws Error if deserialization or signing fails.
 */
export async function signTransactions(
  serializedTxs: string[],
  signers: Signer[] // Use the Signer interface which Keypair implements
): Promise<string[]> {
  const signedTxs: string[] = [];

  if (!signers || signers.length === 0) {
      console.warn("signTransactions called with no signers.");
      // If no signers needed, just return original txs? Or throw?
      // Let's assume if signers are passed, they are intended to be used.
      // If the TX requires no signers from this list, sign() will handle it.
      // If it *does* require them and they aren't provided, sign() will throw.
  }

  for (const serializedTx of serializedTxs) {
    try {
      const txBuffer = bs58.decode(serializedTx);
      const transaction = VersionedTransaction.deserialize(txBuffer);

      // Find the signers relevant to *this* transaction message
      // Note: `transaction.sign()` internally finds the required signers from the provided array.
      // No need to manually check like in the Rust code if we provide all potential signers.
      transaction.sign(signers); // Throws if a required signer is missing from the array


      const signedTxBuffer = transaction.serialize();
      signedTxs.push(bs58.encode(signedTxBuffer));
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('Failed to deserialize or sign transaction:', errMsg);
      console.error('Problematic transaction (base58):', serializedTx);
      // Optionally re-throw or handle more gracefully
      throw new Error(`Failed to process transaction: ${errMsg}`);
    }
  }

  return signedTxs;
}