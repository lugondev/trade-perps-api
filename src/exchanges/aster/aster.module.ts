import { Module } from '@nestjs/common';
import { AsterPerpetualModule } from './perpetual/perpetual.module';

@Module({
  imports: [AsterPerpetualModule],
  exports: [AsterPerpetualModule],
})
export class AsterModule {}
