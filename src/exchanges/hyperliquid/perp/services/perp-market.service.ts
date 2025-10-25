import { Injectable, Logger } from '@nestjs/common';
import { IFuturesMarketService } from '../../../../common/interfaces';
import { ApiResponse } from '../../../../common/types/exchange.types';
import { HyperliquidApiService } from '../../shared/hyperliquid-api.service';

@Injectable()
export class HyperliquidPerpMarketService implements IFuturesMarketService {
	private readonly logger = new Logger(HyperliquidPerpMarketService.name);

	constructor(
		private readonly apiService: HyperliquidApiService,
	) { }

	/**
	 * Get current price for a symbol
	 */
	async getCurrentPrice(symbol: string): Promise<ApiResponse<string>> {
		try {
			const coin = this.formatSymbol(symbol);
			const result = await this.apiService.getAllMids();

			if (!result.success || !result.data) {
				return {
					success: false,
					error: 'Failed to get current price',
					timestamp: Date.now(),
					exchange: 'hyperliquid',
					tradingType: 'perpetual',
				};
			}

			const price = result.data[coin];

			if (!price) {
				return {
					success: false,
					error: `Price not found for ${symbol}`,
					timestamp: Date.now(),
					exchange: 'hyperliquid',
					tradingType: 'perpetual',
				};
			}

			return {
				success: true,
				data: price.toString(),
				timestamp: Date.now(),
				exchange: 'hyperliquid',
				tradingType: 'perpetual',
			};
		} catch (error: any) {
			this.logger.error(`Error getting current price: ${error.message}`);
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
	 * Get all prices
	 */
	async getAllPrices(): Promise<ApiResponse<Record<string, string>>> {
		try {
			const result = await this.apiService.getAllMids();

			if (!result.success || !result.data) {
				return {
					success: false,
					error: 'Failed to get all prices',
					timestamp: Date.now(),
					exchange: 'hyperliquid',
					tradingType: 'perpetual',
				};
			}

			// Convert to symbol format (BTC -> BTCUSDT)
			const prices: Record<string, string> = {};
			for (const [coin, price] of Object.entries(result.data)) {
				prices[this.formatSymbolResponse(coin)] = price.toString();
			}

			return {
				success: true,
				data: prices,
				timestamp: Date.now(),
				exchange: 'hyperliquid',
				tradingType: 'perpetual',
			};
		} catch (error: any) {
			this.logger.error(`Error getting all prices: ${error.message}`);
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
	 * Get 24hr ticker
	 */
	async getTicker(symbol?: string): Promise<ApiResponse<any>> {
		try {
			const allPrices = await this.getAllPrices();

			if (!allPrices.success) {
				return allPrices;
			}

			if (symbol) {
				const price = allPrices.data![symbol];

				if (!price) {
					return {
						success: false,
						error: `Ticker not found for ${symbol}`,
						timestamp: Date.now(),
						exchange: 'hyperliquid',
						tradingType: 'perpetual',
					};
				}

				return {
					success: true,
					data: {
						symbol,
						lastPrice: price,
						// Hyperliquid doesn't provide 24hr stats in getAllMids
					},
					timestamp: Date.now(),
					exchange: 'hyperliquid',
					tradingType: 'perpetual',
				};
			}

			const tickers = Object.entries(allPrices.data!).map(([sym, price]) => ({
				symbol: sym,
				lastPrice: price,
			}));

			return {
				success: true,
				data: tickers,
				timestamp: Date.now(),
				exchange: 'hyperliquid',
				tradingType: 'perpetual',
			};
		} catch (error: any) {
			this.logger.error(`Error getting ticker: ${error.message}`);
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
	 * Get order book
	 */
	async getOrderBook(symbol: string, limit: number = 500): Promise<ApiResponse<any>> {
		try {
			const coin = this.formatSymbol(symbol);
			const result = await this.apiService.getL2Book(coin);

			if (!result.success || !result.data) {
				return {
					success: false,
					error: 'Failed to get order book',
					timestamp: Date.now(),
					exchange: 'hyperliquid',
					tradingType: 'perpetual',
				};
			}

			return {
				success: true,
				data: {
					symbol,
					bids: result.data.levels[0].slice(0, limit),
					asks: result.data.levels[1].slice(0, limit),
					timestamp: result.data.time,
				},
				timestamp: Date.now(),
				exchange: 'hyperliquid',
				tradingType: 'perpetual',
			};
		} catch (error: any) {
			this.logger.error(`Error getting order book: ${error.message}`);
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
	 * Get recent trades
	 */
	async getRecentTrades(symbol: string, limit: number = 500): Promise<ApiResponse<any[]>> {
		try {
			const coin = this.formatSymbol(symbol);
			const result = await this.apiService.getRecentTrades(coin, limit);

			if (!result.success || !result.data) {
				return {
					success: false,
					error: 'Failed to get recent trades',
					timestamp: Date.now(),
					exchange: 'hyperliquid',
					tradingType: 'perpetual',
				};
			}

			const trades = result.data.map((trade: any) => ({
				id: trade.tid?.toString() || trade.hash,
				symbol,
				price: trade.px,
				quantity: trade.sz,
				side: trade.side === 'B' ? 'BUY' : 'SELL',
				timestamp: trade.time,
			}));

			return {
				success: true,
				data: trades,
				timestamp: Date.now(),
				exchange: 'hyperliquid',
				tradingType: 'perpetual',
			};
		} catch (error: any) {
			this.logger.error(`Error getting recent trades: ${error.message}`);
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
	 * Get candlestick data
	 */
	async getCandles(
		symbol: string,
		interval: string,
		startTime?: number,
		endTime?: number,
		limit?: number,
	): Promise<ApiResponse<any[]>> {
		try {
			const coin = this.formatSymbol(symbol);
			const result = await this.apiService.getCandles(coin, interval, startTime, endTime);

			if (!result.success || !result.data) {
				return {
					success: false,
					error: 'Failed to get candles',
					timestamp: Date.now(),
					exchange: 'hyperliquid',
					tradingType: 'perpetual',
				};
			}

			let candles = result.data;

			if (limit) {
				candles = candles.slice(-limit);
			}

			const formattedCandles = candles.map((candle: any) => ({
				openTime: candle.t,
				open: candle.o,
				high: candle.h,
				low: candle.l,
				close: candle.c,
				volume: candle.v,
				closeTime: candle.T,
				numberOfTrades: candle.n,
			}));

			return {
				success: true,
				data: formattedCandles,
				timestamp: Date.now(),
				exchange: 'hyperliquid',
				tradingType: 'perpetual',
			};
		} catch (error: any) {
			this.logger.error(`Error getting candles: ${error.message}`);
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
	 * Get list of all symbols
	 */
	async getSymbols(): Promise<ApiResponse<string[]>> {
		try {
			const result = await this.apiService.getMeta();

			if (!result.success || !result.data?.universe) {
				return {
					success: false,
					error: 'Failed to get symbols',
					timestamp: Date.now(),
					exchange: 'hyperliquid',
					tradingType: 'perpetual',
				};
			}

			const symbols = result.data.universe.map((asset: any) =>
				this.formatSymbolResponse(asset.name)
			);

			return {
				success: true,
				data: symbols,
				timestamp: Date.now(),
				exchange: 'hyperliquid',
				tradingType: 'perpetual',
			};
		} catch (error: any) {
			this.logger.error(`Error getting symbols: ${error.message}`);
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
	 * Get exchange information
	 */
	async getExchangeInfo(): Promise<ApiResponse<any>> {
		try {
			const result = await this.apiService.getMeta();

			if (!result.success) {
				return {
					success: false,
					error: 'Failed to get exchange info',
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
			this.logger.error(`Error getting exchange info: ${error.message}`);
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
	 * Format price according to symbol precision
	 */
	async formatPrice(symbol: string, price: number | string): Promise<string> {
		return parseFloat(price.toString()).toFixed(2);
	}

	/**
	 * Format quantity according to symbol precision
	 */
	async formatQuantity(symbol: string, quantity: number | string): Promise<string> {
		return parseFloat(quantity.toString()).toString();
	}

	/**
	 * Get funding rate
	 */
	async getFundingRate(symbol?: string): Promise<ApiResponse<any>> {
		try {
			if (!symbol) {
				return {
					success: false,
					error: 'Symbol is required for funding rate',
					timestamp: Date.now(),
					exchange: 'hyperliquid',
					tradingType: 'perpetual',
				};
			}

			const coin = this.formatSymbol(symbol);
			const result = await this.apiService.getFundingHistory(coin);

			if (!result.success || !result.data || result.data.length === 0) {
				return {
					success: false,
					error: 'Failed to get funding rate',
					timestamp: Date.now(),
					exchange: 'hyperliquid',
					tradingType: 'perpetual',
				};
			}

			const latest = result.data[result.data.length - 1];

			return {
				success: true,
				data: {
					symbol,
					fundingRate: latest.fundingRate,
					fundingTime: latest.time,
				},
				timestamp: Date.now(),
				exchange: 'hyperliquid',
				tradingType: 'perpetual',
			};
		} catch (error: any) {
			this.logger.error(`Error getting funding rate: ${error.message}`);
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
	 * Get funding rate history
	 */
	async getFundingRateHistory(
		symbol: string,
		startTime?: number,
		endTime?: number,
		limit?: number,
	): Promise<ApiResponse<any[]>> {
		try {
			const coin = this.formatSymbol(symbol);
			const result = await this.apiService.getFundingHistory(coin, startTime, endTime);

			if (!result.success || !result.data) {
				return {
					success: false,
					error: 'Failed to get funding rate history',
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
				})),
				timestamp: Date.now(),
				exchange: 'hyperliquid',
				tradingType: 'perpetual',
			};
		} catch (error: any) {
			this.logger.error(`Error getting funding rate history: ${error.message}`);
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
	 * Get mark price
	 */
	async getMarkPrice(symbol?: string): Promise<ApiResponse<any>> {
		// Hyperliquid uses mid price as mark price
		if (symbol) {
			return this.getCurrentPrice(symbol);
		}

		return this.getAllPrices();
	}

	/**
	 * Get index price
	 */
	async getIndexPrice(symbol: string): Promise<ApiResponse<string>> {
		// Hyperliquid uses mid price as index price
		return this.getCurrentPrice(symbol);
	}

	/**
	 * Get open interest
	 */
	async getOpenInterest(symbol: string): Promise<ApiResponse<any>> {
		return {
			success: false,
			error: 'Open interest not available in Hyperliquid API',
			timestamp: Date.now(),
			exchange: 'hyperliquid',
			tradingType: 'perpetual',
		};
	}

	/**
	 * Get open interest history
	 */
	async getOpenInterestHistory(
		symbol: string,
		interval: string,
		startTime?: number,
		endTime?: number,
		limit?: number,
	): Promise<ApiResponse<any[]>> {
		return {
			success: false,
			error: 'Open interest history not available in Hyperliquid API',
			timestamp: Date.now(),
			exchange: 'hyperliquid',
			tradingType: 'perpetual',
		};
	}

	/**
	 * Get long/short ratio
	 */
	async getLongShortRatio(
		symbol: string,
		interval: string,
		startTime?: number,
		endTime?: number,
		limit?: number,
	): Promise<ApiResponse<any[]>> {
		return {
			success: false,
			error: 'Long/short ratio not available in Hyperliquid API',
			timestamp: Date.now(),
			exchange: 'hyperliquid',
			tradingType: 'perpetual',
		};
	}

	/**
	 * Get premium index
	 */
	async getPremiumIndex(symbol?: string): Promise<ApiResponse<any>> {
		return {
			success: false,
			error: 'Premium index not available in Hyperliquid API',
			timestamp: Date.now(),
			exchange: 'hyperliquid',
			tradingType: 'perpetual',
		};
	}

	/**
	 * Get liquidation orders
	 */
	async getLiquidationOrders(
		symbol?: string,
		startTime?: number,
		endTime?: number,
		limit?: number,
	): Promise<ApiResponse<any[]>> {
		return {
			success: false,
			error: 'Liquidation orders not available in Hyperliquid API',
			timestamp: Date.now(),
			exchange: 'hyperliquid',
			tradingType: 'perpetual',
		};
	}

	/**
	 * Get contract information
	 */
	async getContractInfo(symbol?: string): Promise<ApiResponse<any>> {
		try {
			const meta = await this.apiService.getMeta();

			if (!meta.success || !meta.data?.universe) {
				return {
					success: false,
					error: 'Failed to get contract info',
					timestamp: Date.now(),
					exchange: 'hyperliquid',
					tradingType: 'perpetual',
				};
			}

			if (symbol) {
				const coin = this.formatSymbol(symbol);
				const asset = meta.data.universe.find((a: any) => a.name === coin);

				if (!asset) {
					return {
						success: false,
						error: `Contract not found for ${symbol}`,
						timestamp: Date.now(),
						exchange: 'hyperliquid',
						tradingType: 'perpetual',
					};
				}

				return {
					success: true,
					data: {
						symbol,
						...asset,
					},
					timestamp: Date.now(),
					exchange: 'hyperliquid',
					tradingType: 'perpetual',
				};
			}

			return {
				success: true,
				data: meta.data.universe,
				timestamp: Date.now(),
				exchange: 'hyperliquid',
				tradingType: 'perpetual',
			};
		} catch (error: any) {
			this.logger.error(`Error getting contract info: ${error.message}`);
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
	 * Get futures symbols
	 */
	async getFuturesSymbols(): Promise<ApiResponse<string[]>> {
		return this.getSymbols();
	}

	/**
	 * Get quantity limits for a symbol
	 */
	async getQuantityLimits(symbol: string): Promise<ApiResponse<{ min: string; max: string }>> {
		return {
			success: false,
			error: 'Quantity limits not directly available in Hyperliquid API',
			timestamp: Date.now(),
			exchange: 'hyperliquid',
			tradingType: 'perpetual',
		};
	}

	/**
	 * Get notional value limits for a symbol
	 */
	async getNotionalLimits(symbol: string): Promise<ApiResponse<{ min: string; max: string }>> {
		return {
			success: false,
			error: 'Notional limits not directly available in Hyperliquid API',
			timestamp: Date.now(),
			exchange: 'hyperliquid',
			tradingType: 'perpetual',
		};
	}

	/**
	 * Format symbol from BTCUSDT to BTC
	 */
	private formatSymbol(symbol: string): string {
		return symbol.replace(/USDT|USDC|-PERP/gi, '');
	}

	/**
	 * Format symbol response from BTC to BTCUSDT
	 */
	private formatSymbolResponse(coin: string): string {
		return `${coin}USDT`;
	}
}
