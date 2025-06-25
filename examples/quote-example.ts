import { FurySDK } from '../src/index';

// Simple usage examples for quick reference
async function quickExamples() {
  const sdk = new FurySDK({
    apiUrl: 'https://solana.fury.bot',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    debug: false
  });

  const token = 'DskreQ6yhL3DLzoSaZ19Wg3cv9kzfkiUdBSuSgvboop';

  // Quick buy quote
  const buyQuote = await sdk.getBuyQuote(token, 0.1);
  console.log('Buy quote:', buyQuote.result?.getSummary());

  // Quick sell quote
  const sellQuote = await sdk.getSellQuote(token, 1000000);
  console.log('Sell quote:', sellQuote.result?.getSummary());
}

// Run the examples
if (require.main === module) {
  quickExamples()
    .then(() => console.log('\n✅ Quote example completed'))
    .catch(error => console.error('❌ Quote example failed:', error));
}

export { quickExamples };