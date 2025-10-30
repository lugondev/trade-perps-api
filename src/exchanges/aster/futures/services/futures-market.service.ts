import { Injectable, Logger } from '@nestjs/common';
import { IFuturesMarketService, FundingRate } from '../../../../common/interfaces';
import {
  ApiResponse,
  OrderBook,
  Candle,
  Trade,
  OrderSide,
} from '../../../../common/types/exchange.types';
import { AsterApiService } from '../../shared/aster-api.service';

interface SymbolInfo {
  symbol: string;
  pricePrecision: number;
  quantityPrecision: number;
  baseAssetPrecision: number;
  quotePrecision: number;
}

@Injectable()
export class AsterFuturesMarketService implements IFuturesMarketService {
  private readonly logger = new Logger(AsterFuturesMarketService.name);
  private symbolInfoCache: Map<string, SymbolInfo> = new Map();
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 3600000; // 1 hour

  constructor(private readonly asterApiService: AsterApiService) {}

  /**
   * Get current price for symbol
   */
  async getCurrentPrice(symbol: string): Promise<ApiResponse<string>> {
    try {
      const response = await this.asterApiService.get<any>('/fapi/v1/ticker/price', { symbol });

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data.price || '0',
          timestamp: Date.now(),
          exchange: 'aster',
          tradingType: 'perpetual',
        };
      }

