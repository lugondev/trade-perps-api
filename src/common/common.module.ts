import { Global, Module } from '@nestjs/common';
import { ExchangeRegistry, ExchangeServiceFactory } from './factory';
import { SymbolNormalizerService } from './services/symbol-normalizer.service';

@Global()
@Module({
  providers: [ExchangeRegistry, ExchangeServiceFactory, SymbolNormalizerService],
  exports: [ExchangeRegistry, ExchangeServiceFactory, SymbolNormalizerService],
})
export class CommonModule {}
