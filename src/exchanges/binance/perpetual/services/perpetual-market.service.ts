import { Injectable, Logger } from '@nestjs/common';
import { BinanceApiService } from '../../shared/binance-api.service';

@Injectable()
export class BinancePerpetualMarketService {
  private readonly logger = new Logger(BinancePerpetualMarketService.name);

  constructor(private readonly apiService: BinanceApiService) {}

  /**
   * Get ticker price for a symbol
   */
  async getTickerPrice(symbol: string): Promise<any> {
    try {
      this.logger.log(`Fetching ticker price for ${symbol}...`);

      const response = await this.apiService.getPublic('/fapi/v1/ticker/price', { symbol });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch ticker price');
      }

      return {
        success: true,
        data: {
          symbol: response.data.symbol,
          price: parseFloat(response.data.price),
          timestamp: response.data.time,
        },
      };
    } catch (error: any) {
      this.logger.error('Error fetching ticker price:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get order book depth
   */
  async getOrderBook(symbol: string, limit: number = 20): Promise<any> {
    try {
      this.logger.log(`Fetching order book for ${symbol}...`);

      const response = await this.apiService.getPublic('/fapi/v1/depth', { symbol, limit });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch order book');
      }

      return {
        success: true,
        data: {
          symbol,
          lastUpdateId: response.data.lastUpdateId,
          bids: response.data.bids.map((bid: [string, string]) => ({
            price: parseFloat(bid[0]),
            quantity: parseFloat(bid[1]),
          })),
          asks: response.data.asks.map((ask: [string, string]) => ({
            price: parseFloat(ask[0]),
            quantity: parseFloat(ask[1]),
          })),
          timestamp: response.data.T,
        },
      };
    } catch (error: any) {
      this.logger.error('Error fetching order book:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get 24hr ticker statistics
   */
  async get24hrTicker(symbol: string): Promise<any> {
    try {
      this.logger.log(`Fetching 24hr ticker for ${symbol}...`);

      const response = await this.apiService.getPublic('/fapi/v1/ticker/24hr', { symbol });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch 24hr ticker');
      }

      return {
        success: true,
        data: {
          symbol: response.data.symbol,
          priceChange: parseFloat(response.data.priceChange),
          priceChangePercent: parseFloat(response.data.priceChangePercent),
          lastPrice: parseFloat(response.data.lastPrice),
          volume: parseFloat(response.data.volume),
          quoteVolume: parseFloat(response.data.quoteVolume),
          openPrice: parseFloat(response.data.openPrice),
          highPrice: parseFloat(response.data.highPrice),
          lowPrice: parseFloat(response.data.lowPrice),
          closeTime: response.data.closeTime,
        },
      };
    } catch (error: any) {
      this.logger.error('Error fetching 24hr ticker:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get exchange info
   */
  async getExchangeInfo(symbol?: string): Promise<any> {
    try {
      this.logger.log('Fetching exchange info...');

      const params = symbol ? { symbol } : {};
      const response = await this.apiService.getPublic('/fapi/v1/exchangeInfo', params);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch exchange info');
      }

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      this.logger.error('Error fetching exchange info:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
