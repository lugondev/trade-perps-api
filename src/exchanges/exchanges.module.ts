import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { AsterModule } from './aster/aster.module';
import { HyperliquidModule } from './hyperliquid/hyperliquid.module';
import { BinanceModule } from './binance/binance.module';
import { OkxModule } from './okx/okx.module';
import { ExchangeRegistry } from '../common/factory/exchange.factory';

// Import Aster Perpetual service classes
import { AsterPerpetualTradingService } from './aster/perpetual/services/perpetual-trading.service';
import { AsterPerpetualBalanceService } from './aster/perpetual/services/perpetual-balance.service';
import { AsterPerpetualMarketService } from './aster/perpetual/services/perpetual-market.service';

// Import Hyperliquid Perp service classes
import { HyperliquidPerpTradingService } from './hyperliquid/perp/services/perp-trading.service';
import { HyperliquidPerpBalanceService } from './hyperliquid/perp/services/perp-balance.service';
import { HyperliquidPerpMarketService } from './hyperliquid/perp/services/perp-market.service';

// Import Binance Perpetual service classes
import { BinancePerpetualTradingService } from './binance/perpetual/services/perpetual-trading.service';
import { BinancePerpetualBalanceService } from './binance/perpetual/services/perpetual-balance.service';
import { BinancePerpetualMarketService } from './binance/perpetual/services/perpetual-market.service';

// Import OKX Perpetual service classes
import { OkxPerpetualTradingService } from './okx/perpetual/services/perpetual-trading.service';
import { OkxPerpetualBalanceService } from './okx/perpetual/services/perpetual-balance.service';
import { OkxPerpetualMarketService } from './okx/perpetual/services/perpetual-market.service';

@Module({
  imports: [AsterModule, HyperliquidModule, BinanceModule, OkxModule],
  exports: [AsterModule, HyperliquidModule, BinanceModule, OkxModule],
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

    // Register Binance Perpetual
    this.registry.register({
      exchange: 'binance',
      tradingType: 'perpetual',
      tradingService: BinancePerpetualTradingService as any,
      balanceService: BinancePerpetualBalanceService as any,
      marketService: BinancePerpetualMarketService as any,
    });

    // Register OKX Perpetual
    this.registry.register({
      exchange: 'okx',
      tradingType: 'perpetual',
      tradingService: OkxPerpetualTradingService as any,
      balanceService: OkxPerpetualBalanceService as any,
      marketService: OkxPerpetualMarketService as any,
    });

    const logger = new Logger(ExchangesModule.name);
    logger.log(
      '✅ Registered exchanges: aster-perpetual, hyperliquid-perpetual, binance-perpetual, okx-perpetual',
    );
  }
}
