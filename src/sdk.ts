import { configure, getConfig } from './utils';
import { distributeSOL, batchDistributeSOL, validateDistributionInputs } from './functions/distribute';
import { mixSOLToSingleRecipient, batchMixSOL, validateMixingInputs, validateSingleMixingInputs } from './functions/mixer';
import { buyTokenSingle, buyTokenBatch, validateTokenBuyInputs, TokenBuyConfig } from './functions/tokenBuy';
import { sellTokenSingle, sellTokenBatch, validateTokenSellInputs, TokenSellConfig } from './functions/tokenSell';
import { consolidateSOL, validateConsolidationInputs } from './functions/consolidate';
import { getRouteQuote, getBuyQuote, getSellQuote, validateRouteQuoteInputs, RouteQuoteConfig, RouteQuoteResult } from './functions/routeQuote';
import { transferTokens, transferSOL, transferToken, batchTransfer, validateTransferInputs} from './functions/transfer';
import { createTokenSingle, createTokenBatch, validateTokenCreateInputs, TokenCreateConfig } from './functions/create';
import { burnToken, batchBurnToken, validateBurnInputs } from './functions/burn';
import { SDKConfig, Wallet, ValidationResult, ApiResponse, BatchResult, BundleResult } from './types';

/**
 * Main FurySDK class providing access to all Solana transaction operations
 */
export class FurySDK {
  /**
   * Initialize the SDK with configuration
   */
  constructor(config: SDKConfig) {
    configure(config);
  }

  /**
   * Update SDK configuration
   */
  public configure(config: SDKConfig): void {
    configure(config);
  }

  /**
   * Get current SDK configuration
   */
  public getConfig(): SDKConfig {
    return getConfig();
  }

  /**
   * Validate distribution inputs before executing
   */
  public validateDistribution(
    senderWallet: Wallet,
    recipientWallets: Wallet[],
    senderBalance?: number
  ): ValidationResult {
    return validateDistributionInputs(senderWallet, recipientWallets, senderBalance);
  }

  /**
   * Distribute SOL to multiple recipients
   */
  public async distributeSOL(
    senderWallet: Wallet,
    recipientWallets: Wallet[]
  ): Promise<ApiResponse<BundleResult[]>> {
    return distributeSOL(senderWallet, recipientWallets);
  }

  /**
   * Batch distribute SOL to multiple recipients with automatic batching
   */
  public async batchDistributeSOL(
    senderWallet: Wallet,
    recipientWallets: Wallet[]
  ): Promise<BatchResult> {
    return batchDistributeSOL(senderWallet, recipientWallets);
  }

  /**
   * Validate mixing inputs before executing
   */
  public validateMixing(
    senderWallet: Wallet,
    recipientWallets: Wallet[],
    senderBalance?: number
  ): ValidationResult {
    return validateMixingInputs(senderWallet, recipientWallets, senderBalance);
  }

  /**
   * Validate single recipient mixing inputs before executing
   */
  public validateSingleMixing(
    senderWallet: Wallet,
    recipientWallet: Wallet,
    senderBalance?: number
  ): ValidationResult {
    return validateSingleMixingInputs(senderWallet, recipientWallet, senderBalance);
  }


  /**
   * Mix SOL to a single recipient (optimized)
   */
  public async mixSOLToSingleRecipient(
    senderWallet: Wallet,
    recipientWallet: Wallet
  ): Promise<ApiResponse<BundleResult[]>> {
    return mixSOLToSingleRecipient(senderWallet, recipientWallet);
  }

  /**
   * Batch mix SOL to multiple recipients, processing one recipient at a time
   */
  public async batchMixSOL(
    senderWallet: Wallet,
    recipientWallets: Wallet[]
  ): Promise<BatchResult> {
    return batchMixSOL(senderWallet, recipientWallets);
  }

  /**
   * Validate token buy inputs before executing
   */
  public validateTokenBuy(
    wallets: Wallet[],
    tokenConfig: TokenBuyConfig
  ): { valid: boolean; error?: string } {
    return validateTokenBuyInputs(wallets, tokenConfig);
  }

  /**
   * Buy tokens for a single wallet
   */
  public async buyTokenSingle(
    wallet: Wallet,
    tokenConfig: TokenBuyConfig
  ): Promise<ApiResponse<BundleResult[]>> {
    return buyTokenSingle(wallet, tokenConfig);
  }

  /**
   * Buy tokens for multiple wallets (batch)
   */
  public async buyTokenBatch(
    wallets: Wallet[],
    tokenConfig: TokenBuyConfig,
    customAmounts?: number[]
  ): Promise<ApiResponse<BundleResult[][]>> {
    return buyTokenBatch(wallets, tokenConfig, customAmounts);
  }

  /**
   * Validate token sell inputs before executing
   */
  public validateTokenSell(
    wallets: Wallet[],
    tokenConfig: TokenSellConfig
  ): { valid: boolean; error?: string } {
    return validateTokenSellInputs(wallets, tokenConfig);
  }

  /**
   * Sell tokens for a single wallet
   */
  public async sellTokenSingle(
    wallet: Wallet,
    tokenConfig: TokenSellConfig
  ): Promise<ApiResponse<BundleResult[]>> {
    return sellTokenSingle(wallet, tokenConfig);
  }

  /**
   * Sell tokens for multiple wallets (batch)
   */
  public async sellTokenBatch(
    wallets: Wallet[],
    tokenConfig: TokenSellConfig,
    customPercentages?: number[]
  ): Promise<ApiResponse<BundleResult[][]>> {
    return sellTokenBatch(wallets, tokenConfig, customPercentages);
  }

