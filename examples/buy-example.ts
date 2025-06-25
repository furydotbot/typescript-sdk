import { FurySDK, Wallet, TokenBuyConfig, getWalletAddress, validateWallet, validateAmount} from '../src/index';

// Initialize SDK (shared across all demos)
function initializeSDK(): FurySDK {
  return new FurySDK({
    apiUrl: 'https://solana.fury.bot', // Replace with actual API URL
    rpcUrl: 'https://smart-special-thunder.solana-mainnet.quiknode.pro/1366b058465380d24920f9d348f85325455d398d/', // Replace with your preferred RPC
    rateLimitDelay: 1000,
    debug: false
  });
}

// Demo 1: Single Wallet Token Buy (Multiple Protocols)
async function singleWalletDemo() {
  console.log('🚀 Demo 1: Single Wallet Token Buy');
  console.log('===================================\n');

  const sdk = initializeSDK();
  console.log('✅ SDK initialized with config:', sdk.getConfig());

  // Configure single wallet
  const buyerWallet: Wallet = {
    privateKey: 'YOUR_PRIVATE_KEY_HERE' // Replace with actual buyer private key (base58)
  };

  const buyerAddress = getWalletAddress(buyerWallet.privateKey);
  console.log(`📝 Configured buyer wallet: ${buyerAddress}\n`);

  try {
    // Example 1: PumpFun Protocol
    console.log('📦 Testing PumpFun Protocol');
    const pumpfunConfig: TokenBuyConfig = {
      tokenAddress: '3M1NJ5qgHNUC2CHynGjwDNis9FF4Nmjd1PUhUJUEpump', // Replace with actual token address
      solAmount: 0.01, // 0.01 SOL
      protocol: 'pumpfun',
      slippageBps: 100, // 1% slippage
      jitoTipLamports: 5000
    };
    
    const pumpfunValidation = sdk.validateTokenBuy([buyerWallet], pumpfunConfig);
    if (pumpfunValidation.valid) {
      console.log('✅ PumpFun validation passed');
      const pumpfunResult = await sdk.buyTokenSingle(buyerWallet, pumpfunConfig);
      if (pumpfunResult.success) {
        console.log('✅ PumpFun token buy successful!');
        console.log('📊 Results:', JSON.stringify(pumpfunResult.result, null, 2));
      } else {
        console.error('❌ PumpFun token buy failed:', pumpfunResult.error);
      }
    } else {
      console.error('❌ PumpFun validation failed:', pumpfunValidation.error);
    }

    // Example 2: Moonshot Protocol
    console.log('\n📦 Testing Moonshot Protocol');
    const moonshotConfig: TokenBuyConfig = {
      tokenAddress: '5BhVUdfeUEUysCfM4h5eqM7j1R1XnyeUwvisBzkdmoon', // Replace with actual token address
      solAmount: 0.02, // 0.02 SOL
      protocol: 'moonshot',
      slippageBps: 150, // 1.5% slippage
      jitoTipLamports: 7000
    };
    
    const moonshotValidation = sdk.validateTokenBuy([buyerWallet], moonshotConfig);
    if (moonshotValidation.valid) {
      console.log('✅ Moonshot validation passed');
      const moonshotResult = await sdk.buyTokenSingle(buyerWallet, moonshotConfig);
      if (moonshotResult.success) {
        console.log('✅ Moonshot token buy successful!');
        console.log('📊 Results:', JSON.stringify(moonshotResult.result, null, 2));
      } else {
        console.error('❌ Moonshot token buy failed:', moonshotResult.error);
      }
    } else {
      console.error('❌ Moonshot validation failed:', moonshotValidation.error);
    }

    // Example 3: Raydium Protocol
    console.log('\n📦 Testing Raydium Protocol');
    const raydiumConfig: TokenBuyConfig = {
      tokenAddress: '9JK2U7aEkp3tWaFNuaJowWRgNys5DVaKGxWk73VT5ray', // Replace with actual token address
      solAmount: 0.015, // 0.015 SOL
      protocol: 'raydium',
      slippageBps: 100, // 1% slippage
      jitoTipLamports: 8000
    };
    
    const raydiumValidation = sdk.validateTokenBuy([buyerWallet], raydiumConfig);
    if (raydiumValidation.valid) {
      console.log('✅ Raydium validation passed');
      const raydiumResult = await sdk.buyTokenSingle(buyerWallet, raydiumConfig);
      if (raydiumResult.success) {
        console.log('✅ Raydium token buy successful!');
        console.log('📊 Results:', JSON.stringify(raydiumResult.result, null, 2));
      } else {
        console.error('❌ Raydium token buy failed:', raydiumResult.error);
      }
    } else {
      console.error('❌ Raydium validation failed:', raydiumValidation.error);
    }

  } catch (error) {
    console.error('💥 Unexpected error in single wallet demo:', error);
  }

  console.log('\n🎉 Single wallet demo completed!\n');
}

