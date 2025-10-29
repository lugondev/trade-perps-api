/**
 * Futures/Perpetuals Trading Service Interface
 * Extends base trading interface with futures-specific features
 */

import { ApiResponse, Position, PositionSide, Order } from '../types/exchange.types';
import { IBaseTradingService } from './trading.interface';

/**
 * Position management parameters
 */
export interface SetLeverageParams {
  symbol: string;
  leverage: number;
}

export interface SetMarginTypeParams {
  symbol: string;
  marginType: 'ISOLATED' | 'CROSSED';
}

export interface SetPositionModeParams {
  dualSidePosition: boolean; // true = hedge mode, false = one-way mode
}

export interface ModifyPositionMarginParams {
  symbol: string;
  amount: string;
  type: 1 | 2; // 1: add margin, 2: reduce margin
  positionSide?: PositionSide;
}

/**
 * Stop Loss / Take Profit parameters
 */
export interface SetStopLossParams {
  symbol: string;
  stopPrice: string;
  quantity?: string; // If not provided, close entire position
  side?: 'BUY' | 'SELL';
}

export interface SetTakeProfitParams {
  symbol: string;
  takeProfitPrice: string;
  quantity?: string;
  side?: 'BUY' | 'SELL';
}

/**
 * Futures Trading Service Interface
 * All futures/perps exchanges must implement this interface
 */
export interface IFuturesTradingService extends IBaseTradingService {
  /**
   * Position Management
   */

  /**
   * Get current positions
   */
  getPositions(symbol?: string): Promise<ApiResponse<Position | Position[]>>;

  /**
   * Close position (market order)
   */
  closePosition(symbol: string, positionSide?: PositionSide): Promise<ApiResponse<Order>>;

  /**
   * Close all positions
   */
  closeAllPositions(): Promise<ApiResponse<Order[]>>;

  /**
   * Set leverage for symbol
   */
  setLeverage(
    params: SetLeverageParams,
  ): Promise<ApiResponse<{ leverage: number; symbol: string }>>;

  /**
   * Get current leverage for symbol
   */
  getLeverage(symbol: string): Promise<ApiResponse<number>>;

  /**
   * Set margin type (ISOLATED or CROSSED)
   */
  setMarginType(params: SetMarginTypeParams): Promise<ApiResponse<any>>;

  /**
   * Get current margin type
   */
  getMarginType(symbol: string): Promise<ApiResponse<'ISOLATED' | 'CROSSED'>>;

  /**
   * Set position mode (one-way or hedge mode)
   */
  setPositionMode(params: SetPositionModeParams): Promise<ApiResponse<any>>;

  /**
   * Get current position mode
   */
  getPositionMode(): Promise<ApiResponse<{ dualSidePosition: boolean }>>;

  /**
   * Modify position margin (add or reduce)
   */
  modifyPositionMargin(params: ModifyPositionMarginParams): Promise<ApiResponse<any>>;

  /**
   * Risk Management
   */

  /**
   * Set stop loss for position
   */
  setStopLoss(params: SetStopLossParams): Promise<ApiResponse<Order>>;

  /**
   * Set take profit for position
   */
  setTakeProfit(params: SetTakeProfitParams): Promise<ApiResponse<Order>>;

  /**
   * Cancel all stop loss and take profit orders for symbol
   */
  cancelAllConditionalOrders(symbol: string): Promise<ApiResponse<any>>;

  /**
   * Get funding rate
   */
  getFundingRate(symbol?: string): Promise<ApiResponse<any>>;

  /**
   * Get funding history
   */
  getFundingHistory(
    symbol: string,
    startTime?: number,
    endTime?: number,
    limit?: number,
  ): Promise<ApiResponse<any[]>>;

  /**
   * Get position risk (margin ratio, liquidation price, etc.)
   */
  getPositionRisk(symbol?: string): Promise<ApiResponse<any>>;

  /**
   * Quick position methods
   */

  /**
   * Open long position with market order
   */
  openLong(symbol: string, quantity: string): Promise<ApiResponse<Order>>;

  /**
   * Open short position with market order
   */
  openShort(symbol: string, quantity: string): Promise<ApiResponse<Order>>;

  /**
   * Close long position
   */
  closeLong(symbol: string, quantity?: string): Promise<ApiResponse<Order>>;

  /**
   * Close short position
   */
  closeShort(symbol: string, quantity?: string): Promise<ApiResponse<Order>>;
}
