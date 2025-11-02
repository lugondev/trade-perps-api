import { Module } from '@nestjs/common';
import { BinancePerpetualModule } from './perpetual/perpetual.module';

@Module({
  imports: [BinancePerpetualModule],
  exports: [BinancePerpetualModule],
})
export class BinanceModule {}
