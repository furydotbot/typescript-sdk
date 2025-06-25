import { FurySDK, Wallet, getWalletAddress } from '../src/index';

async function runMixerExample() {
  console.log('🚀 FurySDK Mixer Example');
  console.log('========================\n');

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
    // amount is optional and not needed for sender
  };

  const singleRecipient: Wallet = {
    privateKey: 'YOUR_SINGLE_RECIPIENT_PRIVATE_KEY_HERE', // Replace with actual recipient private key (base58)
    amount: '0.01' // Amount in SOL to mix
  };

  const multipleRecipients: Wallet[] = [
    {
      privateKey: 'YOUR_RECIPIENT_PRIVATE_KEY_1_HERE', // Replace with actual recipient private key (base58)
      amount: '0.02' // Amount in SOL
    },
    {
      privateKey: 'YOUR_RECIPIENT_PRIVATE_KEY_2_HERE', // Replace with actual recipient private key (base58)
      amount: '0.015' // Amount in SOL
    },
    {
      privateKey: 'YOUR_RECIPIENT_PRIVATE_KEY_3_HERE', // Replace with actual recipient private key (base58)
      amount: '0.015' // Amount in SOL
    }
  ];

  const senderAddress = getWalletAddress(senderWallet.privateKey);
  console.log(`📝 Configured sender: ${senderAddress}`);
  console.log(`📝 Configured single recipient and ${multipleRecipients.length} batch recipients\n`);

  try {
    console.log('🚀 Starting mixer examples...');
    // Example
    console.log('\n📦 Example: Multiple Recipients Mixing');
    
    // Validate inputs first
    const multiValidation = sdk.validateMixing(senderWallet, multipleRecipients);
    if (!multiValidation.valid) {
      console.error('❌ Multiple mixing validation failed:', multiValidation.error);
    } else {
      console.log('✅ Multiple mixing validation passed');
      
      const batchResult = await sdk.batchMixSOL(senderWallet, multipleRecipients);
      if (batchResult.success) {
        console.log('✅ Batch mixing successful!');
        console.log(`\n📊 Batch Summary: ${batchResult.results?.length || 0} recipients processed`);
        
        // Display results for each recipient
        batchResult.results?.forEach((result: any, index: number) => {
          console.log(`\n📦 Recipient ${index + 1}:`);
          if (Array.isArray(result) && result.length > 0) {
            result.forEach((bundle: any, bundleIndex: number) => {
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
            console.log(`   📊 Raw Result:`, JSON.stringify(result, null, 4));
          }
        });
        
        console.log(`🎉 Successfully mixed SOL to ${multipleRecipients.length} recipients`);
      } else {
        console.error('❌ Batch mixing failed:', batchResult.error);
      }
    }
  } catch (error) {
    console.error('💥 Unexpected mixer error:', error);
  }
}

// Main execution
if (require.main === module) {
  runMixerExample();
}

export { runMixerExample };