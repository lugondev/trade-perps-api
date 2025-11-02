import { registerAs } from '@nestjs/config';

export interface BinanceConfig {
  restUrl: string;
  wsUrl: string;
  testnetRestUrl: string;
  testnetWsUrl: string;
  apiKey: string;
  apiSecret: string;
  useTestnet: boolean;
}

export default registerAs(
  'binance',
  (): BinanceConfig => ({
    restUrl: process.env.BINANCE_REST_URL || 'https://fapi.binance.com',
    wsUrl: process.env.BINANCE_WS_URL || 'wss://fstream.binance.com/ws',
    testnetRestUrl: process.env.BINANCE_TESTNET_REST_URL || 'https://testnet.binancefuture.com',
    testnetWsUrl: process.env.BINANCE_TESTNET_WS_URL || 'wss://stream.binancefuture.com/ws',
    apiKey: process.env.BINANCE_API_KEY || '',
    apiSecret: process.env.BINANCE_API_SECRET || '',
    useTestnet: process.env.BINANCE_USE_TESTNET === 'true',
  }),
);
