import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { AsterModule } from './aster/aster.module';
import { HyperliquidModule } from './hyperliquid/hyperliquid.module';
import { ExchangeRegistry } from '../common/factory/exchange.factory';

// Import Aster Perpetual service classes
import { AsterPerpetualTradingService } from './aster/perpetual/services/perpetual-trading.service';
import { AsterPerpetualBalanceService } from './aster/perpetual/services/perpetual-balance.service';
import { AsterPerpetualMarketService } from './aster/perpetual/services/perpetual-market.service';

// Import Hyperliquid Perp service classes
import { HyperliquidPerpTradingService } from './hyperliquid/perp/services/perp-trading.service';
import { HyperliquidPerpBalanceService } from './hyperliquid/perp/services/perp-balance.service';
import { HyperliquidPerpMarketService } from './hyperliquid/perp/services/perp-market.service';

@Module({
  imports: [AsterModule, HyperliquidModule],
  exports: [AsterModule, HyperliquidModule],
})
export class ExchangesModule implements OnModuleInit {
  constructor(private readonly registry: ExchangeRegistry) {}

  onModuleInit() {
    // Register Aster Perpetual
    this.registry.register({
      exchange: 'aster',
      tradingType: 'perpetual',
      tradingService: AsterPerpetualTradingService,
      balanceService: AsterPerpetualBalanceService,
      marketService: AsterPerpetualMarketService,
    });

    // Register Hyperliquid Perpetual
    this.registry.register({
      exchange: 'hyperliquid',
      tradingType: 'perpetual',
      tradingService: HyperliquidPerpTradingService,
      balanceService: HyperliquidPerpBalanceService,
      marketService: HyperliquidPerpMarketService,
    });

    const logger = new Logger(ExchangesModule.name);
    logger.log('✅ Registered exchanges: aster-perpetual, hyperliquid-perpetual');
  }
}
