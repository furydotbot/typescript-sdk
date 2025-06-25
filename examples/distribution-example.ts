import { FurySDK, Wallet, getWalletAddress, getWalletBalance } from '../src/index';

async function runDistributionExample() {
  console.log('🚀 FurySDK Distribution Example');
  console.log('================================\n');

  // Step 1: Initialize SDK with your API server URL
  const sdk = new FurySDK({
    apiUrl: 'https://solana.fury.bot', // Replace with actual API URL
    rpcUrl: 'https://smart-special-thunder.solana-mainnet.quiknode.pro/1366b058465380d24920f9d348f85325455d398d/', // Replace with your preferred RPC
    rateLimitDelay: 1000,
    debug: false
  });

  console.log('✅ SDK initialized with config:', sdk.getConfig());

  // Step 2: Configure wallet data
  const senderWallet: Wallet = {
    privateKey: 'YOUR_SENDER_PRIVATE_KEY_HERE' // Replace with actual sender private key (base58)
    
  };

  const recipientWallets: Wallet[] = [
    {
      privateKey: 'YOUR_RECIPIENT_PRIVATE_KEY_1_HERE', // Replace with actual recipient private key (base58)
      amount: '0.01' // Amount in SOL
    },
    {
      privateKey: 'YOUR_RECIPIENT_PRIVATE_KEY_2_HERE', // Replace with actual recipient private key (base58)
      amount: '0.02' // Amount in SOL
    },
    {
      privateKey: 'YOUR_RECIPIENT_PRIVATE_KEY_3_HERE', // Replace with actual recipient private key (base58)
      amount: '0.015' // Amount in SOL
    },
    {
      privateKey: 'YOUR_RECIPIENT_PRIVATE_KEY_4_HERE', // Replace with actual recipient private key (base58)
      amount: '0.015' // Amount in SOL
    }
  ];

  // Get sender address from private key
  const senderAddress = getWalletAddress(senderWallet.privateKey);
  console.log(`📝 Configured sender: ${senderAddress}`);
  console.log(`📝 Configured ${recipientWallets.length} recipients\n`);

  // Step 3: Optional balance check
  let senderBalance: number | undefined;
  const enableBalanceCheck = true; // Set to false to skip balance checking
  
  if (enableBalanceCheck) {
    try {
      console.log('🔍 Checking sender balance...');
      senderBalance = await getWalletBalance(senderWallet.privateKey, 'https://api.mainnet-beta.solana.com');
      console.log(`💰 Sender balance: ${senderBalance} SOL`);
    } catch (error) {
      console.warn('⚠️  Could not check balance, proceeding without balance validation:', error);
    }
  }

  // Step 4: Validate distribution inputs
  const validation = sdk.validateDistribution(senderWallet, recipientWallets, senderBalance);
  
  if (!validation.valid) {
    console.error('❌ Validation failed:', validation.error);
    return;
  }
  
  console.log('✅ Validation passed\n');

  try {
    // Step 5: Execute SOL distribution
    console.log('🔄 Starting SOL distribution...');
    
    // For small batches (≤3 recipients), use regular distribution
    if (recipientWallets.length <= 3) {
      const result = await sdk.distributeSOL(senderWallet, recipientWallets);
      
      if (result.success) {
        console.log('✅ Distribution successful!');
        console.log('\n📊 Transaction Results:');
        
        if (Array.isArray(result.result)) {
          result.result.forEach((bundle: any, index: number) => {
            console.log(`📦 Bundle ${index + 1}:`);
            if (bundle && typeof bundle === 'object' && bundle.jito) {
              console.log(`   🔗 Jito Bundle ID: ${bundle.jito}`);
              console.log(`   🌐 Explorer: https://explorer.jito.wtf/bundle/${bundle.jito}`);
            }
            if (bundle && typeof bundle === 'object' && bundle.signature) {
              console.log(`   ✍️  Transaction: ${bundle.signature}`);
              console.log(`   🌐 Explorer: https://solscan.io/tx/${bundle.signature}`);
            }
            console.log('');
          });
        } else {
          console.log('📊 Raw Results:', JSON.stringify(result.result, null, 2));
        }
      } else {
        console.error('❌ Distribution failed:', result.error);
      }
    } else {
      // For larger batches, use batch distribution
      console.log('📦 Using batch distribution for multiple recipients...');
      const batchResult = await sdk.batchDistributeSOL(senderWallet, recipientWallets);
      
      if (batchResult.success) {
        console.log('✅ Batch distribution successful!');
        console.log(`\n📊 Batch Summary: ${batchResult.results?.length} batches processed`);
        
        batchResult.results?.forEach((batch: any, batchIndex: number) => {
          console.log(`\n📦 Batch ${batchIndex + 1}:`);
          if (Array.isArray(batch)) {
            batch.forEach((bundle: any, bundleIndex: number) => {
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
            console.log(`   📊 Raw Result:`, JSON.stringify(batch, null, 4));
          }
        });
        
        console.log(`🎉 Successfully distributed SOL to ${recipientWallets.length} recipients across ${batchResult.results?.length} batches`);
      } else {
        console.error('❌ Batch distribution failed:', batchResult.error);
      }
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Main execution
if (require.main === module) {
  runDistributionExample();
}

export { runDistributionExample };