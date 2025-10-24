import { Injectable, Logger } from '@nestjs/common';
import { HyperliquidApiService } from './hyperliquid-api.service';
import { BalanceService } from './balance.service';
import { MarketDataService } from './market-data.service';
import {
	HyperliquidApiResponse,
	HyperliquidOrderRequest,
	ClosePositionRequest,
	CloseAllPositionRequest,
} from '../types';

@Injectable()
export class TradingService {
	private readonly logger = new Logger(TradingService.name);

	constructor(
		private readonly hyperliquidApiService: HyperliquidApiService,
		private readonly balanceService: BalanceService,
		private readonly marketDataService: MarketDataService,
	) { }

	/**
	 * Place a market order
	 */
	async placeMarketOrder(
		coin: string,
		isBuy: boolean,
		size: number,
		reduceOnly: boolean = false,
	): Promise<HyperliquidApiResponse> {
		try {
			this.logger.debug(`Placing market ${isBuy ? 'BUY' : 'SELL'} order for ${coin}, size: ${size}`);

			// Get asset info for szDecimals
			const assetInfo = await this.hyperliquidApiService.getAssetInfo(coin);
			const szDecimals = assetInfo.szDecimals;

			// Get current market price
			const priceResponse = await this.marketDataService.getCurrentPrice(coin);
			if (!priceResponse.success || !priceResponse.data) {
				return {
					success: false,
					error: 'Failed to get current price',
					timestamp: Date.now(),
				};
			}

			const currentPrice = parseFloat(priceResponse.data);
			// Add slippage for market order (1% for buy, -1% for sell)
			const slippage = 0.01;
			const limitPrice = isBuy ? currentPrice * (1 + slippage) : currentPrice * (1 - slippage);

			// Format to wire format with proper szDecimals
			const formattedSize = this.floatToWire(size, szDecimals);
			// Price should be rounded to 1 decimal (tick size = 0.1 for most assets)
			const formattedPrice = this.floatToWire(Math.round(limitPrice * 10) / 10, 1);

			const orderRequest: any = {
				coin,
				is_buy: isBuy,
				sz: formattedSize,
				limit_px: formattedPrice,
				order_type: { limit: { tif: 'Ioc' } }, // Immediate or Cancel for market-like behavior
				reduce_only: reduceOnly,
			};

			const response = await this.hyperliquidApiService.placeOrder(orderRequest);

			if (response.success) {
				this.logger.log(`Market order placed successfully for ${coin}`);
			}

			return response;
		} catch (error) {
			this.logger.error('Error placing market order:', error);
			return {
				success: false,
				error: error.message || 'Failed to place market order',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Place a limit order
	 */
	async placeLimitOrder(
		coin: string,
		isBuy: boolean,
		size: number,
		limitPrice: number,
		timeInForce: 'Gtc' | 'Ioc' | 'Alo' = 'Gtc',
		reduceOnly: boolean = false,
	): Promise<HyperliquidApiResponse> {
		try {
			this.logger.debug(
				`Placing limit ${isBuy ? 'BUY' : 'SELL'} order for ${coin}, size: ${size}, price: ${limitPrice}`,
			);

			const formattedSize = this.floatToWire(size);
			const formattedPrice = this.floatToWire(limitPrice);

			const orderRequest: any = {
				coin,
				is_buy: isBuy,
				sz: formattedSize,
				limit_px: formattedPrice,
				order_type: { limit: { tif: timeInForce } },
				reduce_only: reduceOnly,
			};

			const response = await this.hyperliquidApiService.placeOrder(orderRequest);

			if (response.success) {
				this.logger.log(`Limit order placed successfully for ${coin}`);
			}

			return response;
		} catch (error) {
			this.logger.error('Error placing limit order:', error);
			return {
				success: false,
				error: error.message || 'Failed to place limit order',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Place a stop loss order
	 */
	async placeStopLoss(
		coin: string,
		size: number,
		triggerPrice: number,
		isBuy: boolean = false,
	): Promise<HyperliquidApiResponse> {
		try {
			this.logger.debug(`Placing stop loss for ${coin}, trigger: ${triggerPrice}`);

			// Get asset info for szDecimals
			const assetInfo = await this.hyperliquidApiService.getAssetInfo(coin);
			const szDecimals = assetInfo.szDecimals;

			const formattedSize = this.floatToWire(size, szDecimals);
			const formattedPrice = this.floatToWire(Math.round(triggerPrice * 10) / 10, 1);

			const orderRequest: any = {
				coin,
				is_buy: isBuy,
				sz: formattedSize,
				limit_px: formattedPrice,
				order_type: {
					trigger: {
						isMarket: true,
						triggerPx: formattedPrice,
						tpsl: 'sl',
					},
				},
				reduce_only: true,
			};

			const response = await this.hyperliquidApiService.placeOrder(orderRequest);

			if (response.success) {
				this.logger.log(`Stop loss placed successfully for ${coin}`);
			} else {
				this.logger.warn(`Stop loss failed for ${coin}: ${response.error}`);
			}

			return response;
		} catch (error) {
			this.logger.error('Error placing stop loss:', error);
			return {
				success: false,
				error: error.message || 'Failed to place stop loss',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Place a take profit order
	 */
	async placeTakeProfit(
		coin: string,
		size: number,
		triggerPrice: number,
		isBuy: boolean = false,
	): Promise<HyperliquidApiResponse> {
		try {
			this.logger.debug(`Placing take profit for ${coin}, trigger: ${triggerPrice}`);

			// Get asset info for szDecimals
			const assetInfo = await this.hyperliquidApiService.getAssetInfo(coin);
			const szDecimals = assetInfo.szDecimals;

			const formattedSize = this.floatToWire(size, szDecimals);
			const formattedPrice = this.floatToWire(Math.round(triggerPrice * 10) / 10, 1);

			const orderRequest: any = {
				coin,
				is_buy: isBuy,
				sz: formattedSize,
				limit_px: formattedPrice,
				order_type: {
					trigger: {
						isMarket: true,
						triggerPx: formattedPrice,
						tpsl: 'tp',
					},
				},
				reduce_only: true,
			};

			const response = await this.hyperliquidApiService.placeOrder(orderRequest);

			if (response.success) {
				this.logger.log(`Take profit placed successfully for ${coin}`);
			} else {
				this.logger.warn(`Take profit failed for ${coin}: ${response.error}`);
			}

			return response;
		} catch (error) {
			this.logger.error('Error placing take profit:', error);
			return {
				success: false,
				error: error.message || 'Failed to place take profit',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Cancel order by order ID
	 */
	async cancelOrder(coin: string, orderId: number): Promise<HyperliquidApiResponse> {
		try {
			this.logger.debug(`Cancelling order ${orderId} for ${coin}`);
			return await this.hyperliquidApiService.cancelOrder(coin, orderId);
		} catch (error) {
			this.logger.error('Error cancelling order:', error);
			return {
				success: false,
				error: error.message || 'Failed to cancel order',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Cancel all orders for a coin
	 */
	async cancelAllOrders(coin?: string): Promise<HyperliquidApiResponse> {
		try {
			this.logger.debug(`Cancelling all orders${coin ? ` for ${coin}` : ''}`);
			return await this.hyperliquidApiService.cancelAllOrders(coin);
		} catch (error) {
			this.logger.error('Error cancelling all orders:', error);
			return {
				success: false,
				error: error.message || 'Failed to cancel all orders',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Get open orders
	 */
	async getOpenOrders(user?: string): Promise<HyperliquidApiResponse> {
		try {
			this.logger.debug('Fetching open orders');
			return await this.hyperliquidApiService.getOpenOrders(user);
		} catch (error) {
			this.logger.error('Error fetching open orders:', error);
			return {
				success: false,
				error: error.message || 'Failed to fetch open orders',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Set leverage for a coin
	 */
	async setLeverage(coin: string, leverage: number, isCross: boolean = true): Promise<HyperliquidApiResponse> {
		try {
			this.logger.debug(`Setting leverage for ${coin} to ${leverage}x (${isCross ? 'cross' : 'isolated'})`);

			// Validate leverage
			if (leverage < 1 || leverage > 50) {
				return {
					success: false,
					error: 'Leverage must be between 1 and 50',
					timestamp: Date.now(),
				};
			}

			return await this.hyperliquidApiService.updateLeverage(coin, isCross, leverage);
		} catch (error) {
			this.logger.error('Error setting leverage:', error);
			return {
				success: false,
				error: error.message || 'Failed to set leverage',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Quick Long position
	 */
	async quickLong(
		coin: string,
		usdValue: number,
		stopLossPercent: number = 5,
		takeProfitPercent: number = 10,
		leverage: number = 5,
	): Promise<HyperliquidApiResponse> {
		try {
			this.logger.log(
				`Quick LONG: ${coin} with $${usdValue}, Leverage: ${leverage}x, SL: ${stopLossPercent}%, TP: ${takeProfitPercent}%`,
			);

			// Set leverage first
			const leverageResponse = await this.setLeverage(coin, leverage, true);
			if (!leverageResponse.success) {
				this.logger.warn(`Warning: Failed to set leverage - ${leverageResponse.error}`);
			}

			// Get current price
			const priceResponse = await this.marketDataService.getCurrentPrice(coin);
			if (!priceResponse.success || !priceResponse.data) {
				return {
					success: false,
					error: 'Failed to get current price',
					timestamp: Date.now(),
				};
			}

			const currentPrice = parseFloat(priceResponse.data);
			const size = (usdValue * leverage) / currentPrice;

			// Calculate SL and TP prices
			const stopLossPrice = currentPrice * (1 - stopLossPercent / 100 / leverage);
			const takeProfitPrice = currentPrice * (1 + takeProfitPercent / 100 / leverage);

			// Place market buy order
			const buyResponse = await this.placeMarketOrder(coin, true, size, false);
			if (!buyResponse.success) {
				return buyResponse;
			}

			// Place stop loss
			const stopLossResponse = await this.placeStopLoss(coin, size, stopLossPrice, false);
			if (!stopLossResponse.success) {
				this.logger.warn(`Stop loss placement failed: ${stopLossResponse.error}`);
			}

			// Place take profit
			const takeProfitResponse = await this.placeTakeProfit(coin, size, takeProfitPrice, false);
			if (!takeProfitResponse.success) {
				this.logger.warn(`Take profit placement failed: ${takeProfitResponse.error}`);
			}

			this.logger.log(`Quick LONG completed for ${coin}`);

			return {
				success: true,
				data: {
					entryOrder: buyResponse.data,
					stopLossOrder: stopLossResponse.data,
					takeProfitOrder: takeProfitResponse.data,
					currentPrice,
					size,
					stopLossPrice,
					takeProfitPrice,
				},
				timestamp: Date.now(),
			};
		} catch (error) {
			this.logger.error('Error in quick long:', error);
			return {
				success: false,
				error: error.message || 'Failed to execute quick long',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Quick Short position
	 */
	async quickShort(
		coin: string,
		usdValue: number,
		stopLossPercent: number = 5,
		takeProfitPercent: number = 10,
		leverage: number = 5,
	): Promise<HyperliquidApiResponse> {
		try {
			this.logger.log(
				`Quick SHORT: ${coin} with $${usdValue}, Leverage: ${leverage}x, SL: ${stopLossPercent}%, TP: ${takeProfitPercent}%`,
			);

			// Set leverage first
			const leverageResponse = await this.setLeverage(coin, leverage, true);
			if (!leverageResponse.success) {
				this.logger.warn(`Warning: Failed to set leverage - ${leverageResponse.error}`);
			}

			// Get current price
			const priceResponse = await this.marketDataService.getCurrentPrice(coin);
			if (!priceResponse.success || !priceResponse.data) {
				return {
					success: false,
					error: 'Failed to get current price',
					timestamp: Date.now(),
				};
			}

			const currentPrice = parseFloat(priceResponse.data);
			const size = (usdValue * leverage) / currentPrice;

			// Calculate SL and TP prices
			const stopLossPrice = currentPrice * (1 + stopLossPercent / 100 / leverage);
			const takeProfitPrice = currentPrice * (1 - takeProfitPercent / 100 / leverage);

			// Place market sell order
			const sellResponse = await this.placeMarketOrder(coin, false, size, false);
			if (!sellResponse.success) {
				return sellResponse;
			}

			// Place stop loss
			const stopLossResponse = await this.placeStopLoss(coin, size, stopLossPrice, true);
			if (!stopLossResponse.success) {
				this.logger.warn(`Stop loss placement failed: ${stopLossResponse.error}`);
			}

			// Place take profit
			const takeProfitResponse = await this.placeTakeProfit(coin, size, takeProfitPrice, true);
			if (!takeProfitResponse.success) {
				this.logger.warn(`Take profit placement failed: ${takeProfitResponse.error}`);
			}

			this.logger.log(`Quick SHORT completed for ${coin}`);

			return {
				success: true,
				data: {
					entryOrder: sellResponse.data,
					stopLossOrder: stopLossResponse.data,
					takeProfitOrder: takeProfitResponse.data,
					currentPrice,
					size,
					stopLossPrice,
					takeProfitPrice,
				},
				timestamp: Date.now(),
			};
		} catch (error) {
			this.logger.error('Error in quick short:', error);
			return {
				success: false,
				error: error.message || 'Failed to execute quick short',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Close position
	 */
	async closePosition(closeRequest: ClosePositionRequest): Promise<HyperliquidApiResponse> {
		try {
			const { coin, size, slippage = 1 } = closeRequest;

			this.logger.debug(`Closing position for ${coin}${size ? `, size: ${size}` : ' (full)'}`);

			// Get current position
			const positionResponse = await this.balanceService.getPosition(coin);
			if (!positionResponse.success || !positionResponse.data) {
				return {
					success: false,
					error: `No position found for ${coin}`,
					timestamp: Date.now(),
				};
			}

			const position = positionResponse.data;
			const positionSize = Math.abs(parseFloat(position.szi));
			const isLong = parseFloat(position.szi) > 0;
			const closeSize = size || positionSize;

			if (closeSize > positionSize) {
				return {
					success: false,
					error: `Close size ${closeSize} exceeds position size ${positionSize}`,
					timestamp: Date.now(),
				};
			}

			// Close position with market order (opposite direction)
			return await this.placeMarketOrder(coin, !isLong, closeSize, true);
		} catch (error) {
			this.logger.error('Error closing position:', error);
			return {
				success: false,
				error: error.message || 'Failed to close position',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Close all positions
	 */
	async closeAllPositions(closeRequest: CloseAllPositionRequest = {}): Promise<HyperliquidApiResponse> {
		try {
			this.logger.debug('Closing all positions');

			const positionsResponse = await this.balanceService.getPositions();
			if (!positionsResponse.success || !positionsResponse.data) {
				return {
					success: false,
					error: 'Failed to fetch positions',
					timestamp: Date.now(),
				};
			}

			const positions = positionsResponse.data as any[];
			const openPositions = positions.filter((p) => parseFloat(p.szi) !== 0);

			if (openPositions.length === 0) {
				return {
					success: true,
					data: { message: 'No open positions to close' },
					timestamp: Date.now(),
				};
			}

			const results = [];
			for (const position of openPositions) {
				const result = await this.closePosition({
					coin: position.coin,
					slippage: closeRequest.slippage,
				});
				results.push({ coin: position.coin, result });
			}

			this.logger.log(`Closed ${results.length} positions`);

			return {
				success: true,
				data: results,
				timestamp: Date.now(),
			};
		} catch (error) {
			this.logger.error('Error closing all positions:', error);
			return {
				success: false,
				error: error.message || 'Failed to close all positions',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Update leverage for a coin
	 */
	async updateLeverage(coin: string, isCross: boolean, leverage: number): Promise<HyperliquidApiResponse> {
		try {
			this.logger.debug(`Updating leverage for ${coin} to ${leverage}x (${isCross ? 'cross' : 'isolated'})`);
			return await this.hyperliquidApiService.updateLeverage(coin, isCross, leverage);
		} catch (error) {
			this.logger.error('Error updating leverage:', error);
			return {
				success: false,
				error: error.message || 'Failed to update leverage',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Format float to wire format - matches Hyperliquid Python SDK float_to_wire()
	 * Rounds to 8 decimals and normalizes (removes trailing zeros)
	 * Used for both sz (size) and limit_px (price) parameters
	/**
	 * Format float to wire format with proper decimal precision
	 * @param x - The number to format
	 * @param szDecimals - Number of decimal places for size (from asset info)
	 */
	private floatToWire(x: number, szDecimals: number = 8): string {
		// Round to the specified decimal places
		const rounded = x.toFixed(szDecimals);

		// Handle -0 case
		if (rounded === '-0' || rounded.startsWith('-0.00000')) {
			return '0';
		}

		// Parse as number and convert back to string to normalize (remove trailing zeros)
		const normalized = parseFloat(rounded);

		// Convert to string without scientific notation
		// This automatically removes trailing zeros like Python's Decimal.normalize()
		return normalized.toString();
	}
}
