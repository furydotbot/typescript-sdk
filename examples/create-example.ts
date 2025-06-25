import { FurySDK, TokenCreateConfig, Wallet, Platform, createKeypairFromPrivateKey } from '../src/index';

// Initialize SDK
const sdk = new FurySDK({
  apiUrl: 'https://solana.fury.bot',
  debug: false
});

// Example wallets (replace with your actual private keys)
const wallets: Wallet[] = [
  {
    privateKey: 'YOUR_CREATOR_PRIVATE_KEY_HERE', // Creator wallet
  },
  {
    privateKey: 'YOUR_BUYER_PRIVATE_KEY_1_HERE', // Buyer wallet 1
  },
  {
    privateKey: 'YOUR_BUYER_PRIVATE_KEY_2_HERE', // Buyer wallet 2
  }
];

// Helper function to automatically derive wallet addresses from private keys
function getWalletAddresses(wallets: Wallet[]): string[] {
  return wallets.map(wallet => {
    const keypair = createKeypairFromPrivateKey(wallet.privateKey);
    return keypair.publicKey.toBase58();
  });
}

// Example 1: Basic token creation on Pump platform
async function createBasicToken() {
  console.log('🚀 Creating basic token on Pump platform...');
  
  const config: TokenCreateConfig = {
    platform: 'bonk' as Platform,
    metadata: {
      name: 'My Test Token',
      symbol: 'MTT',
      description: 'A test token created with FurySDK',
      image: 'https://www.favicon.cc/logo3d/216499.png'
    },
    wallets: getWalletAddresses(wallets), // Automatically derive addresses from private keys
    amounts: [0.01,0.01,0.01] // Same amount for all wallets
  };
  
  try {
    // Validate inputs first
    const validation = sdk.validateTokenCreate(wallets, config);
    if (!validation.valid) {
      console.error('❌ Validation failed:', validation.error);
      return;
    }
    
    // Create the token
    const result = await sdk.createTokenSingle(wallets, config);
    
    if (result.success) {
      console.log('✅ Token created successfully!');
      console.log('📦 Bundle results:', result.result);
    } else {
      console.error('❌ Token creation failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Example 2: Advanced token creation with different amounts per wallet
async function createAdvancedToken() {
  console.log('🚀 Creating advanced token on Moon platform...');
  
  const config: TokenCreateConfig = {
    platform: 'moon' as Platform,
    metadata: {
      name: 'Moon Token',
      symbol: 'MOON',
      description: 'To the moon! 🚀',
      image: 'https://example.com/moon-token.png',
      twitter: 'https://twitter.com/moontoken',
      telegram: 'https://t.me/moontoken',
      website: 'https://moontoken.com'
    },
    wallets: getWalletAddresses(wallets), // Automatically derive addresses from private keys
    amounts: [0.5, 0.1, 0.2], // Different amounts per wallet
    platformConfig: {
      trading: {
        slippageBps: 150 // 1.5% slippage
      },
      jito: {
        tipAmount: 0.001 // 0.001 SOL tip
      }
    }
  };
  
  try {
    const result = await sdk.createTokenSingle(wallets, config);
    
    if (result.success) {
      console.log('✅ Advanced token created successfully!');
      console.log('📦 Bundle results:', result.result);
    } else {
      console.error('❌ Token creation failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Example 3: Bonk platform with meme type
async function createBonkToken() {
  console.log('🚀 Creating Bonk meme token...');
  
  const config: TokenCreateConfig = {
    platform: 'bonk' as Platform,
    metadata: {
      name: 'Bonk Meme',
      symbol: 'BONK',
      description: 'Bonking to the moon! 🐕',
      image: 'https://example.com/bonk-meme.png',
      decimals: 9
    },
    wallets: getWalletAddresses(wallets).slice(0, 2), // Use first 2 wallet addresses
    amounts: [0.2, 0.1],
    platformConfig: {
      type: 'meme' // Bonk-specific configuration
    }
  };
  
  try {
    const result = await sdk.createTokenSingle(wallets, config);
    
    if (result.success) {
      console.log('✅ Bonk token created successfully!');
      console.log('📦 Bundle results:', result.result);
    } else {
      console.error('❌ Token creation failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run examples
async function runExamples() {
  console.log('🎯 FurySDK Token Creation Examples\n');
  
  // Uncomment the example you want to run:
  
  await createBasicToken();
  // await createAdvancedToken();
  // await createBonkToken();
  
  console.log('\n✨ Examples completed!');
}

// Execute if run directly
if (require.main === module) {
  runExamples().catch(console.error);
}

export {
  createBasicToken,
  createAdvancedToken,
  createBonkToken
};