import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Services
import { AsterPerpetualTradingService } from './services/perpetual-trading.service';
import { AsterPerpetualBalanceService } from './services/perpetual-balance.service';
import { AsterPerpetualMarketService } from './services/perpetual-market.service';

// Shared services
import { AsterApiService } from '../shared/aster-api.service';

@Module({
  imports: [ConfigModule],
  providers: [
    AsterPerpetualTradingService,
    AsterPerpetualBalanceService,
    AsterPerpetualMarketService,
    AsterApiService,
  ],
  exports: [
    AsterPerpetualTradingService,
    AsterPerpetualBalanceService,
    AsterPerpetualMarketService,
  ],
})
export class AsterPerpetualModule {}