// Demo 2: Multiple Wallets with Single Amount
async function multipleWalletsSingleAmountDemo() {
  console.log('🚀 Demo 2: Multiple Wallets with Single Amount');
  console.log('===============================================\n');

  const sdk = initializeSDK();
  console.log('✅ SDK initialized with config:', sdk.getConfig());

  // Configure multiple wallets
  const multipleBuyerWallets: Wallet[] = [
    {
      privateKey: 'YOUR_PRIVATE_KEY_1_HERE' // Replace with actual buyer private key (base58)
    },
    {
      privateKey: 'YOUR_PRIVATE_KEY_2_HERE' // Replace with actual buyer private key (base58)
    },
    {
      privateKey: 'YOUR_PRIVATE_KEY_3_HERE' // Replace with actual buyer private key (base58)
    }
  ];

  console.log(`📝 Configured ${multipleBuyerWallets.length} buyer wallets:`);
  multipleBuyerWallets.forEach((wallet, index) => {
    const walletAddress = getWalletAddress(wallet.privateKey);
    console.log(`   Wallet ${index + 1}: ${walletAddress}`);
  });
  console.log();

  try {
    // Single amount for all wallets
    const singleAmount = 0.02; // 0.02 SOL for each wallet
    console.log(`💰 Each wallet will buy with: ${singleAmount} SOL\n`);

    const batchConfig: TokenBuyConfig = {
      tokenAddress: 'DskreQ6yhL3DLzoSaZ19Wg3cv9kzfkiUdBSuSgvboop', // Replace with actual token address
      solAmount: singleAmount,
      protocol: 'boopfun',
      slippageBps: 100, // 1% slippage
      jitoTipLamports: 5000
    };
    
    const batchValidation = sdk.validateTokenBuy(multipleBuyerWallets, batchConfig);
    if (batchValidation.valid) {
      console.log('✅ Batch validation passed');
      console.log('🚀 Starting batch buy with single amount...');
      
      // Use the same amount for all wallets (no custom amounts array)
      const batchResult = await sdk.buyTokenBatch(multipleBuyerWallets, batchConfig);
      if (batchResult.success) {
        console.log('✅ Batch token buy successful!');
        console.log(`📊 Batch Summary: ${batchResult.result?.length || 0} bundles sent`);
        
        batchResult.result?.forEach((walletResult: any) => {
          if (Array.isArray(walletResult) && walletResult.length > 0) {
            walletResult.forEach((bundle: any, bundleIndex: number) => {
              console.log(`   📋 Bundle ${bundleIndex + 1}:`);
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
            console.log(`   📊 Raw Result:`, JSON.stringify(walletResult, null, 4));
          }
        });
        
        const totalSpent = singleAmount * multipleBuyerWallets.length;
        console.log(`\n🎉 Successfully bought tokens for ${multipleBuyerWallets.length} wallets`);
        console.log(`💰 Total SOL spent: ${totalSpent} SOL`);
      } else {
        console.error('❌ Batch token buy failed:', batchResult.error);
      }
    } else {
      console.error('❌ Batch validation failed:', batchValidation.error);
    }

  } catch (error) {
    console.error('💥 Unexpected error in multiple wallets single amount demo:', error);
  }

  console.log('\n🎉 Multiple wallets single amount demo completed!\n');
}

// Demo 3: Multiple Wallets with Custom Amounts
async function multipleWalletsCustomAmountsDemo() {
  console.log('🚀 Demo 3: Multiple Wallets with Custom Amounts');
  console.log('===============================================\n');

  const sdk = initializeSDK();
  console.log('✅ SDK initialized with config:', sdk.getConfig());

  // Configure multiple wallets
  const multipleBuyerWallets: Wallet[] = [
    {
      privateKey: 'YOUR_PRIVATE_KEY_1_HERE' // Replace with actual buyer private key (base58)
    },
    {
      privateKey: 'YOUR_PRIVATE_KEY_2_HERE' // Replace with actual buyer private key (base58)
    },
    {
      privateKey: 'YOUR_PRIVATE_KEY_3_HERE' // Replace with actual buyer private key (base58)
    },
    {
      privateKey: 'YOUR_PRIVATE_KEY_4_HERE' // Replace with actual buyer private key (base58)
    },
    {
      privateKey: 'YOUR_PRIVATE_KEY_5_HERE' // Replace with actual buyer private key (base58)
    },
    {
      privateKey: 'YOUR_PRIVATE_KEY_6_HERE' // Replace with actual buyer private key (base58)
    },
  ];
  
  // Define custom amounts for each wallet (in SOL)
  const customAmounts = [0.015, 0.025, 0.02, 0.025, 0.02, 0.02]; // Different amounts for each wallet
  
  // Display wallet addresses and their corresponding amounts
  console.log('📝 Batch Configuration with Custom Amounts:');
  multipleBuyerWallets.forEach((wallet, index) => {
    if (validateWallet(wallet)) {
      const walletAddress = getWalletAddress(wallet.privateKey);
      const amount = customAmounts[index];
      console.log(`   Wallet ${index + 1}: ${walletAddress} - ${amount} SOL`);
    } else {
      console.error(`   ❌ Invalid wallet ${index + 1}`);
    }
  });
  console.log();

  try {
    // Validate custom amounts
    const validAmounts = customAmounts.every(amount => validateAmount(amount.toString()));
    if (!validAmounts) {
      console.error('❌ Invalid custom amounts detected');
      return;
    }
    
    const batchConfig: TokenBuyConfig = {
      tokenAddress: 'DskreQ6yhL3DLzoSaZ19Wg3cv9kzfkiUdBSuSgvboop', // Replace with actual token address
      solAmount: 0.01, // Base amount (will be overridden by custom amounts)
      protocol: 'boopfun', // Using boopfun for batch example
      slippageBps: 100, // 1% slippage
      jitoTipLamports: 5000
    };
    
    const batchValidation = sdk.validateTokenBuy(multipleBuyerWallets, batchConfig);
    if (batchValidation.valid) {
      console.log('✅ Batch validation passed');
      console.log(`🚀 Starting batch buy with custom amounts: [${customAmounts.join(', ')}] SOL`);
      
      // Use custom amounts in the batch buy
      const batchResult = await sdk.buyTokenBatch(multipleBuyerWallets, batchConfig, customAmounts);
      if (batchResult.success) {
        console.log('✅ Batch token buy successful!');
        console.log(`📊 Batch Summary: ${batchResult.result?.length || 0} bundles sent`);
        
        batchResult.result?.forEach((walletResult: any) => {          
          if (Array.isArray(walletResult) && walletResult.length > 0) {
            walletResult.forEach((bundle: any, bundleIndex: number) => {
              console.log(`   📋 Bundle ${bundleIndex + 1}:`);
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
            console.log(`   📊 Raw Result:`, JSON.stringify(walletResult, null, 4));
          }
        });
        
        const totalSpent = customAmounts.reduce((sum, amount) => sum + amount, 0);
        console.log(`\n🎉 Successfully bought tokens for ${multipleBuyerWallets.length} wallets`);
        console.log(`💰 Total SOL spent: ${totalSpent} SOL`);
      } else {
        console.error('❌ Batch token buy failed:', batchResult.error);
      }
    } else {
      console.error('❌ Batch validation failed:', batchValidation.error);
    }

  } catch (error) {
    console.error('💥 Unexpected error in multiple wallets custom amounts demo:', error);
  }

  console.log('\n🎉 Multiple wallets custom amounts demo completed!\n');
}

// Main function to run all demos
async function runTokenBuyExample() {
  console.log('🚀 FurySDK Token Buy Examples');
  console.log('=============================\n');
  console.log('This example demonstrates three different token buying scenarios:\n');
  console.log('1. Single Wallet Demo - Test multiple protocols with one wallet');
  console.log('2. Multiple Wallets Single Amount Demo - Multiple wallets, same amount each');
  console.log('3. Multiple Wallets Custom Amounts Demo - Multiple wallets, different amounts\n');
  
  try {
    // Run all three demos
    await singleWalletDemo();
    await multipleWalletsSingleAmountDemo();
    await multipleWalletsCustomAmountsDemo();
    
    console.log('🎉 All token buy demos completed successfully!');
  } catch (error) {
    console.error('💥 Error running token buy examples:', error);
  }
}

// Individual demo exports for selective running
export { 
  singleWalletDemo, 
  multipleWalletsSingleAmountDemo, 
  multipleWalletsCustomAmountsDemo, 
  runTokenBuyExample 
};

// Main execution
if (require.main === module) {
  // Uncomment the demo you want to run:
  
  // Run all demos:
  // runTokenBuyExample();
  
  // Or run individual demos:
  // singleWalletDemo();
  // multipleWalletsSingleAmountDemo();
  multipleWalletsCustomAmountsDemo();
}

// Usage Instructions:
// 
// To run all demos:
// npx ts-node token-buy-example.ts
//
// To run individual demos, uncomment the desired function call above, or:
// npx ts-node -e "require('./token-buy-example').singleWalletDemo()"
// npx ts-node -e "require('./token-buy-example').multipleWalletsSingleAmountDemo()"
// npx ts-node -e "require('./token-buy-example').multipleWalletsCustomAmountsDemo()"