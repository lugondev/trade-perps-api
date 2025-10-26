import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Services
import { AsterFuturesTradingService } from './services/futures-trading.service';
import { AsterFuturesBalanceService } from './services/futures-balance.service';
import { AsterFuturesMarketService } from './services/futures-market.service';

// Shared services
import { AsterApiService } from '../shared/aster-api.service';

@Module({
  imports: [ConfigModule],
  providers: [
    AsterFuturesTradingService,
    AsterFuturesBalanceService,
    AsterFuturesMarketService,
    AsterApiService,
  ],
  exports: [
    AsterFuturesTradingService,
    AsterFuturesBalanceService,
    AsterFuturesMarketService,
  ],
})
export class AsterFuturesModule { }