  /**
   * Validate consolidation inputs before executing
   */
  public validateConsolidation(
    sourceWallets: Wallet[],
    receiverWallet: Wallet,
    percentage: number,
    sourceBalances?: Map<string, number>
  ): ValidationResult {
    return validateConsolidationInputs(sourceWallets, receiverWallet, percentage, sourceBalances);
  }

  /**
   * Consolidate SOL from multiple source wallets to a single receiver wallet
   */
  public async consolidateSOL(
    sourceWallets: Wallet[],
    receiverWallet: Wallet,
    percentage: number
  ): Promise<ApiResponse<BundleResult[]>> {
    return consolidateSOL(sourceWallets, receiverWallet, percentage);
  }

  /**
   * Validate route quote inputs before executing
   */
  public validateRouteQuote(
    config: RouteQuoteConfig
  ): { valid: boolean; error?: string } {
    return validateRouteQuoteInputs(config);
  }

  /**
   * Get route quote for token buy/sell operations
   */
  public async getRouteQuote(
    config: RouteQuoteConfig
  ): Promise<ApiResponse<RouteQuoteResult>> {
    return getRouteQuote(config);
  }

  /**
   * Get a buy quote for a specific token (convenience method)
   * @param tokenMintAddress - The token mint address
   * @param solAmount - Amount of SOL to spend
   * @param rpcUrl - Optional RPC URL override
   */
  public async getBuyQuote(
    tokenMintAddress: string,
    solAmount: number,
    rpcUrl?: string
  ): Promise<ApiResponse<RouteQuoteResult>> {
    return getBuyQuote(tokenMintAddress, solAmount, rpcUrl);
  }

  /**
   * Get a sell quote for a specific token (convenience method)
   * @param tokenMintAddress - The token mint address
   * @param tokenAmount - Amount of tokens to sell
   * @param rpcUrl - Optional RPC URL override
   */
  public async getSellQuote(
    tokenMintAddress: string,
    tokenAmount: number,
    rpcUrl?: string
  ): Promise<ApiResponse<RouteQuoteResult>> {
    return getSellQuote(tokenMintAddress, tokenAmount, rpcUrl);
  }



  /**
   * Validate transfer inputs before executing
   */
  public validateTransfer(
    senderWallet: Wallet,
    receiverAddress: string,
    amount: string,
    tokenAddress?: string
  ): ValidationResult {
    return validateTransferInputs(senderWallet, receiverAddress, amount, tokenAddress);
  }

  /**
   * Transfer SOL or tokens to a recipient
   */
  public async transferTokens(
    senderWallet: Wallet,
    receiverAddress: string,
    amount: string,
    tokenAddress?: string
  ): Promise<ApiResponse<BundleResult[]>> {
    return transferTokens(senderWallet, receiverAddress, amount, tokenAddress);
  }

  /**
   * Transfer SOL to a recipient (convenience method)
   */
  public async transferSOL(
    senderWallet: Wallet,
    recipientAddress: string,
    amount: string
  ): Promise<ApiResponse<BundleResult[]>> {
    return transferSOL(senderWallet, recipientAddress, amount);
  }

  /**
   * Transfer tokens to a recipient (convenience method)
   */
  public async transferToken(
    senderWallet: Wallet,
    recipientAddress: string,
    tokenMint: string,
    amount: string
  ): Promise<ApiResponse<BundleResult[]>> {
    return transferToken(senderWallet, recipientAddress, tokenMint, amount);
  }

  /**
   * Execute multiple transfers in sequence
   */
  public async batchTransfer(
    senderWallet: Wallet,
    transfers: Array<{
      receiverAddress: string;
      amount: string;
      tokenAddress?: string;
    }>
  ): Promise<BatchResult> {
    return batchTransfer(senderWallet, transfers);
  }

  /**
   * Validate token creation inputs before executing
   */
  public validateTokenCreate(
    wallets: Wallet[],
    config: TokenCreateConfig
  ): ValidationResult {
    return validateTokenCreateInputs(wallets, config);
  }

  /**
   * Create a token on the specified platform
   */
  public async createTokenSingle(
    wallets: Wallet[],
    config: TokenCreateConfig
  ): Promise<ApiResponse<BundleResult[]>> {
    return createTokenSingle(wallets, config);
  }

  /**
   * Create multiple tokens in batch with different configurations
   */
  public async createTokenBatch(
    walletConfigs: { wallets: Wallet[], config: TokenCreateConfig }[]
  ): Promise<ApiResponse<BundleResult[][]>> {
    return createTokenBatch(walletConfigs);
  }

  /**
   * Validate token burn inputs before executing
   */
  public validateTokenBurn(
    wallet: Wallet,
    tokenAddress: string,
    amount: string
  ): ValidationResult {
    return validateBurnInputs(wallet, tokenAddress, amount);
  }

  /**
   * Burn tokens from a wallet
   */
  public async burnToken(
    wallet: Wallet,
    tokenAddress: string,
    amount: string
  ): Promise<ApiResponse<BundleResult[]>> {
    return burnToken(wallet, tokenAddress, amount);
  }

  /**
   * Burn multiple tokens in batch
   */
  public async batchBurnToken(
    wallet: Wallet,
    burns: Array<{
      tokenAddress: string;
      amount: string;
    }>
  ): Promise<BatchResult> {
    return batchBurnToken(wallet, burns);
  }

  // Future endpoints can be added here as methods
}