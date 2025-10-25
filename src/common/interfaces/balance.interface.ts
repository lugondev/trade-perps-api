/**
 * Base Balance Service Interface
 * All exchange balance services must implement this interface
 */

import { ApiResponse, Balance, Position } from '../types/exchange.types';

export interface IBaseBalanceService {
  /**
   * Get account balance
   */
  getBalance(asset?: string): Promise<ApiResponse<Balance | Balance[]>>;

  /**
   * Get non-zero balances
   */
  getNonZeroBalances(): Promise<ApiResponse<Balance[]>>;

  /**
   * Get total portfolio value in USD
   */
  getPortfolioValue(): Promise<ApiResponse<{
    totalValue: string;
    availableBalance: string;
    usedMargin?: string;
  }>>;
}

