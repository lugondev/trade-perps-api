import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Controllers
import { AsterFuturesTradingController } from './controllers/futures-trading.controller';
import { AsterFuturesBalanceController } from './controllers/futures-balance.controller';
import { AsterFuturesMarketController } from './controllers/futures-market.controller';

// Services
import { AsterFuturesTradingService } from './services/futures-trading.service';
import { AsterFuturesBalanceService } from './services/futures-balance.service';
import { AsterFuturesMarketService } from './services/futures-market.service';

// Shared services
import { AsterApiService } from '../shared/aster-api.service';

@Module({
  imports: [ConfigModule],
  controllers: [
    AsterFuturesTradingController,
    AsterFuturesBalanceController,
    AsterFuturesMarketController,
  ],
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
