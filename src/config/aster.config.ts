import { registerAs } from '@nestjs/config';

export interface AsterConfig {
  restUrl: string;
  wsUrl: string;
  apiKey: string;
  apiSecret: string;
  userAddress: string;
  signerAddress: string;
  privateKey: string;
}

export default registerAs('aster', (): AsterConfig => {
  const config: AsterConfig = {
    restUrl: process.env.ASTER_REST_URL || 'https://fapi.asterdex.com',
    wsUrl: process.env.ASTER_WS_URL || 'wss://fstream.asterdex.com',
    apiKey: process.env.ASTER_API_KEY || '',
    apiSecret: process.env.ASTER_API_SECRET || '',
    userAddress: process.env.ASTER_USER_ADDRESS || '',
    signerAddress: process.env.ASTER_SIGNER_ADDRESS || '',
    privateKey: process.env.ASTER_PRIVATE_KEY || '',
  };

  // Validate required fields
  const requiredFields: (keyof AsterConfig)[] = [
    'apiKey',
    'apiSecret',
    'userAddress',
    'signerAddress',
    'privateKey',
  ];

  const missingFields = requiredFields.filter(field => !config[field]);

  if (missingFields.length > 0) {
    console.warn(
      `⚠️  Warning: Missing Aster API configuration fields: ${missingFields.join(', ')}`,
    );
    console.warn('Please set these environment variables to enable full API access.');
  }

  return config;
});
