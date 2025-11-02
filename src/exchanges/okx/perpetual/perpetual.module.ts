import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Services
import { OkxPerpetualTradingService } from './services/perpetual-trading.service';
import { OkxPerpetualBalanceService } from './services/perpetual-balance.service';
import { OkxPerpetualMarketService } from './services/perpetual-market.service';

// Shared services
import { OkxApiService } from '../shared/okx-api.service';

@Module({
  imports: [ConfigModule],
  providers: [
    OkxPerpetualTradingService,
    OkxPerpetualBalanceService,
    OkxPerpetualMarketService,
    OkxApiService,
  ],
  exports: [OkxPerpetualTradingService, OkxPerpetualBalanceService, OkxPerpetualMarketService],
})
export class OkxPerpetualModule {}
