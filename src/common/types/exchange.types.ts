/**
 * Exchange-agnostic common types
 * Can be used across all exchanges (Aster, Hyperliquid, Binance, etc.)
 */

export type ExchangeName = 'aster' | 'hyperliquid' | 'binance' | 'okx' | 'orderly';
export type TradingType = 'perpetual';

export enum OrderSide {
  BUY = 'BUY',
  SELL = 'SELL',
}

export enum OrderType {
  MARKET = 'MARKET',
  LIMIT = 'LIMIT',
  STOP_MARKET = 'STOP_MARKET',
  STOP_LIMIT = 'STOP_LIMIT',
  TAKE_PROFIT = 'TAKE_PROFIT',
  TAKE_PROFIT_MARKET = 'TAKE_PROFIT_MARKET',
  TRAILING_STOP = 'TRAILING_STOP',
}

export enum OrderStatus {
  NEW = 'NEW',
  PARTIALLY_FILLED = 'PARTIALLY_FILLED',
  FILLED = 'FILLED',
  CANCELED = 'CANCELED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export enum TimeInForce {
  GTC = 'GTC', // Good Till Cancel
  IOC = 'IOC', // Immediate or Cancel
  FOK = 'FOK', // Fill or Kill
  GTX = 'GTX', // Good Till Crossing
}

export enum PositionSide {
  BOTH = 'BOTH',
  LONG = 'LONG',
  SHORT = 'SHORT',
}

export interface ExchangeCredentials {
  apiKey?: string;
  apiSecret?: string;
  privateKey?: string;
  walletAddress?: string;
  user?: string;
  signer?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
  exchange?: ExchangeName;
  tradingType?: TradingType;
}

export interface Balance {
  asset: string;
  free: string;
  locked: string;
  total: string;
}

export interface Position {
  symbol: string;
  side: PositionSide;
  size: string;
  entryPrice: string;
  markPrice?: string;
  liquidationPrice?: string;
  unrealizedPnl: string;
  realizedPnl?: string;
  leverage?: number;
  marginType?: 'isolated' | 'cross';
}

export interface Order {
  orderId: string;
  clientOrderId?: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  status: OrderStatus;
  price: string;
  quantity: string;
  executedQuantity: string;
  remainingQuantity?: string;
  timestamp: number;
  updateTime?: number;
}

export interface Trade {
  id: string;
  orderId: string;
  symbol: string;
  side: OrderSide;
  price: string;
  quantity: string;
  fee: string;
  feeAsset: string;
  timestamp: number;
}

export interface TickerPrice {
  symbol: string;
  price: string;
  timestamp: number;
}

export interface OrderBook {
  symbol: string;
  bids: [string, string][]; // [price, quantity]
  asks: [string, string][];
  timestamp: number;
}

export interface Candle {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
}
