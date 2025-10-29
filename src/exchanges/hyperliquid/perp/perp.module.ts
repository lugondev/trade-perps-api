import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Services
import { HyperliquidPerpTradingService } from './services/perp-trading.service';
import { HyperliquidPerpBalanceService } from './services/perp-balance.service';
import { HyperliquidPerpMarketService } from './services/perp-market.service';
import { OrderPlacementService } from './services/order-placement.service';
import { OrderManagementService } from './services/order-management.service';
import { PositionService } from './services/position.service';
import { RiskManagementService } from './services/risk-management.service';

// Shared services
import { HyperliquidApiService } from '../shared/hyperliquid-api.service';
import { SigningService } from '../shared/signing.service';

@Module({
  imports: [ConfigModule],
  providers: [
    HyperliquidPerpTradingService,
    HyperliquidPerpBalanceService,
    HyperliquidPerpMarketService,
    OrderPlacementService,
    OrderManagementService,
    PositionService,
    RiskManagementService,
    HyperliquidApiService,
    SigningService,
  ],
  exports: [
    HyperliquidPerpTradingService,
    HyperliquidPerpBalanceService,
    HyperliquidPerpMarketService,
    OrderPlacementService,
    OrderManagementService,
    PositionService,
    RiskManagementService,
  ],
})
export class HyperliquidPerpModule {}
