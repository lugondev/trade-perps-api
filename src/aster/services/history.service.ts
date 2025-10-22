import { Injectable, Logger } from '@nestjs/common';
import { AsterApiService } from './aster-api.service';
import { Trade, Order, AsterApiResponse } from '../types';

@Injectable()
export class HistoryService {
	private readonly logger = new Logger(HistoryService.name);

	constructor(private readonly asterApiService: AsterApiService) { }

	/**
	 * Get account trade list (Account Trade List USER_DATA)
	 * If startTime and endTime are both not sent, then the last 7 days' data will be returned
	 * The time between startTime and endTime cannot be longer than 7 days
	 */
	async getTradeHistory(
		symbol: string,
		startTime?: number,
		endTime?: number,
		fromId?: number,
		limit: number = 500,
	): Promise<AsterApiResponse<Trade[]>> {
		try {
			this.logger.debug(`Fetching trade history - Symbol: ${symbol}, Limit: ${limit}`);

			const params: any = {
				symbol,
				timestamp: Date.now(),
				recvWindow: 50000,
				limit,
			};

			if (startTime) params.startTime = startTime;
			if (endTime) params.endTime = endTime;
			if (fromId) params.fromId = fromId;

			const response = await this.asterApiService.get<Trade[]>('/fapi/v1/userTrades', params);

			if (response.success && response.data) {
				this.logger.log(`Successfully fetched ${response.data.length} trades`);
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
	 * Get all orders (All Orders USER_DATA)
	 * Get all account orders; active, canceled, or filled
	 * If orderId is set, it will get orders >= that orderId. Otherwise most recent orders are returned
	 * The query time period must be less than 7 days (default as the recent 7 days)
	 */
	async getOrderHistory(
		symbol: string,
		orderId?: number,
		startTime?: number,
		endTime?: number,
		limit: number = 500,
	): Promise<AsterApiResponse<Order[]>> {
		try {
			this.logger.debug(`Fetching order history - Symbol: ${symbol}, Limit: ${limit}`);

			const params: any = {
				symbol,
				timestamp: Date.now(),
				recvWindow: 50000,
				limit,
			};

			if (orderId) params.orderId = orderId;
			if (startTime) params.startTime = startTime;
			if (endTime) params.endTime = endTime;

			const response = await this.asterApiService.get<Order[]>('/fapi/v1/allOrders', params);

			if (response.success && response.data) {
				this.logger.log(`Successfully fetched ${response.data.length} orders`);
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
	 * Get income history (Get Income History USER_DATA)
	 * If neither startTime nor endTime is sent, the recent 7-day data will be returned
	 * If incomeType is not sent, all kinds of flow will be returned
	 * incomeType: TRANSFER, WELCOME_BONUS, REALIZED_PNL, FUNDING_FEE, COMMISSION, INSURANCE_CLEAR, MARKET_MERCHANT_RETURN_REWARD
	 */
	async getIncomeHistory(
		symbol?: string,
		incomeType?: string,
		startTime?: number,
		endTime?: number,
		limit: number = 100,
	): Promise<AsterApiResponse<any[]>> {
		try {
			this.logger.debug(`Fetching income history`);

			const params: any = {
				timestamp: Date.now(),
				recvWindow: 50000,
				limit,
			};

			if (symbol) params.symbol = symbol;
			if (incomeType) params.incomeType = incomeType;
			if (startTime) params.startTime = startTime;
			if (endTime) params.endTime = endTime;

			const response = await this.asterApiService.get<any[]>('/fapi/v1/income', params);

			if (response.success && response.data) {
				this.logger.log(`Successfully fetched ${response.data.length} income records`);
			}

			return response;
		} catch (error) {
			this.logger.error('Error fetching income history:', error);
			return {
				success: false,
				error: error.message || 'Failed to fetch income history',
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

			const response = await this.getTradeHistory(symbol, undefined, undefined, undefined, limit);

			return response;
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
	 * Get trades for a specific time period (max 7 days)
	 */
	async getTradesInPeriod(
		symbol: string,
		startTime: number,
		endTime: number,
		limit: number = 1000,
	): Promise<AsterApiResponse<Trade[]>> {
		try {
			this.logger.debug(`Fetching trades for ${symbol} from ${new Date(startTime)} to ${new Date(endTime)}`);

			// Ensure we don't exceed 7 days
			const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
			if (endTime - startTime > sevenDaysMs) {
				return {
					success: false,
					error: 'Time range cannot exceed 7 days',
					timestamp: Date.now(),
				};
			}

			const response = await this.getTradeHistory(symbol, startTime, endTime, undefined, limit);

			return response;
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
	async getTradingStats(symbol: string, days: number = 7): Promise<AsterApiResponse<any>> {
		try {
			// Limit to max 7 days as per API constraints
			const actualDays = Math.min(days, 7);
			const endTime = Date.now();
			const startTime = endTime - (actualDays * 24 * 60 * 60 * 1000);

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
					period: `${actualDays} days`,
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
			const quantity = parseFloat(trade.qty || trade.quantity || '0');
			const price = parseFloat(trade.price || '0');
			const fee = parseFloat(trade.commission || '0');

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
	 * Get P&L for a specific period (max 7 days)
	 */
	async getPnL(symbol: string, days: number = 7): Promise<AsterApiResponse<any>> {
		try {
			this.logger.debug(`Calculating P&L for ${symbol} over ${days} days`);

			// Limit to max 7 days
			const actualDays = Math.min(days, 7);
			const endTime = Date.now();
			const startTime = endTime - (actualDays * 24 * 60 * 60 * 1000);

			const tradesResponse = await this.getTradesInPeriod(symbol, startTime, endTime);

			if (!tradesResponse.success || !tradesResponse.data) {
				return tradesResponse;
			}

			const trades = tradesResponse.data;
			const pnl = this.calculatePnL(trades);

			return {
				success: true,
				data: {
					symbol,
					period: `${actualDays} days`,
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
		let realizedPnL = 0;
		let totalFees = 0;

		trades.forEach(trade => {
			const quantity = parseFloat(trade.qty || trade.quantity || '0');
			const price = parseFloat(trade.price || '0');
			const fee = parseFloat(trade.commission || '0');
			const tradePnl = parseFloat(trade.realizedPnl || '0');

			// Use realizedPnl if available, otherwise calculate from price
			if (tradePnl !== 0) {
				realizedPnL += tradePnl;
			} else {
				const value = quantity * price;
				if (trade.side === 'SELL') {
					realizedPnL += value;
				} else {
					realizedPnL -= value;
				}
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
	async exportTradeHistoryCSV(symbol: string, days: number = 7): Promise<AsterApiResponse<string>> {
		try {
			const actualDays = Math.min(days, 7);
			const endTime = Date.now();
			const startTime = endTime - (actualDays * 24 * 60 * 60 * 1000);

			const tradesResponse = await this.getTradesInPeriod(symbol, startTime, endTime);

			if (!tradesResponse.success || !tradesResponse.data) {
				return {
					success: false,
					error: tradesResponse.error || 'Failed to fetch trades',
					timestamp: Date.now(),
				};
			}

			const trades = tradesResponse.data;
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

		// CSV header
		const headers = ['Time', 'Symbol', 'Side', 'Price', 'Quantity', 'Quote Qty', 'Commission', 'Realized PnL', 'Trade ID'];
		const rows = [headers.join(',')];

		// CSV rows
		trades.forEach(trade => {
			const row = [
				new Date(trade.time).toISOString(),
				trade.symbol,
				trade.side,
				trade.price,
				trade.qty || trade.quantity,
				trade.quoteQty,
				trade.commission,
				trade.realizedPnl || '0',
				trade.id,
			];
			rows.push(row.join(','));
		});

		return rows.join('\n');
	}
}
