import { FurySDK, Wallet, getWalletAddress, getWalletBalance } from '../src/index';

// Example usage of the transfer endpoints
async function transferExample() {
  console.log('🚀 FurySDK Transfer Example');
  console.log('============================\n');

  // Step 1: Initialize SDK with your API server URL
  const sdk = new FurySDK({
    apiUrl: 'https://solana.fury.bot', // Replace with your actual API URL
    rpcUrl: 'https://smart-special-thunder.solana-mainnet.quiknode.pro/1366b058465380d24920f9d348f85325455d398d/', // Replace with your preferred RPC
    rateLimitDelay: 1000,
    debug: false
  });

  console.log('✅ SDK initialized with config:', sdk.getConfig());

  // Step 2: Configure wallet data
  const senderWallet: Wallet = {
    privateKey: 'YOUR_SENDER_PRIVATE_KEY_HERE' // Replace with actual sender private key (base58)
  };

  const receiverAddress = 'Er7MbthAFMAbqDvjtHbV2kyWYXn2zvYvVrpTxZZowiJH';

  const senderAddress = getWalletAddress(senderWallet.privateKey);
  console.log(`📝 Configured sender: ${senderAddress}`);
  console.log(`📝 Configured receiver: ${receiverAddress}\n`);

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

  try {
    // Example 1: Transfer SOL
    console.log('\n=== SOL Transfer Example ===');
    const solTransferResult = await sdk.transferSOL(
      senderWallet,
      receiverAddress,
      '0.1' // 0.1 SOL
    );

    if (solTransferResult.success) {
      console.log('✅ SOL Transfer successful!');
      console.log('📋 Bundles Count:', solTransferResult.result?.length || 0);
      if (solTransferResult.result && solTransferResult.result.length > 0) {
        const firstBundle = solTransferResult.result[0];
        console.log('🔗 First Bundle Status:', !firstBundle.error ? 'Success' : 'Failed');
        if (firstBundle.result) {
          console.log('🆔 Bundle ID:', firstBundle.result.substring(0, 20) + '...');
        }
        if (firstBundle.error) {
          console.log('❌ Bundle Error:', firstBundle.error.message);
        }
      }
    } else {
      console.error('❌ SOL Transfer failed:', solTransferResult.error);
    }

    // Example 2: Transfer Token
    console.log('\n=== Token Transfer Example ===');
    const tokenAddress = 'token-mint-address-here'; // Replace with actual token mint address
    const tokenTransferResult = await sdk.transferToken(
      senderWallet,
      receiverAddress,
      tokenAddress, // Token mint address
      '100' // 100 tokens
    );

    if (tokenTransferResult.success) {
      console.log('✅ Token Transfer successful!');
      console.log('📋 Bundles Count:', tokenTransferResult.result?.length || 0);
      if (tokenTransferResult.result && tokenTransferResult.result.length > 0) {
        const firstBundle = tokenTransferResult.result[0];
        console.log('🔗 First Bundle Status:', !firstBundle.error ? 'Success' : 'Failed');
        if (firstBundle.result) {
          console.log('🆔 Bundle ID:', firstBundle.result.substring(0, 20) + '...');
        }
        if (firstBundle.error) {
          console.log('❌ Bundle Error:', firstBundle.error.message);
        }
      }
    } else {
      console.error('❌ Token Transfer failed:', tokenTransferResult.error);
    }
  } catch (error) {
    console.error('💥 Transfer example failed:', error);
  }

  console.log('\n🏁 Transfer example completed!');
}

// Run the example
if (require.main === module) {
  transferExample().catch(console.error);
}

export { transferExample };