import { Injectable, Logger } from '@nestjs/common';
import { HyperliquidApiService } from './hyperliquid-api.service';
import { HyperliquidApiResponse } from '../types';

@Injectable()
export class MarketDataService {
	private readonly logger = new Logger(MarketDataService.name);

	constructor(private readonly hyperliquidApiService: HyperliquidApiService) { }

	/**
	 * Get exchange meta information
	 */
	async getMeta(): Promise<HyperliquidApiResponse> {
		try {
			this.logger.debug('Fetching exchange meta information');
			return await this.hyperliquidApiService.getMeta();
		} catch (error) {
			this.logger.error('Error fetching meta information:', error);
			return {
				success: false,
				error: error.message || 'Failed to fetch meta information',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Get all available symbols
	 */
	async getSymbols(): Promise<HyperliquidApiResponse> {
		try {
			this.logger.debug('Fetching available symbols');
			const metaResponse = await this.getMeta();

			if (!metaResponse.success || !metaResponse.data) {
				return metaResponse;
			}

			const symbols = metaResponse.data.universe.map((asset: any) => ({
				name: asset.name,
				maxLeverage: asset.maxLeverage,
				szDecimals: asset.szDecimals,
				onlyIsolated: asset.onlyIsolated,
			}));

			return {
				success: true,
				data: symbols,
				timestamp: Date.now(),
			};
		} catch (error) {
			this.logger.error('Error fetching symbols:', error);
			return {
				success: false,
				error: error.message || 'Failed to fetch symbols',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Get L2 order book
	 */
	async getOrderBook(coin: string, depth: number = 20): Promise<HyperliquidApiResponse> {
		try {
			this.logger.debug(`Fetching order book for ${coin}`);
			const response = await this.hyperliquidApiService.getL2Book(coin);

			if (!response.success || !response.data) {
				return response;
			}

			// Limit depth
			const book = response.data;
			const limitedBook = {
				coin: book.coin,
				time: book.time,
				bids: book.levels[0].slice(0, depth),
				asks: book.levels[1].slice(0, depth),
			};

			return {
				success: true,
				data: limitedBook,
				timestamp: Date.now(),
			};
		} catch (error) {
			this.logger.error(`Error fetching order book for ${coin}:`, error);
			return {
				success: false,
				error: error.message || 'Failed to fetch order book',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Get recent trades
	 */
	async getRecentTrades(coin: string, limit: number = 100): Promise<HyperliquidApiResponse> {
		try {
			this.logger.debug(`Fetching recent trades for ${coin}`);
			return await this.hyperliquidApiService.getRecentTrades(coin, limit);
		} catch (error) {
			this.logger.error(`Error fetching recent trades for ${coin}:`, error);
			return {
				success: false,
				error: error.message || 'Failed to fetch recent trades',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Get current price for a coin
	 */
	async getCurrentPrice(coin: string): Promise<HyperliquidApiResponse> {
		try {
			this.logger.debug(`Fetching current price for ${coin}`);
			const midsResponse = await this.hyperliquidApiService.getAllMids();

			if (!midsResponse.success || !midsResponse.data) {
				return midsResponse;
			}

			const price = midsResponse.data[coin];

			if (!price) {
				return {
					success: false,
					error: `Price not found for ${coin}`,
					timestamp: Date.now(),
				};
			}

			return {
				success: true,
				data: price,
				timestamp: Date.now(),
			};
		} catch (error) {
			this.logger.error(`Error fetching current price for ${coin}:`, error);
			return {
				success: false,
				error: error.message || 'Failed to fetch current price',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Get all current prices
	 */
	async getAllPrices(): Promise<HyperliquidApiResponse> {
		try {
			this.logger.debug('Fetching all current prices');
			return await this.hyperliquidApiService.getAllMids();
		} catch (error) {
			this.logger.error('Error fetching all prices:', error);
			return {
				success: false,
				error: error.message || 'Failed to fetch all prices',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Get candles/klines
	 */
	async getCandles(
		coin: string,
		interval: string = '1h',
		startTime?: number,
		endTime?: number,
	): Promise<HyperliquidApiResponse> {
		try {
			this.logger.debug(`Fetching candles for ${coin}, interval: ${interval}`);
			return await this.hyperliquidApiService.getCandles(coin, interval, startTime, endTime);
		} catch (error) {
			this.logger.error(`Error fetching candles for ${coin}:`, error);
			return {
				success: false,
				error: error.message || 'Failed to fetch candles',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Get funding history
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

	/**
	 * Get 24hr ticker statistics
	 */
	async get24hrTicker(coin: string): Promise<HyperliquidApiResponse> {
		try {
			this.logger.debug(`Fetching 24hr ticker for ${coin}`);

			// Get recent trades to calculate 24hr stats
			const tradesResponse = await this.getRecentTrades(coin, 1000);
			if (!tradesResponse.success || !tradesResponse.data) {
				return tradesResponse;
			}

			const trades = tradesResponse.data;
			const now = Date.now();
			const oneDayAgo = now - 24 * 60 * 60 * 1000;

			const recentTrades = trades.filter((t: any) => t.time >= oneDayAgo);

			if (recentTrades.length === 0) {
				return {
					success: false,
					error: 'No trades in the last 24 hours',
					timestamp: Date.now(),
				};
			}

			const prices = recentTrades.map((t: any) => parseFloat(t.px));
			const volumes = recentTrades.map((t: any) => parseFloat(t.sz));

			const high = Math.max(...prices);
			const low = Math.min(...prices);
			const volume = volumes.reduce((a, b) => a + b, 0);
			const lastPrice = prices[prices.length - 1];
			const firstPrice = prices[0];
			const priceChange = lastPrice - firstPrice;
			const priceChangePercent = (priceChange / firstPrice) * 100;

			return {
				success: true,
				data: {
					coin,
					lastPrice,
					priceChange,
					priceChangePercent,
					high,
					low,
					volume,
					count: recentTrades.length,
				},
				timestamp: Date.now(),
			};
		} catch (error) {
			this.logger.error(`Error fetching 24hr ticker for ${coin}:`, error);
			return {
				success: false,
				error: error.message || 'Failed to fetch 24hr ticker',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Get all current mid prices
	 */
	async getAllMids(): Promise<HyperliquidApiResponse> {
		try {
			this.logger.debug('Fetching all mid prices');
			return await this.hyperliquidApiService.getAllMids();
		} catch (error) {
			this.logger.error('Error fetching all mids:', error);
			return {
				success: false,
				error: error.message || 'Failed to fetch all mid prices',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Get L2 order book (alias for getOrderBook)
	 */
	async getL2Book(coin: string): Promise<HyperliquidApiResponse> {
		return this.getOrderBook(coin);
	}
}