      return response;
    } catch (error) {
      this.logger.error('Error getting current price:', error);
      return {
        success: false,
        error: error.message || 'Failed to get current price',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get all prices
   */
  async getAllPrices(): Promise<ApiResponse<Record<string, string>>> {
    try {
      const response = await this.asterApiService.get<any[]>('/fapi/v1/ticker/price', {});

      if (response.success && response.data) {
        const prices: Record<string, string> = {};
        response.data.forEach((ticker: any) => {
          prices[ticker.symbol] = ticker.price;
        });

        return {
          success: true,
          data: prices,
          timestamp: Date.now(),
          exchange: 'aster',
          tradingType: 'perpetual',
        };
      }

      return {
        success: false,
        error: response.error || 'Failed to get all prices',
        timestamp: Date.now(),
      };
    } catch (error) {
      this.logger.error('Error getting all prices:', error);
      return {
        success: false,
        error: error.message || 'Failed to get all prices',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get ticker (24hr stats)
   */
  async getTicker(symbol?: string): Promise<ApiResponse<any>> {
    try {
      const params = symbol ? { symbol } : {};
      return await this.asterApiService.get('/fapi/v1/ticker/24hr', params);
    } catch (error) {
      this.logger.error('Error getting ticker:', error);
      return {
        success: false,
        error: error.message || 'Failed to get ticker',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get order book
   */
  async getOrderBook(symbol: string, limit: number = 500): Promise<ApiResponse<OrderBook>> {
    try {
      const response = await this.asterApiService.get<any>('/fapi/v1/depth', { symbol, limit });

      if (response.success && response.data) {
        const orderBook: OrderBook = {
          symbol,
          bids: response.data.bids || [],
          asks: response.data.asks || [],
          timestamp: Date.now(),
        };

        return {
          success: true,
          data: orderBook,
          timestamp: Date.now(),
          exchange: 'aster',
          tradingType: 'perpetual',
        };
      }

      return response;
    } catch (error) {
      this.logger.error('Error getting order book:', error);
      return {
        success: false,
        error: error.message || 'Failed to get order book',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get recent trades
   */
  async getRecentTrades(symbol: string, limit: number = 500): Promise<ApiResponse<Trade[]>> {
    try {
      const response = await this.asterApiService.get<any[]>('/fapi/v1/trades', { symbol, limit });

      if (response.success && response.data) {
        const trades: Trade[] = response.data.map((t: any) => ({
          id: t.id?.toString() || '',
          orderId: t.orderId?.toString() || '',
          symbol,
          side: t.isBuyerMaker ? OrderSide.SELL : OrderSide.BUY,
          price: t.price || '0',
          quantity: t.qty || '0',
          fee: '0',
          feeAsset: 'USDT',
          timestamp: t.time || Date.now(),
        }));

        return {
          success: true,
          data: trades,
          timestamp: Date.now(),
          exchange: 'aster',
          tradingType: 'perpetual',
        };
      }

      return response;
    } catch (error) {
      this.logger.error('Error getting recent trades:', error);
      return {
        success: false,
        error: error.message || 'Failed to get recent trades',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get klines/candles
   */
  async getCandles(
    symbol: string,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit: number = 500,
  ): Promise<ApiResponse<Candle[]>> {
    try {
      const params: any = { symbol, interval, limit };
      if (startTime) params.startTime = startTime;
      if (endTime) params.endTime = endTime;

      const response = await this.asterApiService.get<any[]>('/fapi/v1/klines', params);

      if (response.success && response.data) {
        const candles: Candle[] = response.data.map((k: any) => ({
          openTime: k[0],
          open: k[1],
          high: k[2],
          low: k[3],
          close: k[4],
          volume: k[5],
          closeTime: k[6],
        }));

        return {
          success: true,
          data: candles,
          timestamp: Date.now(),
          exchange: 'aster',
          tradingType: 'perpetual',
        };
      }

      return response;
    } catch (error) {
      this.logger.error('Error getting candles:', error);
      return {
        success: false,
        error: error.message || 'Failed to get candles',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get all available symbols
   */
  async getSymbols(): Promise<ApiResponse<string[]>> {
    try {
      const response = await this.asterApiService.get<any>('/fapi/v1/exchangeInfo', {});

      if (response.success && response.data && response.data.symbols) {
        const symbols = response.data.symbols.map((s: any) => s.symbol);
        return {
          success: true,
          data: symbols,
          timestamp: Date.now(),
          exchange: 'aster',
          tradingType: 'perpetual',
        };
      }

      return response;
    } catch (error) {
      this.logger.error('Error getting symbols:', error);
      return {
        success: false,
        error: error.message || 'Failed to get symbols',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get exchange info
   */
  async getExchangeInfo(): Promise<ApiResponse<any>> {
    try {
      return await this.asterApiService.get('/fapi/v1/exchangeInfo', {});
    } catch (error) {
      this.logger.error('Error getting exchange info:', error);
      return {
        success: false,
        error: error.message || 'Failed to get exchange info',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get symbol precision info
   */
  async getSymbolInfo(symbol: string): Promise<SymbolInfo | null> {
    try {
      // Check cache first
      if (this.symbolInfoCache.has(symbol) && Date.now() < this.cacheExpiry) {
        return this.symbolInfoCache.get(symbol)!;
      }

      // Fetch exchange info
      const response = await this.getExchangeInfo();
      if (!response.success || !response.data?.symbols) {
        return null;
      }

      // Update cache
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;

      response.data.symbols.forEach((s: any) => {
        this.symbolInfoCache.set(s.symbol, {
          symbol: s.symbol,
          pricePrecision: s.pricePrecision || 8,
          quantityPrecision: s.quantityPrecision || 8,
          baseAssetPrecision: s.baseAssetPrecision || 8,
          quotePrecision: s.quotePrecision || 8,
        });
      });

      return this.symbolInfoCache.get(symbol) || null;
    } catch (error) {
      this.logger.error(`Error getting symbol info for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Format price according to symbol precision
   */
  async formatPrice(symbol: string, price: number | string): Promise<string> {
    const info = await this.getSymbolInfo(symbol);
    const priceNum = typeof price === 'string' ? parseFloat(price) : price;

    if (!info) {
      // Default to 8 decimals if no info available
      return priceNum.toFixed(8);
    }

    return priceNum.toFixed(info.pricePrecision);
  }

  /**
   * Format quantity according to symbol precision
   */
  async formatQuantity(symbol: string, quantity: number | string): Promise<string> {
    const info = await this.getSymbolInfo(symbol);
    const qtyNum = typeof quantity === 'string' ? parseFloat(quantity) : quantity;

    if (!info) {
      // Default to 8 decimals if no info available
      return qtyNum.toFixed(8);
    }

    return qtyNum.toFixed(info.quantityPrecision);
  }

  // ==================== Futures-specific methods ====================

  /**
   * Get current funding rate
   */
  async getFundingRate(symbol?: string): Promise<ApiResponse<FundingRate | FundingRate[]>> {
    try {
      const params = symbol ? { symbol } : {};
      const response = await this.asterApiService.get<any>('/fapi/v1/fundingRate', params);

      if (response.success && response.data) {
        const mapFundingRate = (item: any): FundingRate => ({
          symbol: item.symbol,
          fundingRate: item.fundingRate,
          fundingTime: item.fundingTime,
          nextFundingTime: item.nextFundingTime,
        });

        const data = Array.isArray(response.data)
          ? response.data.map(mapFundingRate)
          : mapFundingRate(response.data);

        return {
          success: true,
          data: symbol ? data[0] : data,
          timestamp: Date.now(),
          exchange: 'aster',
          tradingType: 'perpetual',
        };
      }

      return response;
    } catch (error) {
      this.logger.error('Error getting funding rate:', error);
      return {
        success: false,
        error: error.message || 'Failed to get funding rate',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get funding rate history
   */
  async getFundingRateHistory(
    symbol: string,
    startTime?: number,
    endTime?: number,
    limit?: number,
  ): Promise<ApiResponse<FundingRate[]>> {
    try {
      const params: any = { symbol };
      if (startTime) params.startTime = startTime;
      if (endTime) params.endTime = endTime;
      if (limit) params.limit = limit;

      const response = await this.asterApiService.get<any[]>('/fapi/v1/fundingRate', params);

      if (response.success && response.data) {
        const fundingRates: FundingRate[] = response.data.map(item => ({
          symbol: item.symbol,
          fundingRate: item.fundingRate,
          fundingTime: item.fundingTime,
          nextFundingTime: item.nextFundingTime,
        }));

        return {
          success: true,
          data: fundingRates,
          timestamp: Date.now(),
          exchange: 'aster',
          tradingType: 'perpetual',
        };
      }

      return response;
    } catch (error) {
      this.logger.error('Error getting funding rate history:', error);
      return {
        success: false,
        error: error.message || 'Failed to get funding rate history',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get mark price (used for liquidation)
   */
  async getMarkPrice(symbol?: string): Promise<ApiResponse<any>> {
    try {
      const params = symbol ? { symbol } : {};
      const response = await this.asterApiService.get<any>('/fapi/v1/premiumIndex', params);

      return {
        ...response,
        timestamp: Date.now(),
        exchange: 'aster',
        tradingType: 'perpetual',
      };
    } catch (error) {
      this.logger.error('Error getting mark price:', error);
      return {
        success: false,
        error: error.message || 'Failed to get mark price',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get index price (spot reference price)
   */
  async getIndexPrice(symbol: string): Promise<ApiResponse<string>> {
    try {
      const response = await this.asterApiService.get<any>('/fapi/v1/premiumIndex', { symbol });

      if (response.success && response.data?.indexPrice) {
        return {
          success: true,
          data: response.data.indexPrice,
          timestamp: Date.now(),
          exchange: 'aster',
          tradingType: 'perpetual',
        };
      }

      return response;
    } catch (error) {
      this.logger.error('Error getting index price:', error);
      return {
        success: false,
        error: error.message || 'Failed to get index price',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get open interest
   */
  async getOpenInterest(symbol: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.asterApiService.get<any>('/fapi/v1/openInterest', { symbol });

      return {
        ...response,
        timestamp: Date.now(),
        exchange: 'aster',
        tradingType: 'perpetual',
      };
    } catch (error) {
      this.logger.error('Error getting open interest:', error);
      return {
        success: false,
        error: error.message || 'Failed to get open interest',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get open interest history
   */
  async getOpenInterestHistory(
    symbol: string,
    period: string,
    startTime?: number,
    endTime?: number,
    limit?: number,
  ): Promise<ApiResponse<any[]>> {
    try {
      const params: any = { symbol, period };
      if (startTime) params.startTime = startTime;
      if (endTime) params.endTime = endTime;
      if (limit) params.limit = limit;

      const response = await this.asterApiService.get<any[]>(
        '/futures/data/openInterestHist',
        params,
      );

      return {
        ...response,
        timestamp: Date.now(),
        exchange: 'aster',
        tradingType: 'perpetual',
      };
    } catch (error) {
      this.logger.error('Error getting open interest history:', error);
      return {
        success: false,
        error: error.message || 'Failed to get open interest history',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get long/short ratio
   */
  async getLongShortRatio(
    symbol: string,
    period: string,
    startTime?: number,
    endTime?: number,
    limit?: number,
  ): Promise<ApiResponse<any[]>> {
    try {
      const params: any = { symbol, period };
      if (startTime) params.startTime = startTime;
      if (endTime) params.endTime = endTime;
      if (limit) params.limit = limit;

      const response = await this.asterApiService.get<any[]>(
        '/futures/data/globalLongShortAccountRatio',
        params,
      );

      return {
        ...response,
        timestamp: Date.now(),
        exchange: 'aster',
        tradingType: 'perpetual',
      };
    } catch (error) {
      this.logger.error('Error getting long/short ratio:', error);
      return {
        success: false,
        error: error.message || 'Failed to get long/short ratio',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get premium index
   */
  async getPremiumIndex(symbol?: string): Promise<ApiResponse<any>> {
    try {
      const params = symbol ? { symbol } : {};
      const response = await this.asterApiService.get<any>('/fapi/v1/premiumIndex', params);

      return {
        ...response,
        timestamp: Date.now(),
        exchange: 'aster',
        tradingType: 'perpetual',
      };
    } catch (error) {
      this.logger.error('Error getting premium index:', error);
      return {
        success: false,
        error: error.message || 'Failed to get premium index',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get recent liquidation orders
   */
  async getLiquidationOrders(
    symbol: string,
    startTime?: number,
    endTime?: number,
    limit?: number,
  ): Promise<ApiResponse<any[]>> {
    try {
      const params: any = { symbol };
      if (startTime) params.startTime = startTime;
      if (endTime) params.endTime = endTime;
      if (limit) params.limit = limit;

      const response = await this.asterApiService.get<any[]>('/fapi/v1/allForceOrders', params);

      return {
        ...response,
        timestamp: Date.now(),
        exchange: 'aster',
        tradingType: 'perpetual',
      };
    } catch (error) {
      this.logger.error('Error getting liquidation orders:', error);
      return {
        success: false,
        error: error.message || 'Failed to get liquidation orders',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get contract specifications
   */
  async getContractInfo(symbol?: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.asterApiService.get<any>('/fapi/v1/exchangeInfo');

      if (response.success && response.data?.symbols) {
        let contracts = response.data.symbols;

        if (symbol) {
          contracts = contracts.filter((s: any) => s.symbol === symbol);
          if (contracts.length > 0) {
            return {
              success: true,
              data: contracts[0],
              timestamp: Date.now(),
              exchange: 'aster',
              tradingType: 'perpetual',
            };
          }
        }

        return {
          success: true,
          data: contracts,
          timestamp: Date.now(),
          exchange: 'aster',
          tradingType: 'perpetual',
        };
      }

      return response;
    } catch (error) {
      this.logger.error('Error getting contract info:', error);
      return {
        success: false,
        error: error.message || 'Failed to get contract info',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get all available futures symbols
   */
  async getFuturesSymbols(): Promise<ApiResponse<string[]>> {
    try {
      const response = await this.asterApiService.get<any>('/fapi/v1/exchangeInfo');

      if (response.success && response.data?.symbols) {
        const symbols = response.data.symbols.map((s: any) => s.symbol).filter((s: string) => s); // Filter out empty symbols

        return {
          success: true,
          data: symbols,
          timestamp: Date.now(),
          exchange: 'aster',
          tradingType: 'perpetual',
        };
      }

      return response;
    } catch (error) {
      this.logger.error('Error getting futures symbols:', error);
      return {
        success: false,
        error: error.message || 'Failed to get futures symbols',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get min/max quantity for symbol
   */
  async getQuantityLimits(symbol: string): Promise<ApiResponse<{ min: string; max: string }>> {
    try {
      const info = await this.getSymbolInfo(symbol);

      if (!info) {
        return {
          success: false,
          error: 'Symbol info not available',
          timestamp: Date.now(),
        };
      }

      // Return default limits (would need to parse from exchange info filters)
      return {
        success: true,
        data: { min: '0.001', max: '1000000' },
        timestamp: Date.now(),
        exchange: 'aster',
        tradingType: 'perpetual',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get min/max notional value for symbol
   */
  async getNotionalLimits(symbol: string): Promise<ApiResponse<{ min: string; max: string }>> {
    try {
      const info = await this.getSymbolInfo(symbol);

      if (!info) {
        return {
          success: false,
          error: 'Symbol info not available',
          timestamp: Date.now(),
        };
      }

      // Return default limits (would need to parse from exchange info filters)
      return {
        success: true,
        data: { min: '10', max: '10000000' },
        timestamp: Date.now(),
        exchange: 'aster',
        tradingType: 'perpetual',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
      };
    }
  }
}
