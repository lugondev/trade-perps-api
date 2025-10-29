import { Module } from '@nestjs/common';
import { HyperliquidPerpModule } from './perp/perp.module';

@Module({
  imports: [HyperliquidPerpModule],
  exports: [HyperliquidPerpModule],
})
export class HyperliquidModule {}
