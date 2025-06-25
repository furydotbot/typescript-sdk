import { FurySDK, Wallet, TokenSellConfig, getWalletAddress } from '../src/index';

// Initialize SDK 
function initializeSDK(): FurySDK {
  return new FurySDK({
    apiUrl: 'https://solana.fury.bot', // Replace with actual API URL
    rpcUrl: 'https://smart-special-thunder.solana-mainnet.quiknode.pro/1366b058465380d24920f9d348f85325455d398d/', // Replace with your preferred RPC
    rateLimitDelay: 1000,
    debug: false
  });
}

// Demo 1: Single Wallet Token Sell (Multiple Protocols)
async function singleWalletDemo() {
  console.log('🚀 Demo 1: Single Wallet Token Sell');
  console.log('===================================\n');

  const sdk = initializeSDK();
  console.log('✅ SDK initialized with config:', sdk.getConfig());

  // Configure single wallet
  const sellerWallet: Wallet = {
    privateKey: 'YOUR_SELLER_PRIVATE_KEY_HERE' // Replace with actual seller private key (base58)
  };

  const sellerAddress = getWalletAddress(sellerWallet.privateKey);
  console.log(`📝 Configured seller wallet: ${sellerAddress}\n`);

  try {
    // Example 1: PumpFun Protocol
    console.log('📦 Testing PumpFun Protocol');
    const pumpfunConfig: TokenSellConfig = {
      tokenAddress: '3M1NJ5qgHNUC2CHynGjwDNis9FF4Nmjd1PUhUJUEpump', // Replace with actual token address
      sellPercent: 50, // Sell 50% of tokens
      protocol: 'pumpfun',
      slippageBps: 100, // 1% slippage
      jitoTipLamports: 5000
    };
    
    const pumpfunValidation = sdk.validateTokenSell([sellerWallet], pumpfunConfig);
    if (pumpfunValidation.valid) {
      console.log('✅ PumpFun validation passed');
      const pumpfunResult = await sdk.sellTokenSingle(sellerWallet, pumpfunConfig);
      if (pumpfunResult.success) {
        console.log('✅ PumpFun token sell successful!');
        console.log('📊 Results:', JSON.stringify(pumpfunResult.result, null, 2));
      } else {
        console.error('❌ PumpFun token sell failed:', pumpfunResult.error);
      }
    } else {
      console.error('❌ PumpFun validation failed:', pumpfunValidation.error);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Example 2: Moonshot Protocol
    console.log('📦 Testing Moonshot Protocol');
    const moonshotConfig: TokenSellConfig = {
      tokenAddress: 'CzLSujWBLFsSjncfkh59rUFqvafWcY5tzedWJSuypump', // Replace with actual token address
      sellPercent: 25, // Sell 25% of tokens
      protocol: 'moonshot',
      slippageBps: 150, // 1.5% slippage
      jitoTipLamports: 7500
    };
    
    const moonshotValidation = sdk.validateTokenSell([sellerWallet], moonshotConfig);
    if (moonshotValidation.valid) {
      console.log('✅ Moonshot validation passed');
      const moonshotResult = await sdk.sellTokenSingle(sellerWallet, moonshotConfig);
      if (moonshotResult.success) {
        console.log('✅ Moonshot token sell successful!');
        console.log('📊 Results:', JSON.stringify(moonshotResult.result, null, 2));
      } else {
        console.error('❌ Moonshot token sell failed:', moonshotResult.error);
      }
    } else {
      console.error('❌ Moonshot validation failed:', moonshotValidation.error);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Example 3: Raydium Protocol
    console.log('📦 Testing Raydium Protocol');
    const raydiumConfig: TokenSellConfig = {
      tokenAddress: 'So11111111111111111111111111111111111111112', // Replace with actual token address
      sellPercent: 100, // Sell 100% of tokens
      protocol: 'raydium',
      slippageBps: 200, // 2% slippage
      jitoTipLamports: 10000
    };
    
    const raydiumValidation = sdk.validateTokenSell([sellerWallet], raydiumConfig);
    if (raydiumValidation.valid) {
      console.log('✅ Raydium validation passed');
      const raydiumResult = await sdk.sellTokenSingle(sellerWallet, raydiumConfig);
      if (raydiumResult.success) {
        console.log('✅ Raydium token sell successful!');
        console.log('📊 Results:', JSON.stringify(raydiumResult.result, null, 2));
      } else {
        console.error('❌ Raydium token sell failed:', raydiumResult.error);
      }
    } else {
      console.error('❌ Raydium validation failed:', raydiumValidation.error);
    }

  } catch (error) {
    console.error('❌ Single wallet demo error:', error);
  }
}

// Demo 2: Multi-Wallet Batch Token Sell
async function batchWalletDemo() {
  console.log('🚀 Demo 2: Multi-Wallet Batch Token Sell');
  console.log('========================================\n');

  const sdk = initializeSDK();

  // Configure multiple wallets
  const sellerWallets:  Wallet[] = [
    {
      privateKey: 'YOUR_SELLER_PRIVATE_KEY_1_HERE' // Replace with actual seller private key (base58)
    },
    {
      privateKey: 'YOUR_SELLER_PRIVATE_KEY_2_HERE' // Replace with actual seller private key (base58)
    },
    {
      privateKey: 'YOUR_SELLER_PRIVATE_KEY_3_HERE' // Replace with actual seller private key (base58)
    },
    {
      privateKey: 'YOUR_SELLER_PRIVATE_KEY_4_HERE' // Replace with actual seller private key (base58)
    },
    {
      privateKey: 'YOUR_SELLER_PRIVATE_KEY_5_HERE' // Replace with actual seller private key (base58)
    },
    {
      privateKey: 'YOUR_SELLER_PRIVATE_KEY_6_HERE' // Replace with actual seller private key (base58)
    },
  ];

  console.log('📝 Configured seller wallets:');
  sellerWallets.forEach((wallet, index) => {
    const address = getWalletAddress(wallet.privateKey);
    console.log(`   ${index + 1}. ${address}`);
  });
  console.log();

  try {
    // Batch sell with uniform percentage
    console.log('📦 Batch Sell');
    const batchConfig: TokenSellConfig = {
      tokenAddress: 'DskreQ6yhL3DLzoSaZ19Wg3cv9kzfkiUdBSuSgvboop', // Replace with actual token address
      sellPercent: 100, // Sell 100% from each wallet
      protocol: 'boopfun',
      slippageBps: 100,
      jitoTipLamports: 5000
    };
    
    const batchValidation = sdk.validateTokenSell(sellerWallets, batchConfig);
    if (batchValidation.valid) {
      console.log('✅ Batch validation passed');
      const batchResult = await sdk.sellTokenBatch(sellerWallets, batchConfig);
      if (batchResult.success) {
        console.log('✅ Batch token sell successful!');
        console.log(`📊 Batch Summary: ${batchResult.result?.length || 0} bundles sent`);
        
        batchResult.result?.forEach((bundleResults, index) => {
          if (Array.isArray(bundleResults) && bundleResults.length > 0) {
            bundleResults.forEach((bundle: any, bundleIndex: any) => {
              console.log(`   📋 Bundle ${index + 1}:`);
              if (bundle && typeof bundle === 'object' && bundle.jito) {
                console.log(`      🔗 Jito Bundle ID: ${bundle.jito}`);
                console.log(`      🌐 Explorer: https://explorer.jito.wtf/bundle/${bundle.jito}`);
              }
              if (bundle && typeof bundle === 'object' && bundle.signature) {
                console.log(`      ✍️  Transaction: ${bundle.signature}`);
                console.log(`      🌐 Explorer: https://solscan.io/tx/${bundle.signature}`);
              }
            });
          } else {
            console.log(`   📊 Raw Result:`, JSON.stringify(bundleResults, null, 4));
          }
        });
      } else {
        console.error('❌ Batch token sell failed:', batchResult.error);
      }
    } else {
      console.error('❌ Batch validation failed:', batchValidation.error);
    }

    console.log('\n' + '='.repeat(50) + '\n');

  } catch (error) {
    console.error('❌ Batch wallet demo error:', error);
  }
}
// Main execution function
async function main() {
  console.log('🎯 Fury SDK Token Sell Examples');
  console.log('================================\n');
  
  try {
    // Run all demos
    //await singleWalletDemo();
    await batchWalletDemo();
    
    console.log('\n🎉 All token sell demos completed!');
  } catch (error) {
    console.error('❌ Demo execution error:', error);
  }
}

// Run the examples
if (require.main === module) {
  main().catch(console.error);
}

export {
  singleWalletDemo,
  batchWalletDemo,
};