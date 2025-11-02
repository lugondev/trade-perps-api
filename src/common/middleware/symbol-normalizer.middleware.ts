import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SymbolNormalizerService } from '../services/symbol-normalizer.service';
import { ExchangeName } from '../types/exchange.types';

/**
 * Middleware to automatically convert symbols to exchange-specific format
 */
@Injectable()
export class SymbolNormalizerMiddleware implements NestMiddleware {
  constructor(private readonly symbolNormalizer: SymbolNormalizerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const exchange = (req.query.exchange as ExchangeName) || 'aster';

    // Convert symbol in query params
    if (req.query.symbol) {
      const standardSymbol = req.query.symbol as string;
      req.query.symbol = this.symbolNormalizer.toExchangeSymbol(standardSymbol, exchange);
    }

    // Convert symbol in body
    if (req.body && req.body.symbol) {
      const standardSymbol = req.body.symbol as string;
      req.body.symbol = this.symbolNormalizer.toExchangeSymbol(standardSymbol, exchange);
    }

    // Convert symbol in route params
    if (req.params && req.params.symbol) {
      const standardSymbol = req.params.symbol as string;
      req.params.symbol = this.symbolNormalizer.toExchangeSymbol(standardSymbol, exchange);
    }

    next();
  }
}
