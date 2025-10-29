import { registerAs } from '@nestjs/config';

export interface TradingConfig {
  defaultLeverage: number;
  maxPositionSize: number;
  stopLossPercentage: number;
  takeProfitPercentage: number;
}

export default registerAs(
  'trading',
  (): TradingConfig => ({
    defaultLeverage: parseInt(process.env.DEFAULT_LEVERAGE || '10', 10),
    maxPositionSize: parseInt(process.env.MAX_POSITION_SIZE || '1000', 10),
    stopLossPercentage: parseFloat(process.env.STOP_LOSS_PERCENTAGE || '2'),
    takeProfitPercentage: parseFloat(process.env.TAKE_PROFIT_PERCENTAGE || '5'),
  }),
);
