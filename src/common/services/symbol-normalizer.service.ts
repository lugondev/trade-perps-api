import { Injectable } from '@nestjs/common';
import { ExchangeName } from '../types/exchange.types';

/**
 * Service to normalize and convert symbol formats across different exchanges
 * Standard format: BTC/USDT (base/quote)
 */
@Injectable()
export class SymbolNormalizerService {
  /**
   * Convert standard symbol format to exchange-specific format
   * @param symbol Standard format like 'BTC/USDT'
   * @param exchange Exchange name
   * @returns Exchange-specific symbol format
   */
  toExchangeSymbol(symbol: string, exchange: ExchangeName): string {
    const normalized = this.parseSymbol(symbol);

    switch (exchange) {
      case 'binance':
        // Binance: BTCUSDT
        return `${normalized.base}${normalized.quote}`;

      case 'okx':
        // OKX: BTC-USDT-SWAP
        return `${normalized.base}-${normalized.quote}-SWAP`;

      case 'aster':
        // Aster: BTCUSDT (same format as Binance)
        return `${normalized.base}${normalized.quote}`;

      case 'hyperliquid':
        // Hyperliquid: BTC
        return normalized.base;

      case 'orderly':
        // Orderly: PERP_BTC_USDC (similar to Aster)
        return `PERP_${normalized.base}_${normalized.quote}`;

      default:
        return symbol;
    }
  }

  /**
   * Convert exchange-specific symbol to standard format
   * @param symbol Exchange-specific symbol
   * @param exchange Exchange name
   * @returns Standard format like 'BTC/USDT'
   */
  fromExchangeSymbol(symbol: string, exchange: ExchangeName): string {
    let base: string;
    let quote: string;

    switch (exchange) {
      case 'binance': {
        // BTCUSDT -> BTC/USDT
        if (symbol.includes('USDT')) {
          base = symbol.replace('USDT', '');
          quote = 'USDT';
        } else if (symbol.includes('USDC')) {
          base = symbol.replace('USDC', '');
          quote = 'USDC';
        } else {
          return symbol;
        }
        break;
      }

      case 'okx': {
        // BTC-USDT-SWAP -> BTC/USDT
        const okxParts = symbol.split('-');
        if (okxParts.length >= 2) {
          base = okxParts[0];
          quote = okxParts[1];
        } else {
          return symbol;
        }
        break;
      }

      case 'aster': {
        // BTCUSDT -> BTC/USDT (same format as Binance)
        if (symbol.includes('USDT')) {
          base = symbol.replace('USDT', '');
          quote = 'USDT';
        } else if (symbol.includes('USDC')) {
          base = symbol.replace('USDC', '');
          quote = 'USDC';
        } else {
          return symbol;
        }
        break;
      }

      case 'orderly': {
        // PERP_BTC_USDC -> BTC/USDC
        const asterParts = symbol.split('_');
        if (asterParts.length === 3 && asterParts[0] === 'PERP') {
          base = asterParts[1];
          quote = asterParts[2];
        } else {
          return symbol;
        }
        break;
      }

      case 'hyperliquid':
        // BTC -> BTC/USD (Hyperliquid uses USD by default)
        base = symbol;
        quote = 'USD';
        break;

      default:
        return symbol;
    }

    return `${base}/${quote}`;
  }

  /**
   * Parse standard symbol format into base and quote
   * @param symbol Standard format like 'BTC/USDT' or 'BTCUSDT'
   * @returns Object with base and quote
   */
  private parseSymbol(symbol: string): { base: string; quote: string } {
    // If already in standard format (BTC/USDT)
    if (symbol.includes('/')) {
      const [base, quote] = symbol.split('/');
      return { base: base.trim(), quote: quote.trim() };
    }

    // Try to detect common quote currencies
    const commonQuotes = ['USDT', 'USDC', 'USD', 'BUSD', 'DAI'];

    for (const quote of commonQuotes) {
      if (symbol.endsWith(quote)) {
        const base = symbol.slice(0, -quote.length);
        return { base, quote };
      }
    }

    // Default: assume it's already just the base (like Hyperliquid)
    return { base: symbol, quote: 'USDT' };
  }

  /**
   * Validate if symbol is in standard format
   * @param symbol Symbol to validate
   * @returns True if valid standard format
   */
  isStandardFormat(symbol: string): boolean {
    return /^[A-Z0-9]+\/[A-Z0-9]+$/.test(symbol);
  }

  /**
   * Get list of supported quote currencies
   */
  getSupportedQuotes(): string[] {
    return ['USDT', 'USDC', 'USD', 'BUSD', 'DAI'];
  }

  /**
   * Normalize symbol to standard format if needed
   * @param symbol Input symbol (any format)
   * @param exchange Exchange name (optional, for better detection)
   * @returns Standard format symbol
   */
  normalize(symbol: string, exchange?: ExchangeName): string {
    if (this.isStandardFormat(symbol)) {
      return symbol;
    }

    if (exchange) {
      return this.fromExchangeSymbol(symbol, exchange);
    }

    // Try to parse without exchange context
    const parsed = this.parseSymbol(symbol);
    return `${parsed.base}/${parsed.quote}`;
  }
}
