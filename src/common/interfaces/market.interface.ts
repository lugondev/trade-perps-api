/**
 * Base Market Data Service Interface
 * All exchange market services must implement this interface
 */

import { ApiResponse, OrderBook, Candle, Trade } from '../types/exchange.types';

export interface IBaseMarketService {
  /**
   * Get current price for symbol
   */
  getCurrentPrice(symbol: string): Promise<ApiResponse<string>>;

  /**
   * Get all prices
   */
  getAllPrices(): Promise<ApiResponse<Record<string, string>>>;

  /**
   * Get ticker (24hr stats)
   */
  getTicker(symbol?: string): Promise<ApiResponse<any>>;

  /**
   * Get order book
   */
  getOrderBook(symbol: string, limit?: number): Promise<ApiResponse<OrderBook>>;

  /**
   * Get recent trades
   */
  getRecentTrades(symbol: string, limit?: number): Promise<ApiResponse<Trade[]>>;

  /**
   * Get klines/candles
   */
  getCandles(
    symbol: string,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number,
  ): Promise<ApiResponse<Candle[]>>;

  /**
   * Get all available symbols
   */
  getSymbols(): Promise<ApiResponse<string[]>>;

  /**
   * Get exchange info
   */
  getExchangeInfo(): Promise<ApiResponse<any>>;
}
