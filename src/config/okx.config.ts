export interface OkxConfig {
  restUrl: string;
  wsUrl: string;
  demoWsUrl: string;
  apiKey: string;
  apiSecret: string;
  passphrase: string;
  useSimulated: boolean;
}

export default (): { okx: OkxConfig } => ({
  okx: {
    restUrl: 'https://www.okx.com',
    wsUrl: 'wss://ws.okx.com:8443/ws/v5/public',
    demoWsUrl: 'wss://wspap.okx.com:8443/ws/v5/public',
    apiKey: process.env.OKX_API_KEY || '',
    apiSecret: process.env.OKX_API_SECRET || '',
    passphrase: process.env.OKX_PASSPHRASE || '',
    useSimulated: process.env.OKX_USE_SIMULATED === 'true',
  },
});
