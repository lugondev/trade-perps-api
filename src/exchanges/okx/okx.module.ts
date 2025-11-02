import { Module } from '@nestjs/common';
import { OkxPerpetualModule } from './perpetual/perpetual.module';

@Module({
  imports: [OkxPerpetualModule],
  exports: [OkxPerpetualModule],
})
export class OkxModule {}
