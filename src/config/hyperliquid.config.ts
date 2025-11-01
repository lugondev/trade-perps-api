import { registerAs } from '@nestjs/config';

export interface HyperliquidConfig {
  restUrl: string;
  wsUrl: string;
  userAddress: string;
  apiWallet: string;
  apiPrivateKey: string;
  isTestnet: boolean;
}

export default registerAs('hyperliquid', (): HyperliquidConfig => {
  // Support both HYPERLIQUID_IS_TESTNET and HYPERLIQUID_TESTNET for backward compatibility
  const isTestnet =
    process.env.HYPERLIQUID_IS_TESTNET === 'true' || process.env.HYPERLIQUID_TESTNET === 'true';

  const config: HyperliquidConfig = {
    restUrl:
      process.env.HYPERLIQUID_REST_URL ||
      (isTestnet ? 'https://api.hyperliquid-testnet.xyz' : 'https://api.hyperliquid.xyz'),
    wsUrl:
      process.env.HYPERLIQUID_WS_URL ||
      (isTestnet ? 'wss://api.hyperliquid-testnet.xyz/ws' : 'wss://api.hyperliquid.xyz/ws'),
    userAddress: process.env.HYPERLIQUID_USER_ADDRESS || '',
    apiWallet: process.env.HYPERLIQUID_API_WALLET || '',
    apiPrivateKey: process.env.HYPERLIQUID_API_PRIVATE_KEY || '',
    isTestnet,
  };

  // Validate required fields for trading (API wallet setup)
  const requiredFields: (keyof HyperliquidConfig)[] = ['userAddress', 'apiWallet', 'apiPrivateKey'];

  const missingFields = requiredFields.filter(field => !config[field]);

  if (missingFields.length > 0) {
    console.warn(
      `⚠️  Warning: Missing Hyperliquid configuration fields: ${missingFields.join(', ')}`,
    );
    console.warn('Please set these environment variables to enable trading features.');
    console.warn('Read-only endpoints (market data, info) will still work.');
  }

  return config;
});
