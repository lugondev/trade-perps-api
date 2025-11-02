import { Injectable, Logger } from '@nestjs/common';
import { OkxApiService } from '../../shared/okx-api.service';

@Injectable()
export class OkxPerpetualMarketService {
  private readonly logger = new Logger(OkxPerpetualMarketService.name);

  constructor(private readonly apiService: OkxApiService) {}

  /**
   * Get ticker price for an instrument
   */
  async getTickerPrice(instId: string): Promise<any> {
    try {
      this.logger.log(`Fetching ticker price for ${instId}...`);

      const response = await this.apiService.getPublic('/api/v5/market/ticker', { instId });

      if (!response.success || !response.data || response.data.length === 0) {
        throw new Error(response.error || 'Failed to fetch ticker price');
      }

      const ticker = response.data[0];

      return {
        success: true,
        data: {
          instId: ticker.instId,
          last: parseFloat(ticker.last),
          askPx: parseFloat(ticker.askPx),
          bidPx: parseFloat(ticker.bidPx),
          open24h: parseFloat(ticker.open24h),
          high24h: parseFloat(ticker.high24h),
          low24h: parseFloat(ticker.low24h),
          vol24h: parseFloat(ticker.vol24h),
          timestamp: ticker.ts,
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
  async getOrderBook(instId: string, sz: string = '20'): Promise<any> {
    try {
      this.logger.log(`Fetching order book for ${instId}...`);

      const response = await this.apiService.getPublic('/api/v5/market/books', { instId, sz });

      if (!response.success || !response.data || response.data.length === 0) {
        throw new Error(response.error || 'Failed to fetch order book');
      }

      const book = response.data[0];

      return {
        success: true,
        data: {
          instId,
          asks: book.asks.map((ask: [string, string]) => ({
            price: parseFloat(ask[0]),
            quantity: parseFloat(ask[1]),
          })),
          bids: book.bids.map((bid: [string, string]) => ({
            price: parseFloat(bid[0]),
            quantity: parseFloat(bid[1]),
          })),
          timestamp: book.ts,
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
   * Get funding rate
   */
  async getFundingRate(instId: string): Promise<any> {
    try {
      this.logger.log(`Fetching funding rate for ${instId}...`);

      const response = await this.apiService.getPublic('/api/v5/public/funding-rate', { instId });

      if (!response.success || !response.data || response.data.length === 0) {
        throw new Error(response.error || 'Failed to fetch funding rate');
      }

      const fundingData = response.data[0];

      return {
        success: true,
        data: {
          instId: fundingData.instId,
          fundingRate: parseFloat(fundingData.fundingRate),
          nextFundingRate: parseFloat(fundingData.nextFundingRate),
          fundingTime: fundingData.fundingTime,
          nextFundingTime: fundingData.nextFundingTime,
        },
      };
    } catch (error: any) {
      this.logger.error('Error fetching funding rate:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
