import { getConfig, debugLog, debugError } from '../utils';
import { ApiResponse } from '../types';

// Supported protocols
export type SupportedProtocol = 'boopfun' | 'pumpfun' | 'moonshot' | 'raydium' | 'jupiter' | 'orca';

// Action types
export type QuoteAction = 'buy' | 'sell';

// Enhanced interfaces based on actual API response
export interface RouteQuoteConfig {
  /** The action to perform - buy or sell */
  action: QuoteAction;
  /** The token mint address to get quotes for */
  tokenMintAddress: string;
  /** The amount to buy/sell (SOL for buy, tokens for sell) */
  amount: number;
  /** Optional RPC URL override */
  rpcUrl?: string;
}

// Actual API response structure based on test results
export interface RouteQuoteResponse {
  success: boolean;
  action: QuoteAction;
  protocol: SupportedProtocol;
  tokenMintAddress: string;
  inputAmount: number;
  outputAmount: string;
}

// Enhanced result interface with helper methods
export interface RouteQuoteResult extends RouteQuoteResponse {
  /** Get the output amount as a number */
  getOutputAmountAsNumber(): number;
  /** Get the exchange rate (output/input) */
  getExchangeRate(): number;
  /** Check if this is a buy operation */
  isBuyOperation(): boolean;
  /** Check if this is a sell operation */
  isSellOperation(): boolean;
  /** Get a human-readable summary */
  getSummary(): string;
}

// Helper class to enhance the API response
class EnhancedRouteQuote implements RouteQuoteResult {
  success: boolean;
  action: QuoteAction;
  protocol: SupportedProtocol;
  tokenMintAddress: string;
  inputAmount: number;
  outputAmount: string;

  constructor(response: RouteQuoteResponse) {
    this.success = response.success;
    this.action = response.action;
    this.protocol = response.protocol;
    this.tokenMintAddress = response.tokenMintAddress;
    this.inputAmount = response.inputAmount;
    this.outputAmount = response.outputAmount;
  }

  getOutputAmountAsNumber(): number {
    return parseFloat(this.outputAmount);
  }

  getExchangeRate(): number {
    const output = this.getOutputAmountAsNumber();
    return this.inputAmount > 0 ? output / this.inputAmount : 0;
  }

  isBuyOperation(): boolean {
    return this.action === 'buy';
  }

  isSellOperation(): boolean {
    return this.action === 'sell';
  }

  getSummary(): string {
    const rate = this.getExchangeRate();
    if (this.isBuyOperation()) {
      return `Buy ${this.inputAmount} SOL → ${this.getOutputAmountAsNumber().toLocaleString()} tokens (Rate: ${rate.toFixed(2)} tokens/SOL) via ${this.protocol}`;
    } else {
      return `Sell ${this.inputAmount.toLocaleString()} tokens → ${this.getOutputAmountAsNumber().toLocaleString()} lamports (Rate: ${rate.toFixed(2)} lamports/token) via ${this.protocol}`;
    }
  }
}

/**
 * Get route quote from the API with enhanced result
 */
export const getRouteQuote = async (
  config: RouteQuoteConfig
): Promise<ApiResponse<RouteQuoteResult>> => {
  try {
    const sdkConfig = getConfig();
    const baseUrl = sdkConfig.apiUrl?.replace(/\/+$/, '');
    
    debugLog('🔗 [DEBUG] Getting route quote from:', `${baseUrl}/api/tokens/route`);
    debugLog('📦 [DEBUG] Request payload:', {
      action: config.action,
      tokenMintAddress: config.tokenMintAddress,
      amount: config.amount,
      rpcUrl: config.rpcUrl || sdkConfig.rpcUrl || 'https://api.mainnet-beta.solana.com'
    });
    
    const response = await fetch(`${baseUrl}/api/tokens/route`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: config.action,
        tokenMintAddress: config.tokenMintAddress,
        amount: config.amount,
        rpcUrl: config.rpcUrl || sdkConfig.rpcUrl || 'https://api.mainnet-beta.solana.com'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      debugError('❌ [DEBUG] API Error Response:', errorText);
      throw new Error(`HTTP error! Status: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as RouteQuoteResponse;
    debugLog('✅ [DEBUG] Route quote API response:', data);
    
    // Return enhanced result with helper methods
    const enhancedResult = new EnhancedRouteQuote(data);
    
    return {
      success: true,
      result: enhancedResult
    };
  } catch (error) {
    debugError('❌ [DEBUG] Route quote error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Convenience method to get a buy quote
 */
export const getBuyQuote = async (
  tokenMintAddress: string,
  solAmount: number,
  rpcUrl?: string
): Promise<ApiResponse<RouteQuoteResult>> => {
  return getRouteQuote({
    action: 'buy',
    tokenMintAddress,
    amount: solAmount,
    rpcUrl
  });
};

/**
 * Convenience method to get a sell quote
 */
export const getSellQuote = async (
  tokenMintAddress: string,
  tokenAmount: number,
  rpcUrl?: string
): Promise<ApiResponse<RouteQuoteResult>> => {
  return getRouteQuote({
    action: 'sell',
    tokenMintAddress,
    amount: tokenAmount,
    rpcUrl
  });
};

/**
 * Compare buy and sell quotes for the same token
 */
export const compareQuotes = async (
  tokenMintAddress: string,
  solAmount: number,
  tokenAmount: number,
  rpcUrl?: string
): Promise<{
  buyQuote?: RouteQuoteResult;
  sellQuote?: RouteQuoteResult;
  buySuccess: boolean;
  sellSuccess: boolean;
  comparison?: string;
}> => {
  const [buyResult, sellResult] = await Promise.all([
    getBuyQuote(tokenMintAddress, solAmount, rpcUrl),
    getSellQuote(tokenMintAddress, tokenAmount, rpcUrl)
  ]);

  const result = {
    buyQuote: buyResult.result,
    sellQuote: sellResult.result,
    buySuccess: buyResult.success,
    sellSuccess: sellResult.success,
    comparison: undefined as string | undefined
  };

  if (buyResult.success && sellResult.success && buyResult.result && sellResult.result) {
    const buyRate = buyResult.result.getExchangeRate();
    const sellRate = sellResult.result.getExchangeRate();
    result.comparison = `Buy: ${buyRate.toFixed(2)} tokens/SOL | Sell: ${sellRate.toFixed(2)} lamports/token`;
  }

  return result;
};

/**
 * Validate route quote inputs
 */
export const validateRouteQuoteInputs = (
  config: RouteQuoteConfig
): { valid: boolean; error?: string } => {
  if (!config.tokenMintAddress || config.tokenMintAddress.trim() === '') {
    return { valid: false, error: 'Token mint address is required' };
  }

  if (!config.amount || config.amount <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }

  if (!['buy', 'sell'].includes(config.action)) {
    return { valid: false, error: 'Action must be either "buy" or "sell"' };
  }

  return { valid: true };
};