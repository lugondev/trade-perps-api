/**
 * Perpetual Market Data Service Interface
 * Extends base market interface with perpetual-specific features
 */

import { ApiResponse } from '../types/exchange.types';
import { IBaseMarketService } from './market.interface';

/**
 * Perpetual market-specific data types
 */
export interface FundingRate {
  symbol: string;
  fundingRate: string;
  fundingTime: number;
  nextFundingTime?: number;
}

export interface OpenInterest {
  symbol: string;
  openInterest: string;
  timestamp: number;
}

export interface LongShortRatio {
  symbol: string;
  longShortRatio: string;
  longAccount: string;
  shortAccount: string;
  timestamp: number;
}

export interface MarkPrice {
  symbol: string;
  markPrice: string;
  indexPrice?: string;
  lastFundingRate?: string;
  nextFundingTime?: number;
  timestamp: number;
}

export interface PremiumIndex {
  symbol: string;
  premiumIndex: string;
  timestamp: number;
}

export interface LiquidationOrder {
  symbol: string;
  side: 'BUY' | 'SELL';
  price: string;
  quantity: string;
  time: number;
}

/**
 * Perpetual Market Data Service Interface
 * All perpetual/perps exchanges must implement this interface
 */
export interface IPerpetualMarketService extends IBaseMarketService {
  /**
   * Get current funding rate
   */
  getFundingRate(symbol?: string): Promise<ApiResponse<FundingRate | FundingRate[]>>;

  /**
   * Get funding rate history
   */
  getFundingRateHistory(
    symbol: string,
    startTime?: number,
    endTime?: number,
    limit?: number,
  ): Promise<ApiResponse<FundingRate[]>>;

  /**
   * Get mark price (used for liquidation)
   */
  getMarkPrice(symbol?: string): Promise<ApiResponse<MarkPrice | MarkPrice[]>>;

  /**
   * Get index price (spot reference price)
   */
  getIndexPrice(symbol: string): Promise<ApiResponse<string>>;

  /**
   * Get open interest
   */
  getOpenInterest(symbol: string): Promise<ApiResponse<OpenInterest>>;

  /**
   * Get open interest history
   */
  getOpenInterestHistory(
    symbol: string,
    period: string,
    startTime?: number,
    endTime?: number,
    limit?: number,
  ): Promise<ApiResponse<OpenInterest[]>>;

  /**
   * Get long/short ratio
   */
  getLongShortRatio(
    symbol: string,
    period: string,
    startTime?: number,
    endTime?: number,
    limit?: number,
  ): Promise<ApiResponse<LongShortRatio[]>>;

  /**
   * Get premium index
   */
  getPremiumIndex(symbol?: string): Promise<ApiResponse<PremiumIndex | PremiumIndex[]>>;

  /**
   * Get recent liquidation orders
   */
  getLiquidationOrders(
    symbol: string,
    startTime?: number,
    endTime?: number,
    limit?: number,
  ): Promise<ApiResponse<LiquidationOrder[]>>;

  /**
   * Get contract specifications
   */
  getContractInfo(symbol?: string): Promise<ApiResponse<any>>;

  /**
   * Get all available futures symbols
   */
  getFuturesSymbols(): Promise<ApiResponse<string[]>>;

  /**
   * Format quantity according to symbol's lot size
   */
  formatQuantity(symbol: string, quantity: string): Promise<string>;

  /**
   * Format price according to symbol's tick size
   */
  formatPrice(symbol: string, price: string): Promise<string>;

  /**
   * Get min/max quantity for symbol
   */
  getQuantityLimits(symbol: string): Promise<ApiResponse<{ min: string; max: string }>>;

  /**
   * Get min/max notional value for symbol
   */
  getNotionalLimits(symbol: string): Promise<ApiResponse<{ min: string; max: string }>>;
}
