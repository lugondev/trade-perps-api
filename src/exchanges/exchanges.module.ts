import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { AsterModule } from './aster/aster.module';
import { HyperliquidModule } from './hyperliquid/hyperliquid.module';
import { ExchangeRegistry } from '../common/factory/exchange.factory';

// Import Aster Futures service classes
import { AsterFuturesTradingService } from './aster/futures/services/futures-trading.service';
import { AsterFuturesBalanceService } from './aster/futures/services/futures-balance.service';
import { AsterFuturesMarketService } from './aster/futures/services/futures-market.service';

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
    // Register Aster Futures
    this.registry.register({
      exchange: 'aster',
      tradingType: 'perpetual',
      tradingService: AsterFuturesTradingService,
      balanceService: AsterFuturesBalanceService,
      marketService: AsterFuturesMarketService,
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
