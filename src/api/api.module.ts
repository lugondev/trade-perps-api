import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { TradingController, BalanceController, MarketController } from './controllers';

@Module({
  imports: [CommonModule],
  controllers: [TradingController, BalanceController, MarketController],
})
export class ApiModule {}
