import { Global, Module } from '@nestjs/common';
import { ExchangeRegistry, ExchangeServiceFactory } from './factory';

@Global()
@Module({
  providers: [ExchangeRegistry, ExchangeServiceFactory],
  exports: [ExchangeRegistry, ExchangeServiceFactory],
})
export class CommonModule {}
