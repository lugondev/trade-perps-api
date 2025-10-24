import { Injectable, Logger } from '@nestjs/common';
import { HyperliquidApiService } from './hyperliquid-api.service';
import { HyperliquidApiResponse } from '../types';

@Injectable()
export class HistoryService {
	private readonly logger = new Logger(HistoryService.name);

	constructor(private readonly hyperliquidApiService: HyperliquidApiService) { }

	/**
	 * Get user fills (trade history)
	 */
	async getTradeHistory(user?: string): Promise<HyperliquidApiResponse> {
		try {
			this.logger.debug('Fetching trade history');
			return await this.hyperliquidApiService.getUserFills(user);
		} catch (error) {
			this.logger.error('Error fetching trade history:', error);
			return {
				success: false,
				error: error.message || 'Failed to fetch trade history',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Get recent trades (last N days)
	 */
	async getRecentTrades(days: number = 7, user?: string): Promise<HyperliquidApiResponse> {
		try {
			this.logger.debug(`Fetching trades from last ${days} days`);

			const historyResponse = await this.getTradeHistory(user);
			if (!historyResponse.success || !historyResponse.data) {
				return historyResponse;
			}

			const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
			const recentTrades = historyResponse.data.filter((trade: any) => trade.time >= cutoffTime);

			return {
				success: true,
				data: recentTrades,
				timestamp: Date.now(),
			};
		} catch (error) {
			this.logger.error('Error fetching recent trades:', error);
			return {
				success: false,
				error: error.message || 'Failed to fetch recent trades',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Calculate P&L for a specific period
	 */
	async getPnL(days: number = 30, user?: string, coin?: string): Promise<HyperliquidApiResponse> {
		try {
			this.logger.debug(`Calculating P&L for last ${days} days${coin ? ` for ${coin}` : ''}`);

			const tradesResponse = await this.getRecentTrades(days, user);
			if (!tradesResponse.success || !tradesResponse.data) {
				return tradesResponse;
			}

			let trades = tradesResponse.data;

			// Filter by coin if specified
			if (coin) {
				trades = trades.filter((t: any) => t.coin === coin);
			}

			// Calculate total P&L
			const totalPnl = trades.reduce((sum: number, trade: any) => {
				const closedPnl = parseFloat(trade.closedPnl || '0');
				return sum + closedPnl;
			}, 0);

			// Calculate total fees
			const totalFees = trades.reduce((sum: number, trade: any) => {
				const fee = parseFloat(trade.fee || '0');
				return sum + fee;
			}, 0);

			// Calculate total volume
			const totalVolume = trades.reduce((sum: number, trade: any) => {
				const volume = parseFloat(trade.px) * parseFloat(trade.sz);
				return sum + volume;
			}, 0);

			// Count winning and losing trades
			const winningTrades = trades.filter((t: any) => parseFloat(t.closedPnl || '0') > 0).length;
			const losingTrades = trades.filter((t: any) => parseFloat(t.closedPnl || '0') < 0).length;
			const totalTrades = trades.length;

			const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

			return {
				success: true,
				data: {
					period: `${days} days`,
					coin: coin || 'all',
					totalPnl,
					totalFees,
					netPnl: totalPnl - totalFees,
					totalVolume,
					totalTrades,
					winningTrades,
					losingTrades,
					winRate: winRate.toFixed(2) + '%',
				},
				timestamp: Date.now(),
			};
		} catch (error) {
			this.logger.error('Error calculating P&L:', error);
			return {
				success: false,
				error: error.message || 'Failed to calculate P&L',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Get trade statistics by coin
	 */
	async getTradeStatsByCoin(days: number = 30, user?: string): Promise<HyperliquidApiResponse> {
		try {
			this.logger.debug(`Fetching trade statistics by coin for last ${days} days`);

			const tradesResponse = await this.getRecentTrades(days, user);
			if (!tradesResponse.success || !tradesResponse.data) {
				return tradesResponse;
			}

			const trades = tradesResponse.data;

			// Group trades by coin
			const statsByCoin: any = {};

			trades.forEach((trade: any) => {
				const coin = trade.coin;
				if (!statsByCoin[coin]) {
					statsByCoin[coin] = {
						coin,
						trades: [],
						totalPnl: 0,
						totalFees: 0,
						totalVolume: 0,
						winningTrades: 0,
						losingTrades: 0,
					};
				}

				statsByCoin[coin].trades.push(trade);
				statsByCoin[coin].totalPnl += parseFloat(trade.closedPnl || '0');
				statsByCoin[coin].totalFees += parseFloat(trade.fee || '0');
				statsByCoin[coin].totalVolume += parseFloat(trade.px) * parseFloat(trade.sz);

				if (parseFloat(trade.closedPnl || '0') > 0) {
					statsByCoin[coin].winningTrades++;
				} else if (parseFloat(trade.closedPnl || '0') < 0) {
					statsByCoin[coin].losingTrades++;
				}
			});

			// Calculate win rate for each coin
			const stats = Object.values(statsByCoin).map((coinStats: any) => {
				const totalTrades = coinStats.trades.length;
				const winRate = totalTrades > 0 ? (coinStats.winningTrades / totalTrades) * 100 : 0;

				return {
					coin: coinStats.coin,
					totalPnl: coinStats.totalPnl,
					totalFees: coinStats.totalFees,
					netPnl: coinStats.totalPnl - coinStats.totalFees,
					totalVolume: coinStats.totalVolume,
					totalTrades,
					winningTrades: coinStats.winningTrades,
					losingTrades: coinStats.losingTrades,
					winRate: winRate.toFixed(2) + '%',
				};
			});

			// Sort by net PnL descending
			stats.sort((a: any, b: any) => b.netPnl - a.netPnl);

			return {
				success: true,
				data: stats,
				timestamp: Date.now(),
			};
		} catch (error) {
			this.logger.error('Error fetching trade statistics by coin:', error);
			return {
				success: false,
				error: error.message || 'Failed to fetch trade statistics',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Get user fills (alias for getTradeHistory)
	 */
	async getUserFills(user?: string): Promise<HyperliquidApiResponse> {
		return this.getTradeHistory(user);
	}

	/**
	 * Get funding history for a coin
	 */
	async getFundingHistory(coin: string, startTime?: number, endTime?: number): Promise<HyperliquidApiResponse> {
		try {
			this.logger.debug(`Fetching funding history for ${coin}`);
			return await this.hyperliquidApiService.getFundingHistory(coin, startTime, endTime);
		} catch (error) {
			this.logger.error(`Error fetching funding history for ${coin}:`, error);
			return {
				success: false,
				error: error.message || 'Failed to fetch funding history',
				timestamp: Date.now(),
			};
		}
	}
}
