import { FurySDK, Wallet } from '../src/index';

// Example usage of the consolidate endpoint
async function consolidateExample() {
  // Initialize the SDK
  const sdk = new FurySDK({
    apiUrl: 'https://solana.fury.bot', // Replace with actual API URL
    rpcUrl: 'https://smart-special-thunder.solana-mainnet.quiknode.pro/1366b058465380d24920f9d348f85325455d398d/', // Replace with your preferred RPC
    rateLimitDelay: 1000,
    debug: false
  });

  // Define source wallets (wallets to consolidate FROM)
  const sourceWallets: Wallet[] = [
    {
      privateKey: 'YOUR_SOURCE_PRIVATE_KEY_1_HERE' // Replace with actual private key
    },
    {
      privateKey: 'YOUR_SOURCE_PRIVATE_KEY_2_HERE' // Replace with actual private key
    },
    {
      privateKey: 'YOUR_SOURCE_PRIVATE_KEY_3_HERE' // Replace with actual private key
    }
  ];

  // Define receiver wallet (wallet to consolidate TO)
  const receiverWallet: Wallet = {
    privateKey: 'YOUR_RECEIVER_PRIVATE_KEY_HERE' // Replace with actual private key
  };

  // Percentage of SOL to consolidate (1-100)
  const percentage = 10; // Consolidate 80% of SOL from each source wallet

  try {
    // Validate inputs before executing
    const validation = sdk.validateConsolidation(
      sourceWallets,
      receiverWallet,
      percentage
    );

    if (!validation.valid) {
      console.error('Validation failed:', validation.error);
      return;
    }

    console.log('✅ Validation passed, starting consolidation...');

    // Execute the consolidation
    const result = await sdk.consolidateSOL(
      sourceWallets,
      receiverWallet,
      percentage
    );

    if (result.success) {
      console.log('🎉 Consolidation completed successfully!');
      console.log('Bundle results:', result.result);
      
      // Log bundle IDs if available
      result.result?.forEach((bundle, index) => {
        if (bundle.result) {
          console.log(`Bundle ${index + 1} ID:`, bundle.result);
        }
      });
    } else {
      console.error('❌ Consolidation failed:', result.error);
    }
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Export examples for use
export { consolidateExample };

// Uncomment to run the example
consolidateExample();