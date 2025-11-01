/**
 * Perpetual Balance Service Interface
 * Extends base balance interface with perpetual-specific features
 */

import { ApiResponse, Balance, Position } from '../types/exchange.types';
import { IBaseBalanceService } from './balance.interface';

/**
 * Perpetual account information
 */
export interface PerpetualAccountInfo {
  totalWalletBalance: string;
  totalUnrealizedProfit: string;
  totalMarginBalance: string;
  totalPositionInitialMargin: string;
  totalOpenOrderInitialMargin: string;
  totalCrossWalletBalance: string;
  totalCrossUnPnl: string;
  availableBalance: string;
  maxWithdrawAmount: string;
  assets: Balance[];
  positions: Position[];
  canTrade: boolean;
  canDeposit: boolean;
  canWithdraw: boolean;
  updateTime: number;
}

/**
 * Margin information for a position
 */
export interface PositionMargin {
  symbol: string;
  initialMargin: string;
  maintenanceMargin: string;
  marginBalance: string;
  marginRatio: string;
  liquidationPrice: string;
  markPrice: string;
  positionSide?: string;
}

/**
 * Income history entry (funding, realized PnL, etc.)
 */
export interface IncomeHistory {
  symbol: string;
  incomeType:
    | 'FUNDING_FEE'
    | 'REALIZED_PNL'
    | 'COMMISSION'
    | 'TRANSFER'
    | 'WELCOME_BONUS'
    | 'INSURANCE_CLEAR'
    | 'REFERRAL_KICKBACK';
  income: string;
  asset: string;
  info?: string;
  time: number;
  tranId: string;
  tradeId?: string;
}

/**
 * Transaction history for perpetual account
 */
export interface TransactionHistory {
  symbol?: string;
  id: string;
  orderId?: string;
  side: 'BUY' | 'SELL';
  price: string;
  quantity: string;
  realizedPnl: string;
  marginAsset: string;
  quoteQuantity: string;
  commission: string;
  commissionAsset: string;
  time: number;
  positionSide?: string;
  buyer?: boolean;
  maker?: boolean;
}

/**
 * Perpetual Balance Service Interface
 * All perpetual/perps exchanges must implement this interface
 */
export interface IPerpetualBalanceService extends IBaseBalanceService {
  /**
   * Position Management
   */

  /**
   * Get current positions
   */
  getPositions(symbol?: string): Promise<ApiResponse<Position | Position[]>>;

  /**
   * Get positions with non-zero size
   */
  getNonZeroPositions(): Promise<ApiResponse<Position[]>>;

  /**
   * Get position information with margin details
   */
  getPositionMargin(symbol?: string): Promise<ApiResponse<PositionMargin | PositionMargin[]>>;

  /**
   * Account Information
   */

  /**
   * Get complete perpetual account information
   * Includes balances, positions, margin info, etc.
   */
  getAccountInfo(): Promise<ApiResponse<PerpetualAccountInfo>>;

  /**
   * Get available balance for trading
   */
  getAvailableBalance(): Promise<ApiResponse<string>>;

  /**
   * Get total wallet balance (including unrealized PnL)
   */
  getTotalWalletBalance(): Promise<ApiResponse<string>>;

  /**
   * Get total unrealized profit/loss
   */
  getTotalUnrealizedPnl(): Promise<ApiResponse<string>>;

  /**
   * Get maximum amount that can be withdrawn
   */
  getMaxWithdrawAmount(asset?: string): Promise<ApiResponse<string>>;

  /**
   * History and Records
   */

  /**
   * Get income history (funding fees, realized PnL, commissions, etc.)
   */
  getIncomeHistory(
    symbol?: string,
    incomeType?: string,
    startTime?: number,
    endTime?: number,
    limit?: number,
  ): Promise<ApiResponse<IncomeHistory[]>>;

  /**
   * Get transaction history (trades)
   */
  getTransactionHistory(
    symbol?: string,
    startTime?: number,
    endTime?: number,
    limit?: number,
  ): Promise<ApiResponse<TransactionHistory[]>>;

  /**
   * Get funding fee history
   */
  getFundingFeeHistory(
    symbol?: string,
    startTime?: number,
    endTime?: number,
    limit?: number,
  ): Promise<ApiResponse<IncomeHistory[]>>;

  /**
   * Margin Operations
   */

  /**
   * Get margin ratio for symbol
   */
  getMarginRatio(symbol: string): Promise<ApiResponse<string>>;

  /**
   * Check if account is at risk of liquidation
   */
  isAtRiskOfLiquidation(): Promise<ApiResponse<boolean>>;

  /**
   * Calculate required margin for a position
   */
  calculateRequiredMargin(
    symbol: string,
    quantity: string,
    leverage: number,
  ): Promise<ApiResponse<string>>;

  /**
   * Calculate potential PnL
   */
  calculatePotentialPnl(
    symbol: string,
    entryPrice: string,
    exitPrice: string,
    quantity: string,
    side: 'LONG' | 'SHORT',
  ): Promise<ApiResponse<{ pnl: string; pnlPercentage: string }>>;
}
