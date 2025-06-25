import { FurySDK, Wallet, getWalletBalance, getWalletAddress  } from '../src/index';

// Example usage of the burn endpoints
async function burnExample() {
  console.log('🔥 FurySDK Burn Example');
  console.log('========================\n');

  // Step 1: Initialize SDK with your API server URL
  const sdk = new FurySDK({
    apiUrl: 'https://solana.fury.bot', // Replace with your actual API URL
    rpcUrl: 'https://smart-special-thunder.solana-mainnet.quiknode.pro/1366b058465380d24920f9d348f85325455d398d/', // Replace with your preferred RPC
    rateLimitDelay: 1000,
    debug: false
  });

  console.log('✅ SDK initialized with config:', sdk.getConfig());

  // Step 2: Configure wallet data
  const wallet: Wallet = {
    privateKey: 'YOUR_PRIVATE_KEY_HERE' // Replace with actual private key (base58)
  };

  const walletAddress = getWalletAddress(wallet.privateKey);
  console.log(`📝 Configured wallet: ${walletAddress}\n`);

  // Step 3: Optional balance check
  let walletBalance: number | undefined;
  const enableBalanceCheck = true; // Set to false to skip balance checking
  
  if (enableBalanceCheck) {
    try {
      console.log('🔍 Checking wallet balance...');
      walletBalance = await getWalletBalance(wallet.privateKey, 'https://api.mainnet-beta.solana.com');
      console.log(`💰 Wallet balance: ${walletBalance} SOL`);
    } catch (error) {
      console.warn('⚠️  Could not check balance, proceeding without balance validation:', error);
    }
  }

  try {
    // Example 1: Single Token Burn
    console.log('\n=== Single Token Burn Example ===');
    const tokenAddress = 'EENVonyMz2c1khtfn7ftQcWPy8UnwV6A6URXeuwhbonk'; // Replace with actual token mint address
    const burnAmount = '100'; // Amount of tokens to burn
    
    // Validate burn inputs first
    const validation = sdk.validateTokenBurn(wallet, tokenAddress, burnAmount);
    if (!validation.valid) {
      console.error('❌ Burn validation failed:', validation.error);
      return;
    }
    console.log('✅ Burn inputs validated successfully');
    
    const burnResult = await sdk.burnToken(
      wallet,
      tokenAddress,
      burnAmount
    );

    if (burnResult.success) {
      console.log('✅ Token Burn successful!');
      console.log('📋 Bundles Count:', burnResult.result?.length || 0);
      if (burnResult.result && burnResult.result.length > 0) {
        const firstBundle = burnResult.result[0];
        console.log('🔗 First Bundle Status:', !firstBundle.error ? 'Success' : 'Failed');
        if (firstBundle.result) {
          console.log('🆔 Bundle ID:', firstBundle.result.substring(0, 20) + '...');
        }
        if (firstBundle.error) {
          console.log('❌ Bundle Error:', firstBundle.error.message);
        }
      }
    } else {
      console.error('❌ Token Burn failed:', burnResult.error);
    }

    // Example 2: Batch Token Burn
    console.log('\n=== Batch Token Burn Example ===');
    const burnOperations = [
      {
        tokenAddress: 'token-mint-address-1', // Replace with actual token mint address
        amount: '50'
      },
      {
        tokenAddress: 'token-mint-address-2', // Replace with actual token mint address
        amount: '25'
      }
    ];
    
    const batchBurnResult = await sdk.batchBurnToken(
      wallet,
      burnOperations
    );

    if (batchBurnResult.success) {
      console.log('✅ Batch Token Burn successful!');
      console.log('📋 Operations Count:', batchBurnResult.results?.length || 0);
      if (batchBurnResult.results) {
        batchBurnResult.results.forEach((result, index) => {
          console.log(`🔥 Burn ${index + 1}:`, result?.length || 0, 'bundles');
        });
      }
    } else {
      console.error('❌ Batch Token Burn failed:', batchBurnResult.error);
    }

  } catch (error) {
    console.error('💥 Burn example failed:', error);
  }

  console.log('\n🏁 Burn example completed!');
}

// Run the example
if (require.main === module) {
  burnExample().catch(console.error);
}

export { burnExample };