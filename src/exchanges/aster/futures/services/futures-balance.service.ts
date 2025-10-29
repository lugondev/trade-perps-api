import { Injectable, Logger } from '@nestjs/common';
import { IFuturesBalanceService } from '../../../../common/interfaces';
import {
  ApiResponse,
  Balance,
  Position,
  PositionSide,
} from '../../../../common/types/exchange.types';
import { AsterApiService } from '../../shared/aster-api.service';

@Injectable()
export class AsterFuturesBalanceService implements IFuturesBalanceService {
  private readonly logger = new Logger(AsterFuturesBalanceService.name);

  constructor(private readonly asterApiService: AsterApiService) {}

  /**
   * Get account balance
   */
  async getBalance(asset?: string): Promise<ApiResponse<Balance | Balance[]>> {
    try {
      const params = {
        timestamp: Date.now(),
        recvWindow: 50000,
      };

      const response = await this.asterApiService.get<any>('/fapi/v3/account', params);

      if (response.success && response.data) {
        const balances: Balance[] =
          response.data.assets?.map((a: any) => ({
            asset: a.asset,
            free: a.availableBalance || a.free || '0',
            locked: a.locked || '0',
            total: a.walletBalance || a.total || '0',
          })) || [];

        if (asset) {
          const balance = balances.find(b => b.asset === asset);
          if (!balance) {
            return {
              success: false,
              error: `Asset ${asset} not found`,
              timestamp: Date.now(),
            };
          }
          return {
            success: true,
            data: balance,
            timestamp: Date.now(),
            exchange: 'aster',
            tradingType: 'futures',
          };
        }

        return {
          success: true,
          data: balances,
          timestamp: Date.now(),
          exchange: 'aster',
          tradingType: 'futures',
        };
      }

      return response;
    } catch (error) {
      this.logger.error('Error getting balance:', error);
      return {
        success: false,
        error: error.message || 'Failed to get balance',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get non-zero balances
   */
  async getNonZeroBalances(): Promise<ApiResponse<Balance[]>> {
    try {
      const result = await this.getBalance();
      if (result.success && result.data) {
        const balances = Array.isArray(result.data) ? result.data : [result.data];
        const nonZeroBalances = balances.filter(b => parseFloat(b.total) > 0);
        return {
          ...result,
          data: nonZeroBalances,
        };
      }
      return result as ApiResponse<Balance[]>;
    } catch (error) {
      this.logger.error('Error getting non-zero balances:', error);
      return {
        success: false,
        error: error.message || 'Failed to get non-zero balances',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get total portfolio value
   */
  async getPortfolioValue(): Promise<
    ApiResponse<{ totalValue: string; availableBalance: string; usedMargin?: string }>
  > {
    try {
      const accountInfo = await this.getAccountInfo();
      if (accountInfo.success && accountInfo.data) {
        return {
          success: true,
          data: {
            totalValue: accountInfo.data.totalWalletBalance || '0',
            availableBalance: accountInfo.data.availableBalance || '0',
            usedMargin: accountInfo.data.totalMarginBalance || '0',
          },
          timestamp: Date.now(),
          exchange: 'aster',
          tradingType: 'futures',
        };
      }
      return accountInfo;
    } catch (error) {
      this.logger.error('Error getting portfolio value:', error);
      return {
        success: false,
        error: error.message || 'Failed to get portfolio value',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get positions
   */
  async getPositions(symbol?: string): Promise<ApiResponse<Position | Position[]>> {
    try {
      const params: any = {
        timestamp: Date.now(),
        recvWindow: 50000,
      };

      if (symbol) params.symbol = symbol;

      const response = await this.asterApiService.get<any[]>('/fapi/v3/positionRisk', params);

      if (response.success && response.data) {
        const positions: Position[] = response.data.map(p => ({
          symbol: p.symbol,
          side:
            parseFloat(p.positionAmt) > 0
              ? PositionSide.LONG
              : parseFloat(p.positionAmt) < 0
                ? PositionSide.SHORT
                : PositionSide.BOTH,
          size: p.positionAmt || '0',
          entryPrice: p.entryPrice || '0',
          markPrice: p.markPrice,
          liquidationPrice: p.liquidationPrice,
          unrealizedPnl: p.unRealizedProfit || '0',
          leverage: parseFloat(p.leverage) || 1,
          marginType: p.marginType === 'cross' ? 'cross' : 'isolated',
        }));

        if (symbol) {
          const position = positions.find(p => p.symbol === symbol);
          if (!position) {
            return {
              success: false,
              error: `Position not found for ${symbol}`,
              timestamp: Date.now(),
            };
          }
          return {
            success: true,
            data: position,
            timestamp: Date.now(),
            exchange: 'aster',
            tradingType: 'futures',
          };
        }

        return {
          success: true,
          data: positions,
          timestamp: Date.now(),
          exchange: 'aster',
          tradingType: 'futures',
        };
      }

      return response;
    } catch (error) {
      this.logger.error('Error getting positions:', error);
      return {
        success: false,
        error: error.message || 'Failed to get positions',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get non-zero positions
   */
  async getNonZeroPositions(): Promise<ApiResponse<Position[]>> {
    try {
      const result = await this.getPositions();
      if (result.success && result.data) {
        const positions = Array.isArray(result.data) ? result.data : [result.data];
        const nonZeroPositions = positions.filter(p => parseFloat(p.size) !== 0);
        return {
          ...result,
          data: nonZeroPositions,
        };
      }
      return result as ApiResponse<Position[]>;
    } catch (error) {
      this.logger.error('Error getting non-zero positions:', error);
      return {
        success: false,
        error: error.message || 'Failed to get non-zero positions',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get account information
   */
  async getAccountInfo(): Promise<ApiResponse<any>> {
    try {
      const params = {
        timestamp: Date.now(),
        recvWindow: 50000,
      };

      return await this.asterApiService.get('/fapi/v3/account', params);
    } catch (error) {
      this.logger.error('Error getting account info:', error);
      return {
        success: false,
        error: error.message || 'Failed to get account info',
        timestamp: Date.now(),
      };
    }
  }

  // ==================== Additional Futures Interface Methods ====================
  // TODO: Implement these methods fully

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getPositionMargin(symbol?: string): Promise<ApiResponse<any>> {
    // Stub implementation
    return { success: false, error: 'Not implemented yet', timestamp: Date.now() };
  }

  async getAvailableBalance(): Promise<ApiResponse<string>> {
    const accountInfo = await this.getAccountInfo();
    if (accountInfo.success && accountInfo.data?.availableBalance) {
      return {
        success: true,
        data: accountInfo.data.availableBalance,
        timestamp: Date.now(),
      };
    }
    return { success: false, error: 'Failed to get available balance', timestamp: Date.now() };
  }

  async getTotalWalletBalance(): Promise<ApiResponse<string>> {
    const accountInfo = await this.getAccountInfo();
    if (accountInfo.success && accountInfo.data?.totalWalletBalance) {
      return {
        success: true,
        data: accountInfo.data.totalWalletBalance,
        timestamp: Date.now(),
      };
    }
    return { success: false, error: 'Failed to get total wallet balance', timestamp: Date.now() };
  }

  async getTotalUnrealizedPnl(): Promise<ApiResponse<string>> {
    const accountInfo = await this.getAccountInfo();
    if (accountInfo.success && accountInfo.data?.totalUnrealizedProfit) {
      return {
        success: true,
        data: accountInfo.data.totalUnrealizedProfit,
        timestamp: Date.now(),
      };
    }
    return { success: false, error: 'Failed to get unrealized PnL', timestamp: Date.now() };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getMaxWithdrawAmount(asset?: string): Promise<ApiResponse<string>> {
    const accountInfo = await this.getAccountInfo();
    if (accountInfo.success && accountInfo.data?.maxWithdrawAmount) {
      return {
        success: true,
        data: accountInfo.data.maxWithdrawAmount,
        timestamp: Date.now(),
      };
    }
    return { success: false, error: 'Failed to get max withdraw amount', timestamp: Date.now() };
  }

  async getIncomeHistory(
    symbol?: string,
    incomeType?: string,
    startTime?: number,
    endTime?: number,
    limit?: number,
  ): Promise<ApiResponse<any[]>> {
    try {
      const params: any = { timestamp: Date.now(), recvWindow: 50000 };
      if (symbol) params.symbol = symbol;
      if (incomeType) params.incomeType = incomeType;
      if (startTime) params.startTime = startTime;
      if (endTime) params.endTime = endTime;
      if (limit) params.limit = limit;

      return await this.asterApiService.hmacGet('/fapi/v1/income', params);
    } catch (error) {
      return { success: false, error: error.message, timestamp: Date.now() };
    }
  }

  async getTransactionHistory(
    symbol?: string,
    startTime?: number,
    endTime?: number,
    limit?: number,
  ): Promise<ApiResponse<any[]>> {
    try {
      const params: any = { timestamp: Date.now(), recvWindow: 50000 };
      if (symbol) params.symbol = symbol;
      if (startTime) params.startTime = startTime;
      if (endTime) params.endTime = endTime;
      if (limit) params.limit = limit;

      return await this.asterApiService.hmacGet('/fapi/v1/userTrades', params);
    } catch (error) {
      return { success: false, error: error.message, timestamp: Date.now() };
    }
  }

  async getFundingFeeHistory(
    symbol?: string,
    startTime?: number,
    endTime?: number,
    limit?: number,
  ): Promise<ApiResponse<any[]>> {
    return this.getIncomeHistory(symbol, 'FUNDING_FEE', startTime, endTime, limit);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getMarginRatio(symbol: string): Promise<ApiResponse<string>> {
    return { success: false, error: 'Not implemented yet', timestamp: Date.now() };
  }

  async isAtRiskOfLiquidation(): Promise<ApiResponse<boolean>> {
    return { success: false, error: 'Not implemented yet', timestamp: Date.now() };
  }

  async calculateRequiredMargin(
    symbol: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    quantity: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    leverage: number, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<ApiResponse<string>> {
    return { success: false, error: 'Not implemented yet', timestamp: Date.now() };
  }

  async calculatePotentialPnl(
    symbol: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    entryPrice: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    exitPrice: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    quantity: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    side: 'LONG' | 'SHORT', // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<ApiResponse<{ pnl: string; pnlPercentage: string }>> {
    return { success: false, error: 'Not implemented yet', timestamp: Date.now() };
  }
}
