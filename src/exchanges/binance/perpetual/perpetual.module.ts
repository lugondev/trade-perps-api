import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Services
import { BinancePerpetualTradingService } from './services/perpetual-trading.service';
import { BinancePerpetualBalanceService } from './services/perpetual-balance.service';
import { BinancePerpetualMarketService } from './services/perpetual-market.service';

// Shared services
import { BinanceApiService } from '../shared/binance-api.service';

@Module({
  imports: [ConfigModule],
  providers: [
    BinancePerpetualTradingService,
    BinancePerpetualBalanceService,
    BinancePerpetualMarketService,
    BinanceApiService,
  ],
  exports: [
    BinancePerpetualTradingService,
    BinancePerpetualBalanceService,
    BinancePerpetualMarketService,
  ],
})
export class BinancePerpetualModule {}
