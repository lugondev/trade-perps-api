import { Module } from '@nestjs/common';
import { AsterFuturesModule } from './futures/futures.module';

@Module({
  imports: [AsterFuturesModule],
  exports: [AsterFuturesModule],
})
export class AsterModule {}
