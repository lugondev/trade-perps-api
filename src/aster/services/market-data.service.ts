import { Injectable, Logger } from '@nestjs/common';
import { AsterApiService } from './aster-api.service';
import { AsterApiResponse } from '../types';

@Injectable()
export class MarketDataService {
	private readonly logger = new Logger(MarketDataService.name);

	constructor(private readonly asterApiService: AsterApiService) { }

	/**
	 * Test Connectivity - Ping
	 */
	async ping(): Promise<AsterApiResponse> {
		try {
			this.logger.debug('Testing connectivity');
			return await this.asterApiService.ping();
		} catch (error) {
			this.logger.error('Error pinging server:', error);
			return {
				success: false,
				error: error.message || 'Failed to ping server',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Check Server Time
	 */
	async getServerTime(): Promise<AsterApiResponse<{ serverTime: number }>> {
		try {
			this.logger.debug('Fetching server time');
			return await this.asterApiService.getServerTime();
		} catch (error) {
			this.logger.error('Error fetching server time:', error);
			return {
				success: false,
				error: error.message || 'Failed to fetch server time',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Exchange Information
	 */
	async getExchangeInfo(): Promise<AsterApiResponse> {
		try {
			this.logger.debug('Fetching exchange information');
			return await this.asterApiService.getExchangeInfo();
		} catch (error) {
			this.logger.error('Error fetching exchange info:', error);
			return {
				success: false,
				error: error.message || 'Failed to fetch exchange info',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Order Book - Get depth data
	 */
	async getOrderBook(symbol: string, limit: number = 500): Promise<AsterApiResponse> {
		try {
			this.logger.debug(`Fetching order book for ${symbol} with limit ${limit}`);
			return await this.asterApiService.getOrderBook(symbol, limit);
		} catch (error) {
			this.logger.error(`Error fetching order book for ${symbol}:`, error);
			return {
				success: false,
				error: error.message || `Failed to fetch order book for ${symbol}`,
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Recent Trades List
	 */
	async getRecentTrades(symbol: string, limit: number = 500): Promise<AsterApiResponse> {
		try {
			this.logger.debug(`Fetching recent trades for ${symbol} with limit ${limit}`);
			return await this.asterApiService.getRecentTrades(symbol, limit);
		} catch (error) {
			this.logger.error(`Error fetching recent trades for ${symbol}:`, error);
			return {
				success: false,
				error: error.message || `Failed to fetch recent trades for ${symbol}`,
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * 24hr Ticker Price Change Statistics
	 */
	async get24hrTicker(symbol?: string): Promise<AsterApiResponse> {
		try {
			this.logger.debug(`Fetching 24hr ticker${symbol ? ` for ${symbol}` : ' for all symbols'}`);
			return await this.asterApiService.get24hrTicker(symbol);
		} catch (error) {
			this.logger.error(`Error fetching 24hr ticker${symbol ? ` for ${symbol}` : ''}:`, error);
			return {
				success: false,
				error: error.message || 'Failed to fetch 24hr ticker',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Symbol Price Ticker
	 */
	async getPriceTicker(symbol?: string): Promise<AsterApiResponse> {
		try {
			this.logger.debug(`Fetching price ticker${symbol ? ` for ${symbol}` : ' for all symbols'}`);
			return await this.asterApiService.getPriceTicker(symbol);
		} catch (error) {
			this.logger.error(`Error fetching price ticker${symbol ? ` for ${symbol}` : ''}:`, error);
			return {
				success: false,
				error: error.message || 'Failed to fetch price ticker',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Symbol Order Book Ticker (Best bid/ask)
	 */
	async getBookTicker(symbol?: string): Promise<AsterApiResponse> {
		try {
			this.logger.debug(`Fetching book ticker${symbol ? ` for ${symbol}` : ' for all symbols'}`);
			return await this.asterApiService.getBookTicker(symbol);
		} catch (error) {
			this.logger.error(`Error fetching book ticker${symbol ? ` for ${symbol}` : ''}:`, error);
			return {
				success: false,
				error: error.message || 'Failed to fetch book ticker',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Kline/Candlestick Data
	 */
	async getKlines(
		symbol: string,
		interval: string,
		startTime?: number,
		endTime?: number,
		limit: number = 500
	): Promise<AsterApiResponse> {
		try {
			this.logger.debug(`Fetching klines for ${symbol} with interval ${interval}`);
			return await this.asterApiService.getKlines(symbol, interval, startTime, endTime, limit);
		} catch (error) {
			this.logger.error(`Error fetching klines for ${symbol}:`, error);
			return {
				success: false,
				error: error.message || `Failed to fetch klines for ${symbol}`,
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Mark Price and Funding Rate
	 */
	async getMarkPrice(symbol?: string): Promise<AsterApiResponse> {
		try {
			this.logger.debug(`Fetching mark price${symbol ? ` for ${symbol}` : ' for all symbols'}`);
			return await this.asterApiService.getMarkPrice(symbol);
		} catch (error) {
			this.logger.error(`Error fetching mark price${symbol ? ` for ${symbol}` : ''}:`, error);
			return {
				success: false,
				error: error.message || 'Failed to fetch mark price',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Get Funding Rate History
	 */
	async getFundingRate(
		symbol?: string,
		startTime?: number,
		endTime?: number,
		limit: number = 100
	): Promise<AsterApiResponse> {
		try {
			this.logger.debug(`Fetching funding rate${symbol ? ` for ${symbol}` : ' for all symbols'}`);
			return await this.asterApiService.getFundingRate(symbol, startTime, endTime, limit);
		} catch (error) {
			this.logger.error(`Error fetching funding rate${symbol ? ` for ${symbol}` : ''}:`, error);
			return {
				success: false,
				error: error.message || 'Failed to fetch funding rate',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Get current price for a symbol
	 */
	async getCurrentPrice(symbol: string): Promise<AsterApiResponse<{ symbol: string; price: string; time: number }>> {
		try {
			this.logger.debug(`Fetching current price for ${symbol}`);
			const response = await this.asterApiService.getPriceTicker(symbol);

			if (response.success && response.data) {
				// Aster API returns either single object or array
				const priceData = Array.isArray(response.data) ? response.data[0] : response.data;

				return {
					success: true,
					data: {
						symbol: priceData.symbol,
						price: priceData.price,
						time: priceData.time || Date.now()
					},
					timestamp: Date.now(),
				};
			}

			return response;
		} catch (error) {
			this.logger.error(`Error fetching current price for ${symbol}:`, error);
			return {
				success: false,
				error: error.message || `Failed to fetch current price for ${symbol}`,
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Get market depth with formatted bid/ask
	 */
	async getMarketDepth(symbol: string, limit: number = 10): Promise<AsterApiResponse<{
		symbol: string;
		bids: Array<[string, string]>;
		asks: Array<[string, string]>;
		lastUpdateId: number;
	}>> {
		try {
			this.logger.debug(`Fetching market depth for ${symbol} with limit ${limit}`);
			const response = await this.asterApiService.getOrderBook(symbol, limit);

			if (response.success && response.data) {
				return {
					success: true,
					data: {
						symbol: symbol,
						bids: response.data.bids || [],
						asks: response.data.asks || [],
						lastUpdateId: response.data.lastUpdateId || 0
					},
					timestamp: Date.now(),
				};
			}

			return response;
		} catch (error) {
			this.logger.error(`Error fetching market depth for ${symbol}:`, error);
			return {
				success: false,
				error: error.message || `Failed to fetch market depth for ${symbol}`,
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Get list of all trading symbols
	 */
	async getSymbols(): Promise<AsterApiResponse<string[]>> {
		try {
			this.logger.debug('Fetching all trading symbols');
			const response = await this.asterApiService.getExchangeInfo();

			if (response.success && response.data && response.data.symbols) {
				const symbols = response.data.symbols.map((s: any) => s.symbol);

				return {
					success: true,
					data: symbols,
					timestamp: Date.now(),
				};
			}

			return {
				success: false,
				error: 'Failed to extract symbols from exchange info',
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
}