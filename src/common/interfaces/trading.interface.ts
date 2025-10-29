/**
 * Base Trading Service Interface
 * All exchange trading services must implement this interface
 */

import { ApiResponse, Order, OrderSide, OrderType, TimeInForce } from '../types/exchange.types';

export interface PlaceOrderParams {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: string;
  price?: string;
  timeInForce?: TimeInForce;
  clientOrderId?: string;
  stopPrice?: string;
  reduceOnly?: boolean;
}

export interface MarketOrderParams {
  symbol: string;
  side: OrderSide;
  quantity: string;
  clientOrderId?: string;
  reduceOnly?: boolean;
}

export interface LimitOrderParams {
  symbol: string;
  side: OrderSide;
  quantity: string;
  price: string;
  timeInForce?: TimeInForce;
  clientOrderId?: string;
  reduceOnly?: boolean;
}

export interface CancelOrderParams {
  symbol: string;
  orderId?: string;
  clientOrderId?: string;
}

export interface IBaseTradingService {
  /**
   * Place a new order
   */
  placeOrder(params: PlaceOrderParams): Promise<ApiResponse<Order>>;

  /**
   * Place a market order (quick method)
   */
  placeMarketOrder(params: MarketOrderParams): Promise<ApiResponse<Order>>;

  /**
   * Place a limit order (quick method)
   */
  placeLimitOrder(params: LimitOrderParams): Promise<ApiResponse<Order>>;

  /**
   * Cancel an order
   */
  cancelOrder(params: CancelOrderParams): Promise<ApiResponse<any>>;

  /**
   * Cancel all orders
   */
  cancelAllOrders(symbol?: string): Promise<ApiResponse<any>>;

  /**
   * Get open orders
   */
  getOpenOrders(symbol?: string): Promise<ApiResponse<Order[]>>;

  /**
   * Get order details
   */
  getOrder(symbol: string, orderId: string): Promise<ApiResponse<Order>>;

  /**
   * Quick market buy
   */
  marketBuy(symbol: string, quantity: string): Promise<ApiResponse<Order>>;

  /**
   * Quick market sell
   */
  marketSell(symbol: string, quantity: string): Promise<ApiResponse<Order>>;

  /**
   * Quick limit buy
   */
  limitBuy(symbol: string, quantity: string, price: string): Promise<ApiResponse<Order>>;

  /**
   * Quick limit sell
   */
  limitSell(symbol: string, quantity: string, price: string): Promise<ApiResponse<Order>>;
}
