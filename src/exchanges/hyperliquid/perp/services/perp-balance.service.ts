import { Injectable, Logger } from '@nestjs/common';
import { formatSymbol, formatSymbolResponse } from './perp-market.utils';
import { IPerpetualBalanceService } from '../../../../common/interfaces';
import {
  ApiResponse,
  Balance,
  Position,
  PositionSide,
} from '../../../../common/types/exchange.types';
import { HyperliquidApiService } from '../../shared/hyperliquid-api.service';

@Injectable()
export class HyperliquidPerpBalanceService implements IPerpetualBalanceService {
  private readonly logger = new Logger(HyperliquidPerpBalanceService.name);

  constructor(private readonly apiService: HyperliquidApiService) {}

  /**
   * Get account balance
   */
  async getBalance(asset?: string): Promise<ApiResponse<Balance | Balance[]>> {
    try {
      const result = await this.apiService.getUserState();

      if (!result.success || !result.data) {
        return {
          success: false,
          error: 'Failed to get balance',
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      const balances: Balance[] = [
        {
          asset: 'USDC',
          free: result.data.withdrawable || '0',
          locked: parseFloat(result.data.crossMarginSummary?.totalMarginUsed || '0').toString(),
          total: result.data.crossMarginSummary?.accountValue || '0',
        },
      ];

      if (asset) {
        const balance = balances.find(b => b.asset.toUpperCase() === asset.toUpperCase());
        if (!balance) {
          return {
            success: false,
            error: `Asset ${asset} not found`,
            timestamp: Date.now(),
            exchange: 'hyperliquid',
            tradingType: 'perpetual',
          };
        }

        return {
          success: true,
          data: balance,
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      return {
        success: true,
        data: balances,
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    } catch (error: any) {
      this.logger.error(`Error getting balance: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
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
    } catch (error: any) {
      this.logger.error(`Error getting non-zero balances: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
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
            totalValue: accountInfo.data.crossMarginSummary?.accountValue || '0',
            availableBalance: accountInfo.data.withdrawable || '0',
            usedMargin: accountInfo.data.crossMarginSummary?.totalMarginUsed || '0',
          },
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      return accountInfo;
    } catch (error: any) {
      this.logger.error(`Error getting portfolio value: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    }
  }

  /**
   * Get positions
   */
  async getPositions(symbol?: string): Promise<ApiResponse<Position | Position[]>> {
    try {
      const result = await this.apiService.getUserState();

      if (!result.success || !result.data?.assetPositions) {
        return {
          success: false,
          error: 'Failed to get positions',
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      let positions = result.data.assetPositions;

      if (symbol) {
        const coin = formatSymbol(symbol);
        positions = positions.filter((p: any) => p.position.coin === coin);
      }

      const mappedPositions: Position[] = positions
        .filter((p: any) => parseFloat(p.position.szi) !== 0)
        .map((pos: any) => {
          const position = pos.position;
          const posSize = parseFloat(position.szi);

          return {
            symbol: formatSymbolResponse(position.coin),
            side: posSize > 0 ? PositionSide.LONG : PositionSide.SHORT,
            size: Math.abs(posSize).toString(),
            entryPrice: position.entryPx,
            markPrice: '0',
            liquidationPrice: position.liquidationPx || '0',
            unrealizedPnl: position.unrealizedPnl,
            leverage: position.leverage.value,
            marginType: position.leverage.type === 'cross' ? 'cross' : 'isolated',
          };
        });

      if (symbol) {
        const position = mappedPositions[0];

        if (!position) {
          return {
            success: false,
            error: `Position not found for ${symbol}`,
            timestamp: Date.now(),
            exchange: 'hyperliquid',
            tradingType: 'perpetual',
          };
        }

        return {
          success: true,
          data: position,
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      return {
        success: true,
        data: mappedPositions,
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    } catch (error: any) {
      this.logger.error(`Error getting positions: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
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
    } catch (error: any) {
      this.logger.error(`Error getting non-zero positions: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    }
  }

  /**
   * Get account information
   */
  async getAccountInfo(): Promise<ApiResponse<any>> {
    try {
      const result = await this.apiService.getUserState();

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to get account info',
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      return {
        success: true,
        data: result.data,
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    } catch (error: any) {
      this.logger.error(`Error getting account info: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    }
  }

  /**
   * Get position margin
   */
  async getPositionMargin(symbol?: string): Promise<ApiResponse<any>> {
    try {
      const accountInfo = await this.getAccountInfo();

      if (!accountInfo.success || !accountInfo.data) {
        return accountInfo;
      }

      if (symbol) {
        const positions = accountInfo.data.assetPositions || [];
        const coin = formatSymbol(symbol);
        const position = positions.find((p: any) => p.position.coin === coin);

        if (!position) {
          return {
            success: false,
            error: `Position not found for ${symbol}`,
            timestamp: Date.now(),
            exchange: 'hyperliquid',
            tradingType: 'perpetual',
          };
        }

        return {
          success: true,
          data: {
            symbol,
            marginUsed: position.position.marginUsed,
            marginType: position.position.leverage.type,
          },
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      return {
        success: true,
        data: {
          totalMarginUsed: accountInfo.data.crossMarginSummary?.totalMarginUsed || '0',
        },
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    } catch (error: any) {
      this.logger.error(`Error getting position margin: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    }
  }

  /**
   * Get available balance
   */
  async getAvailableBalance(): Promise<ApiResponse<string>> {
    try {
      const accountInfo = await this.getAccountInfo();

      if (accountInfo.success && accountInfo.data?.withdrawable) {
        return {
          success: true,
          data: accountInfo.data.withdrawable,
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      return {
        success: false,
        error: 'Failed to get available balance',
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    } catch (error: any) {
      this.logger.error(`Error getting available balance: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    }
  }

  /**
   * Get total wallet balance
   */
  async getTotalWalletBalance(): Promise<ApiResponse<string>> {
    try {
      const accountInfo = await this.getAccountInfo();

      if (accountInfo.success && accountInfo.data?.crossMarginSummary?.accountValue) {
        return {
          success: true,
          data: accountInfo.data.crossMarginSummary.accountValue,
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      return {
        success: false,
        error: 'Failed to get total wallet balance',
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    } catch (error: any) {
      this.logger.error(`Error getting total wallet balance: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    }
  }

  /**
   * Get total unrealized PnL
   */
  async getTotalUnrealizedPnl(): Promise<ApiResponse<string>> {
    try {
      const positionsResponse = await this.getPositions();

      if (!positionsResponse.success || !positionsResponse.data) {
        return {
          success: false,
          error: 'Failed to get unrealized PnL',
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      const positions = Array.isArray(positionsResponse.data)
        ? positionsResponse.data
        : [positionsResponse.data];

      const totalPnl = positions.reduce((sum, pos) => {
        return sum + parseFloat(pos.unrealizedPnl || '0');
      }, 0);

      return {
        success: true,
        data: totalPnl.toString(),
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    } catch (error: any) {
      this.logger.error(`Error getting total unrealized PnL: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    }
  }

  /**
   * Get max withdraw amount
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getMaxWithdrawAmount(asset?: string): Promise<ApiResponse<string>> {
    try {
      const accountInfo = await this.getAccountInfo();

      if (accountInfo.success && accountInfo.data?.withdrawable) {
        return {
          success: true,
          data: accountInfo.data.withdrawable,
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      return {
        success: false,
        error: 'Failed to get max withdraw amount',
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    } catch (error: any) {
      this.logger.error(`Error getting max withdraw amount: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    }
  }

  /**
   * Get income history (funding fees, realized PnL, etc.)
   */
  async getIncomeHistory(
    symbol?: string,
    incomeType?: string,
    startTime?: number,
    endTime?: number,
    limit?: number,
  ): Promise<ApiResponse<any[]>> {
    try {
      const result = await this.apiService.getUserFills();

      if (!result.success || !result.data) {
        return {
          success: false,
          error: 'Failed to get income history',
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      let fills = result.data;

      // Filter by symbol if provided
      if (symbol) {
        const coin = formatSymbol(symbol);
        fills = fills.filter((f: any) => f.coin === coin);
      }

      // Filter by time
      if (startTime) {
        fills = fills.filter((f: any) => f.time >= startTime);
      }

      if (endTime) {
        fills = fills.filter((f: any) => f.time <= endTime);
      }

      // Limit results
      if (limit) {
        fills = fills.slice(-limit);
      }

      // Map to income format
      const income = fills.map((fill: any) => ({
        symbol: formatSymbolResponse(fill.coin),
        incomeType: fill.closedPnl ? 'REALIZED_PNL' : 'COMMISSION',
        income: fill.closedPnl || `-${fill.fee}`,
        asset: fill.feeToken,
        time: fill.time,
        info: fill,
      }));

      return {
        success: true,
        data: income,
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    } catch (error: any) {
      this.logger.error(`Error getting income history: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(
    symbol?: string,
    startTime?: number,
    endTime?: number,
    limit?: number,
  ): Promise<ApiResponse<any[]>> {
    try {
      const result = await this.apiService.getUserFills();

      if (!result.success || !result.data) {
        return {
          success: false,
          error: 'Failed to get transaction history',
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      let fills = result.data;

      if (symbol) {
        const coin = formatSymbol(symbol);
        fills = fills.filter((f: any) => f.coin === coin);
      }

      if (startTime) {
        fills = fills.filter((f: any) => f.time >= startTime);
      }

      if (endTime) {
        fills = fills.filter((f: any) => f.time <= endTime);
      }

      if (limit) {
        fills = fills.slice(-limit);
      }

      return {
        success: true,
        data: fills.map((f: any) => ({
          symbol: formatSymbolResponse(f.coin),
          side: f.side === 'B' ? 'BUY' : 'SELL',
          price: f.px,
          quantity: f.sz,
          commission: f.fee,
          commissionAsset: f.feeToken,
          time: f.time,
          realizedPnl: f.closedPnl || '0',
        })),
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    } catch (error: any) {
      this.logger.error(`Error getting transaction history: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    }
  }

  /**
   * Get funding fee history
   */
  async getFundingFeeHistory(
    symbol?: string,
    startTime?: number,
    endTime?: number,
    limit?: number,
  ): Promise<ApiResponse<any[]>> {
    try {
      if (!symbol) {
        return {
          success: false,
          error: 'Symbol is required for funding fee history',
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      const coin = formatSymbol(symbol);
      const result = await this.apiService.getFundingHistory(coin, startTime, endTime);

      if (!result.success || !result.data) {
        return {
          success: false,
          error: 'Failed to get funding fee history',
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      let history = result.data;

      if (limit) {
        history = history.slice(-limit);
      }

      return {
        success: true,
        data: history.map((h: any) => ({
          symbol,
          fundingRate: h.fundingRate,
          fundingTime: h.time,
          // Hyperliquid doesn't provide per-user funding fees in this endpoint
          // Would need to calculate based on position size at funding time
        })),
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    } catch (error: any) {
      this.logger.error(`Error getting funding fee history: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    }
  }

  /**
   * Get margin ratio
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getMarginRatio(symbol: string): Promise<ApiResponse<string>> {
    return {
      success: false,
      error: 'Not implemented yet',
      timestamp: Date.now(),
      exchange: 'hyperliquid',
      tradingType: 'perpetual',
    };
  }

  /**
   * Check if at risk of liquidation
   */
  async isAtRiskOfLiquidation(): Promise<ApiResponse<boolean>> {
    try {
      const positionsResponse = await this.getNonZeroPositions();

      if (!positionsResponse.success) {
        return {
          success: false,
          error: 'Failed to check liquidation risk',
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      const positions = positionsResponse.data || [];

      // Check if any position has liquidation price close to mark price
      const atRisk = positions.some(pos => {
        if (!pos.liquidationPrice || !pos.markPrice) return false;

        const liqPrice = parseFloat(pos.liquidationPrice);
        const markPrice = parseFloat(pos.markPrice);

        if (liqPrice === 0) return false;

        // Consider at risk if within 10% of liquidation price
        const diff = Math.abs(markPrice - liqPrice) / markPrice;
        return diff < 0.1;
      });

      return {
        success: true,
        data: atRisk,
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    } catch (error: any) {
      this.logger.error(`Error checking liquidation risk: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    }
  }

  /**
   * Calculate required margin
   */
  async calculateRequiredMargin(
    symbol: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    quantity: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    leverage: number, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<ApiResponse<string>> {
    return {
      success: false,
      error: 'Not implemented yet',
      timestamp: Date.now(),
      exchange: 'hyperliquid',
      tradingType: 'perpetual',
    };
  }

  /**
   * Calculate potential PnL
   */
  async calculatePotentialPnl(
    symbol: string,
    entryPrice: string,
    exitPrice: string,
    quantity: string,
    side: 'LONG' | 'SHORT',
  ): Promise<ApiResponse<{ pnl: string; pnlPercentage: string }>> {
    try {
      const entry = parseFloat(entryPrice);
      const exit = parseFloat(exitPrice);
      const qty = parseFloat(quantity);

      let pnl: number;
      if (side === 'LONG') {
        pnl = (exit - entry) * qty;
      } else {
        pnl = (entry - exit) * qty;
      }

      const pnlPercentage = ((pnl / (entry * qty)) * 100).toFixed(2);

      return {
        success: true,
        data: {
          pnl: pnl.toString(),
          pnlPercentage: `${pnlPercentage}%`,
        },
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    } catch (error: any) {
      this.logger.error(`Error calculating potential PnL: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    }
  }

  /**
   * Format symbol from BTCUSDT to BTC
   */
  // formatSymbol and formatSymbolResponse are provided by shared utils (perp-market.utils.ts)
}
