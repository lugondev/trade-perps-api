import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { SymbolNormalizerMiddleware } from '../common/middleware/symbol-normalizer.middleware';
import { TradingController, BalanceController, MarketController } from './controllers';

@Module({
  imports: [CommonModule],
  controllers: [TradingController, BalanceController, MarketController],
})
export class ApiModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SymbolNormalizerMiddleware)
      .forRoutes(TradingController, BalanceController, MarketController);
  }
}
