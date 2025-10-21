import { Injectable, Logger } from '@nestjs/common';
import { AsterApiService } from './aster-api.service';
import { Trade, Order, TradeHistory, OrderHistory, AsterApiResponse } from '../types';

@Injectable()
export class HistoryService {
	private readonly logger = new Logger(HistoryService.name);

	constructor(private readonly asterApiService: AsterApiService) { }

	/**
	 * Get trade history with pagination
	 */
	async getTradeHistory(
		symbol?: string,
		limit: number = 100,
		page: number = 1,
		startTime?: number,
		endTime?: number,
	): Promise<AsterApiResponse<TradeHistory>> {
		try {
			this.logger.debug(`Fetching trade history - Symbol: ${symbol}, Page: ${page}, Limit: ${limit}`);

			const params: any = {
				limit,
				page,
			};

			if (symbol) params.symbol = symbol;
			if (startTime) params.startTime = startTime;
			if (endTime) params.endTime = endTime;

			const response = await this.asterApiService.get<TradeHistory>('/api/v1/trades/history', params);

			if (response.success && response.data) {
				this.logger.log(`Successfully fetched ${response.data.trades?.length || 0} trades`);
			}

			return response;
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
	 * Get order history with pagination
	 */
	async getOrderHistory(
		symbol?: string,
		limit: number = 100,
		page: number = 1,
		startTime?: number,
		endTime?: number,
	): Promise<AsterApiResponse<OrderHistory>> {
		try {
			this.logger.debug(`Fetching order history - Symbol: ${symbol}, Page: ${page}, Limit: ${limit}`);

			const params: any = {
				limit,
				page,
			};

			if (symbol) params.symbol = symbol;
			if (startTime) params.startTime = startTime;
			if (endTime) params.endTime = endTime;

			const response = await this.asterApiService.get<OrderHistory>('/api/v1/orders/history', params);

			if (response.success && response.data) {
				this.logger.log(`Successfully fetched ${response.data.orders?.length || 0} orders`);
			}

			return response;
		} catch (error) {
			this.logger.error('Error fetching order history:', error);
			return {
				success: false,
				error: error.message || 'Failed to fetch order history',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Get recent trades for a specific symbol
	 */
	async getRecentTrades(symbol: string, limit: number = 50): Promise<AsterApiResponse<Trade[]>> {
		try {
			this.logger.debug(`Fetching recent trades for ${symbol}`);

			const response = await this.getTradeHistory(symbol, limit, 1);

			if (response.success && response.data) {
				return {
					success: true,
					data: response.data.trades,
					timestamp: Date.now(),
				};
			}

			return {
				success: false,
				error: response.error || 'Failed to fetch recent trades',
				timestamp: Date.now(),
			};
		} catch (error) {
			this.logger.error(`Error fetching recent trades for ${symbol}:`, error);
			return {
				success: false,
				error: error.message || 'Failed to fetch recent trades',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Get trades for a specific time period
	 */
	async getTradesInPeriod(
		symbol: string,
		startTime: number,
		endTime: number,
	): Promise<AsterApiResponse<Trade[]>> {
		try {
			this.logger.debug(`Fetching trades for ${symbol} from ${new Date(startTime)} to ${new Date(endTime)}`);

			let allTrades: Trade[] = [];
			let page = 1;
			const limit = 100;
			let hasMoreData = true;

			while (hasMoreData) {
				const response = await this.getTradeHistory(symbol, limit, page, startTime, endTime);

				if (!response.success || !response.data) {
					return {
						success: false,
						error: response.error || 'Failed to fetch trades',
						timestamp: Date.now(),
					};
				}

				allTrades = allTrades.concat(response.data.trades);

				// Check if we have more data
				hasMoreData = response.data.trades.length === limit;
				page++;
			}

			return {
				success: true,
				data: allTrades,
				timestamp: Date.now(),
			};
		} catch (error) {
			this.logger.error(`Error fetching trades in period for ${symbol}:`, error);
			return {
				success: false,
				error: error.message || 'Failed to fetch trades in period',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Get trading statistics for a symbol
	 */
	async getTradingStats(symbol: string, days: number = 30): Promise<AsterApiResponse<any>> {
		try {
			const endTime = Date.now();
			const startTime = endTime - (days * 24 * 60 * 60 * 1000);

			const tradesResponse = await this.getTradesInPeriod(symbol, startTime, endTime);

			if (!tradesResponse.success || !tradesResponse.data) {
				return tradesResponse;
			}

			const trades = tradesResponse.data;
			const stats = this.calculateTradingStats(trades);

			return {
				success: true,
				data: {
					symbol,
					period: `${days} days`,
					...stats,
				},
				timestamp: Date.now(),
			};
		} catch (error) {
			this.logger.error(`Error calculating trading stats for ${symbol}:`, error);
			return {
				success: false,
				error: error.message || 'Failed to calculate trading stats',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Calculate trading statistics from trades
	 */
	private calculateTradingStats(trades: Trade[]): any {
		if (trades.length === 0) {
			return {
				totalTrades: 0,
				totalVolume: '0',
				totalFees: '0',
				averagePrice: '0',
				buyTrades: 0,
				sellTrades: 0,
			};
		}

		let totalVolume = 0;
		let totalFees = 0;
		let totalValue = 0;
		let buyTrades = 0;
		let sellTrades = 0;

		trades.forEach(trade => {
			const quantity = parseFloat(trade.quantity);
			const price = parseFloat(trade.price);
			const fee = parseFloat(trade.fee);

			totalVolume += quantity;
			totalFees += fee;
			totalValue += quantity * price;

			if (trade.side === 'BUY') {
				buyTrades++;
			} else {
				sellTrades++;
			}
		});

		const averagePrice = totalVolume > 0 ? totalValue / totalVolume : 0;

		return {
			totalTrades: trades.length,
			totalVolume: totalVolume.toFixed(8),
			totalFees: totalFees.toFixed(8),
			averagePrice: averagePrice.toFixed(8),
			buyTrades,
			sellTrades,
			totalValue: totalValue.toFixed(8),
		};
	}

	/**
	 * Get P&L for a specific period
	 */
	async getPnL(symbol?: string, days: number = 30): Promise<AsterApiResponse<any>> {
		try {
			this.logger.debug(`Calculating P&L${symbol ? ` for ${symbol}` : ''} over ${days} days`);

			const endTime = Date.now();
			const startTime = endTime - (days * 24 * 60 * 60 * 1000);

			const tradesResponse = symbol
				? await this.getTradesInPeriod(symbol, startTime, endTime)
				: await this.getTradeHistory(undefined, 1000, 1, startTime, endTime);

			if (!tradesResponse.success) {
				return tradesResponse;
			}

			const trades = Array.isArray(tradesResponse.data)
				? tradesResponse.data
				: tradesResponse.data?.trades || [];

			const pnl = this.calculatePnL(trades);

			return {
				success: true,
				data: {
					symbol: symbol || 'ALL',
					period: `${days} days`,
					...pnl,
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
	 * Calculate P&L from trades
	 */
	private calculatePnL(trades: Trade[]): any {
		// This is a simplified P&L calculation
		// In practice, you'd need more sophisticated tracking of positions

		let realizedPnL = 0;
		let totalFees = 0;

		trades.forEach(trade => {
			const value = parseFloat(trade.quantity) * parseFloat(trade.price);
			const fee = parseFloat(trade.fee);

			if (trade.side === 'SELL') {
				realizedPnL += value;
			} else {
				realizedPnL -= value;
			}

			totalFees += fee;
		});

		const netPnL = realizedPnL - totalFees;

		return {
			realizedPnL: realizedPnL.toFixed(8),
			totalFees: totalFees.toFixed(8),
			netPnL: netPnL.toFixed(8),
			tradeCount: trades.length,
		};
	}

	/**
	 * Export trade history to CSV format
	 */
	async exportTradeHistoryCSV(symbol?: string, days: number = 30): Promise<AsterApiResponse<string>> {
		try {
			const endTime = Date.now();
			const startTime = endTime - (days * 24 * 60 * 60 * 1000);

			const tradesResponse = symbol
				? await this.getTradesInPeriod(symbol, startTime, endTime)
				: await this.getTradeHistory(undefined, 1000, 1, startTime, endTime);

			if (!tradesResponse.success) {
				return {
					success: false,
					error: tradesResponse.error || 'Failed to fetch trades',
					timestamp: Date.now(),
				};
			}

			const trades = Array.isArray(tradesResponse.data)
				? tradesResponse.data
				: tradesResponse.data?.trades || [];

			const csv = this.convertTradesToCSV(trades);

			return {
				success: true,
				data: csv,
				timestamp: Date.now(),
			};
		} catch (error) {
			this.logger.error('Error exporting trade history:', error);
			return {
				success: false,
				error: error.message || 'Failed to export trade history',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Convert trades to CSV format
	 */
	private convertTradesToCSV(trades: Trade[]): string {
		if (trades.length === 0) {
			return 'No trades found';
		}

		const headers = 'ID,OrderID,Symbol,Side,Quantity,Price,Fee,FeeAsset,Timestamp,Date';
		const rows = trades.map(trade => {
			const date = new Date(trade.timestamp).toISOString();
			return `${trade.id},${trade.orderId},${trade.symbol},${trade.side},${trade.quantity},${trade.price},${trade.fee},${trade.feeAsset},${trade.timestamp},${date}`;
		});

		return [headers, ...rows].join('\n');
	}
}