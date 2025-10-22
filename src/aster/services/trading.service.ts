import { Injectable, Logger } from '@nestjs/common';
import { AsterApiService } from './aster-api.service';
import { BalanceService } from './balance.service';
import { MarketDataService } from './market-data.service';
import { OrderRequest, Order, AsterApiResponse, ClosePositionRequest, CloseAllPositionRequest } from '../types';

@Injectable()
export class TradingService {
	private readonly logger = new Logger(TradingService.name);

	constructor(
		private readonly asterApiService: AsterApiService,
		private readonly balanceService: BalanceService,
		private readonly marketDataService: MarketDataService,
	) { }

	/**
	 * Place a new order (New Order TRADE endpoint)
	 */
	async placeOrder(orderRequest: OrderRequest): Promise<AsterApiResponse<Order>> {
		try {
			this.logger.debug(`Placing ${orderRequest.side} order for ${orderRequest.symbol}`);

			// Validate order before placing
			const validation = await this.validateOrder(orderRequest);
			if (!validation.isValid) {
				return {
					success: false,
					error: validation.error,
					timestamp: Date.now(),
				};
			}

			// Prepare Aster order request with required fields
			const asterOrderRequest: any = {
				symbol: orderRequest.symbol,
				side: orderRequest.side,
				type: orderRequest.type,
				timestamp: Date.now(),
				recvWindow: orderRequest.recvWindow || 50000,
			};

			// Add optional fields only if provided
			if (orderRequest.quantity) asterOrderRequest.quantity = orderRequest.quantity;
			if (orderRequest.price) asterOrderRequest.price = orderRequest.price;
			if (orderRequest.newClientOrderId) asterOrderRequest.newClientOrderId = orderRequest.newClientOrderId;
			if (orderRequest.stopPrice) asterOrderRequest.stopPrice = orderRequest.stopPrice;
			if (orderRequest.closePosition) asterOrderRequest.closePosition = orderRequest.closePosition;
			if (orderRequest.activationPrice) asterOrderRequest.activationPrice = orderRequest.activationPrice;
			if (orderRequest.callbackRate) asterOrderRequest.callbackRate = orderRequest.callbackRate;
			if (orderRequest.positionSide) asterOrderRequest.positionSide = orderRequest.positionSide;

			// Add timeInForce only for LIMIT orders
			if (orderRequest.type === 'LIMIT') {
				asterOrderRequest.timeInForce = orderRequest.timeInForce || 'GTC';
			}

			// Add workingType for STOP orders
			if (orderRequest.type.includes('STOP') || orderRequest.type.includes('TAKE_PROFIT')) {
				asterOrderRequest.workingType = orderRequest.workingType || 'CONTRACT_PRICE';
			}

			// Add reduceOnly only if explicitly set to true
			if (orderRequest.reduceOnly === 'true') {
				asterOrderRequest.reduceOnly = 'true';
			}

			// Add priceProtect and newOrderRespType if provided
			if (orderRequest.priceProtect) asterOrderRequest.priceProtect = orderRequest.priceProtect;
			if (orderRequest.newOrderRespType) asterOrderRequest.newOrderRespType = orderRequest.newOrderRespType;

			const response = await this.asterApiService.post<Order>('/fapi/v3/order', asterOrderRequest);

			if (response.success) {
				this.logger.log(`Order placed successfully: ${response.data?.orderId}`);
			}

			return response;
		} catch (error) {
			this.logger.error('Error placing order:', error);
			return {
				success: false,
				error: error.message || 'Failed to place order',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Place multiple orders in one request (Batch Orders endpoint)
	 * Maximum 5 orders per batch
	 */
	async batchOrders(orders: OrderRequest[]): Promise<AsterApiResponse<Order[]>> {
		try {
			if (orders.length === 0) {
				return { success: false, error: 'No orders provided', timestamp: Date.now() };
			}
			if (orders.length > 5) {
				return { success: false, error: 'Maximum 5 orders allowed per batch', timestamp: Date.now() };
			}
			this.logger.debug(`Placing batch of ${orders.length} orders`);
			const batchList = orders.map(order => {
				const orderParams: any = { symbol: order.symbol, side: order.side, type: order.type };
				if (order.quantity) orderParams.quantity = order.quantity;
				if (order.price) orderParams.price = order.price;
				if (order.newClientOrderId) orderParams.newClientOrderId = order.newClientOrderId;
				if (order.stopPrice) orderParams.stopPrice = order.stopPrice;
				if (order.closePosition) orderParams.closePosition = order.closePosition;
				if (order.timeInForce) orderParams.timeInForce = order.timeInForce;
				if (order.workingType) orderParams.workingType = order.workingType;
				if (order.priceProtect) orderParams.priceProtect = order.priceProtect;
				if (order.reduceOnly) orderParams.reduceOnly = order.reduceOnly;
				if (order.positionSide) orderParams.positionSide = order.positionSide;
				return orderParams;
			});
			const params = { batchOrders: JSON.stringify(batchList), timestamp: Date.now(), recvWindow: 50000 };
			const response = await this.asterApiService.hmacPost<Order[]>('/fapi/v1/batchOrders', params);
			if (response.success) { this.logger.log(`Batch orders placed: ${orders.length}`); }
			return response;
		} catch (error) {
			this.logger.error('Error placing batch orders:', error);
			return { success: false, error: error.message || 'Failed to place batch orders', timestamp: Date.now() };
		}
	}

	/**
	 * Cancel an existing order (Cancel Order TRADE endpoint)
	 * Uses /fapi/v1/order with HMAC SHA256
	 */
	async cancelOrder(orderId: string, symbol: string, origClientOrderId?: string): Promise<AsterApiResponse<Order>> {
		try {
			this.logger.debug(`Cancelling order: ${orderId} for symbol: ${symbol}`);

			const params: any = {
				symbol,
				timestamp: Date.now(),
				recvWindow: 50000,
			};

			if (orderId) {
				params.orderId = orderId;
			}

			if (origClientOrderId) {
				params.origClientOrderId = origClientOrderId;
			}

			// Use HMAC DELETE for v1 endpoint
			const response = await this.asterApiService.hmacDelete<Order>('/fapi/v1/order', params);

			if (response.success) {
				this.logger.log(`Order cancelled successfully: ${orderId}`);
			}

			return response;
		} catch (error) {
			this.logger.error(`Error cancelling order ${orderId}:`, error);
			return {
				success: false,
				error: error.message || 'Failed to cancel order',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Get order status (Query Order USER_DATA endpoint)
	 * Uses /fapi/v1/order with HMAC SHA256
	 */
	async getOrder(symbol: string, orderId?: string, origClientOrderId?: string): Promise<AsterApiResponse<Order>> {
		try {
			// Either orderId or origClientOrderId must be provided
			if (!orderId && !origClientOrderId) {
				throw new Error('Either orderId or origClientOrderId must be provided');
			}

			const params: any = {
				symbol,
				timestamp: Date.now(),
				recvWindow: 50000,
			};

			if (orderId) {
				params.orderId = orderId;
			}

			if (origClientOrderId) {
				params.origClientOrderId = origClientOrderId;
			}

			// Use HMAC GET for v1 endpoint
			const response = await this.asterApiService.hmacGet<Order>('/fapi/v1/order', params);

			return response;
		} catch (error) {
			this.logger.error(`Error fetching order:`, error);
			return {
				success: false,
				error: error.message || 'Failed to fetch order',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Get all open orders (Current All Open Orders USER_DATA endpoint)
	 * Uses /fapi/v1/openOrders with HMAC SHA256
	 */
	async getOpenOrders(symbol?: string): Promise<AsterApiResponse<Order[]>> {
		try {
			const params: any = {
				timestamp: Date.now(),
				recvWindow: 50000,
			};

			if (symbol) {
				params.symbol = symbol;
			}

			// Use HMAC GET for v1 endpoint
			const response = await this.asterApiService.hmacGet<Order[]>('/fapi/v1/openOrders', params);

			return response;
		} catch (error) {
			this.logger.error('Error fetching open orders:', error);
			return {
				success: false,
				error: error.data || error.message || 'Failed to fetch open orders',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Cancel all open orders (Cancel All Open Orders TRADE endpoint)
	 * Uses /fapi/v1/allOpenOrders with HMAC SHA256
	 */
	async cancelAllOrders(symbol: string): Promise<AsterApiResponse<any>> {
		try {
			this.logger.debug(`Cancelling all orders for ${symbol}`);

			const params = {
				symbol,
				timestamp: Date.now(),
				recvWindow: 50000,
			};

			// Use HMAC DELETE for v1 endpoint
			const response = await this.asterApiService.hmacDelete<any>('/fapi/v1/allOpenOrders', params);

			if (response.success) {
				this.logger.log(`All orders cancelled successfully for ${symbol}`);
			}

			return response;
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
	 * Place a market buy order
	 */
	async marketBuy(symbol: string, quantity: string, clientOrderId?: string): Promise<AsterApiResponse<Order>> {
		const orderRequest: OrderRequest = {
			symbol,
			side: 'BUY',
			type: 'MARKET',
			quantity,
			newClientOrderId: clientOrderId,
		};

		return this.placeOrder(orderRequest);
	}

	/**
	 * Place a market sell order
	 */
	async marketSell(symbol: string, quantity: string, clientOrderId?: string): Promise<AsterApiResponse<Order>> {
		const orderRequest: OrderRequest = {
			symbol,
			side: 'SELL',
			type: 'MARKET',
			quantity,
			newClientOrderId: clientOrderId,
		};

		return this.placeOrder(orderRequest);
	}

	/**
	 * Place a limit buy order
	 */
	async limitBuy(symbol: string, quantity: string, price: string, clientOrderId?: string): Promise<AsterApiResponse<Order>> {
		const orderRequest: OrderRequest = {
			symbol,
			side: 'BUY',
			type: 'LIMIT',
			quantity,
			price,
			timeInForce: 'GTC',
			newClientOrderId: clientOrderId,
		};

		return this.placeOrder(orderRequest);
	}

	/**
	 * Place a limit sell order
	 */
	async limitSell(symbol: string, quantity: string, price: string, clientOrderId?: string): Promise<AsterApiResponse<Order>> {
		const orderRequest: OrderRequest = {
			symbol,
			side: 'SELL',
			type: 'LIMIT',
			quantity,
			price,
			timeInForce: 'GTC',
			newClientOrderId: clientOrderId,
		};

		return this.placeOrder(orderRequest);
	}

	/**
	 * Validate order before placing
	 */
	private async validateOrder(orderRequest: OrderRequest): Promise<{ isValid: boolean; error?: string }> {
		try {
			// Check quantity
			const quantity = parseFloat(orderRequest.quantity);
			if (quantity <= 0) {
				return { isValid: false, error: 'Quantity must be greater than 0' };
			}

			// Check price for limit orders
			if (orderRequest.type === 'LIMIT' && orderRequest.price) {
				const price = parseFloat(orderRequest.price);
				if (price <= 0) {
					return { isValid: false, error: 'Price must be greater than 0' };
				}
			}

			// Note: Balance check removed as it's not reliable for futures trading
			// Futures trading uses margin and leverage, so simple balance check doesn't apply

			return { isValid: true };
		} catch (error) {
			return { isValid: false, error: 'Validation error: ' + error.message };
		}
	}

	/**
	 * Calculate order value
	 */
	calculateOrderValue(quantity: string, price: string): number {
		return parseFloat(quantity) * parseFloat(price);
	}

	/**
	 * Generate client order ID
	 */
	generateClientOrderId(): string {
		return `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Set leverage for a specific symbol
	 * @param symbol Trading pair symbol (e.g., BTCUSDT)
	 * @param leverage Leverage value (1-125)
	 */
	async setLeverage(symbol: string, leverage: number): Promise<AsterApiResponse<any>> {
		try {
			this.logger.debug(`⚙️ Setting leverage for ${symbol} to ${leverage}x`);

			// Validate leverage range
			if (leverage < 1 || leverage > 125) {
				return {
					success: false,
					error: 'Leverage must be between 1 and 125',
					timestamp: Date.now(),
				};
			}

			// Call Aster API v1 endpoint with HMAC signature (use hmacPost)
			const params = {
				symbol,
				leverage: leverage.toString(), // Ensure it's a string
				timestamp: Date.now(),
				recvWindow: 50000,
			};

			this.logger.debug(`Leverage params:`, params);

			const response = await this.asterApiService.hmacPost('/fapi/v1/leverage', params);

			if (response.success) {
				this.logger.log(`✅ Leverage set successfully: ${symbol} = ${leverage}x`);
			} else {
				this.logger.warn(`⚠️ Leverage set failed for ${symbol}: ${response.error}`);
				// Log detailed error for debugging
				if (response.data) {
					this.logger.debug('Leverage error details:', JSON.stringify(response.data));
				}
			}

			return response;
		} catch (error) {
			this.logger.error('❌ Error setting leverage:', error.message || error);
			if (error.response?.data) {
				this.logger.debug('Error response data:', JSON.stringify(error.response.data));
			}
			return {
				success: false,
				error: error.message || 'Failed to set leverage',
				data: error.response?.data || null,
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Format quantity with appropriate precision based on symbol
	 */
	private formatQuantity(rawQuantity: number, symbol: string): string {
		// Determine max decimal places based on symbol
		let decimalPlaces = 1; // Most conservative default

		// Map common symbols to their precision
		if (symbol.startsWith('BTC')) {
			decimalPlaces = 3; // BTC: 0.001
		} else if (symbol.startsWith('ETH')) {
			decimalPlaces = 2; // ETH: 0.01
		} else if (symbol.startsWith('BNB') || symbol.startsWith('SOL')) {
			decimalPlaces = 2; // BNB, SOL: 0.01
		} else if (
			symbol.startsWith('XRP') ||
			symbol.startsWith('DOGE') ||
			symbol.startsWith('ADA') ||
			symbol.startsWith('TRX') ||
			symbol.startsWith('SHIB')
		) {
			decimalPlaces = 0; // Low-value coins: integer only
		} else {
			// Default for unknown symbols - use conservative approach
			decimalPlaces = 1;
		}

		// Format with specified precision
		let formatted: string;
		if (decimalPlaces === 0) {
			// Round to nearest integer for coins with 0 decimal places
			formatted = Math.floor(rawQuantity).toString();
		} else {
			formatted = rawQuantity.toFixed(decimalPlaces);
		}

		// Remove trailing zeros for non-zero decimal places
		if (decimalPlaces > 0) {
			formatted = formatted.replace(/\.?0+$/, '');
		}

		return formatted;
	}

	/**
	 * Quick Long position with current market price
	 * @param symbol Trading pair symbol (e.g., BTCUSDT)
	 * @param usdtValue Value in USDT to long
	 * @param stopLossPercent Stop loss percentage based on account balance (default 15%)
	 *                        Note: This will be adjusted by leverage. With 10x leverage,
	 *                        15% SL = 1.5% price movement to lose 15% of account
	 * @param takeProfitPercent Take profit percentage based on account balance (default 15%)
	 *                          Note: This will be adjusted by leverage. With 10x leverage,
	 *                          15% TP = 1.5% price movement to gain 15% of account
	 * @param leverage Leverage multiplier (default 10x)
	 */
	async quickLong(
		symbol: string,
		usdtValue: number,
		stopLossPercent: number = 15,
		takeProfitPercent: number = 15,
		leverage: number = 10,
	): Promise<AsterApiResponse<{ mainOrder: Order; stopLoss?: Order; takeProfit?: Order }>> {
		try {
			this.logger.log(`Quick LONG: ${symbol} with ${usdtValue} USDT, Leverage: ${leverage}x (for calculation only, set via /aster/leverage API), SL: ${stopLossPercent}%, TP: ${takeProfitPercent}%`);

			// Note: Leverage should be set separately via setLeverage() API
			// The leverage parameter here is only used for quantity calculation

			// Get current market price
			const priceResponse = await this.marketDataService.getPriceTicker(symbol);
			if (!priceResponse.success || !priceResponse.data) {
				return {
					success: false,
					error: 'Failed to get current price',
					timestamp: Date.now(),
				};
			}

			const currentPrice = parseFloat(priceResponse.data.price);

			// Calculate quantity with leverage
			const rawQuantity = (usdtValue * leverage) / currentPrice;
			// Format with symbol-specific precision
			const quantity = this.formatQuantity(rawQuantity, symbol);

			this.logger.debug(`Current price: ${currentPrice}, USDT value: ${usdtValue}, Leverage: ${leverage}x, Raw quantity: ${rawQuantity}, Formatted quantity: ${quantity}`);

			// Check if quantity is too small after formatting
			const numQuantity = parseFloat(quantity);
			if (numQuantity <= 0 || isNaN(numQuantity)) {
				const minUSDT = symbol.startsWith('BTC') ? currentPrice * 0.001
					: symbol.includes('ETH') ? currentPrice * 0.01
						: currentPrice * 0.01;
				return {
					success: false,
					error: `USDT value too small. Quantity after rounding: ${quantity}. Minimum recommended: ${minUSDT.toFixed(2)} USDT for ${symbol}`,
					timestamp: Date.now(),
				};
			}

			// Set leverage BEFORE placing orders (critical!)
			try {
				const levResp = await this.setLeverage(symbol, leverage);
				if (!levResp.success) {
					this.logger.warn(`⚠️ Leverage set failed: ${levResp.error} - continuing with existing leverage`);
				} else {
					this.logger.log(`✅ Leverage set to ${leverage}x for ${symbol}`);
				}
			} catch (e) {
				this.logger.warn('⚠️ Error setting leverage (continuing):', e.message || e);
			}

			// Calculate stop loss and take profit prices BEFORE placing orders
			// IMPORTANT: Adjust SL/TP by leverage to get actual account P&L percentage
			// Example: 15% SL with 10x leverage = 1.5% price movement = 15% account loss
			const priceMovementSL = stopLossPercent / leverage;
			const priceMovementTP = takeProfitPercent / leverage;

			// Use higher precision for small price movements to avoid rounding issues
			const precision = currentPrice < 1 ? 6 : currentPrice < 10 ? 4 : 2;
			const stopLossPrice = (currentPrice * (1 - priceMovementSL / 100)).toFixed(precision);
			const takeProfitPrice = (currentPrice * (1 + priceMovementTP / 100)).toFixed(precision);

			this.logger.debug(`SL/TP adjusted by ${leverage}x leverage: Price SL movement: ${priceMovementSL.toFixed(2)}%, Price TP movement: ${priceMovementTP.toFixed(2)}%`);
			this.logger.debug(`Current Price: ${currentPrice}, SL Price: ${stopLossPrice}, TP Price: ${takeProfitPrice}`);

			// Batch ALL 3 orders: Main LONG + Stop Loss + Take Profit
			const allOrders: OrderRequest[] = [
				{
					symbol,
					side: 'BUY',
					type: 'MARKET',
					quantity,
					newClientOrderId: this.generateClientOrderId(),
				},
				{
					symbol,
					side: 'SELL',
					type: 'STOP_MARKET',
					stopPrice: stopLossPrice,
					closePosition: 'true',
					workingType: 'CONTRACT_PRICE',
					newClientOrderId: this.generateClientOrderId(),
				},
				{
					symbol,
					side: 'SELL',
					type: 'TAKE_PROFIT_MARKET',
					stopPrice: takeProfitPrice,
					closePosition: 'true',
					workingType: 'CONTRACT_PRICE',
					newClientOrderId: this.generateClientOrderId(),
				},
			];

			const batchResult = await this.batchOrders(allOrders);

			if (!batchResult.success || !Array.isArray(batchResult.data) || batchResult.data.length < 3) {
				this.logger.error('❌ Batch orders failed:', batchResult.error);
				return {
					success: false,
					error: batchResult.error || 'Failed to place batch orders',
					data: batchResult.data as any,
					timestamp: Date.now(),
				};
			}

			const mainOrder = batchResult.data[0];
			const stopLossOrder = batchResult.data[1];
			const takeProfitOrder = batchResult.data[2];

			this.logger.log(`✅ All 3 orders placed in batch: Main=${mainOrder.orderId}, SL=${stopLossOrder.orderId}, TP=${takeProfitOrder.orderId}`);

			return {
				success: true,
				data: {
					mainOrder,
					stopLoss: stopLossOrder,
					takeProfit: takeProfitOrder,
				},
				timestamp: Date.now(),
			};
		} catch (error) {
			this.logger.error('Error in quick long:', error);
			return {
				success: false,
				error: error.message || 'Failed to execute quick long',
				data: error.response?.data || null, // Return detailed error from API
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Quick Short position with current market price
	 * @param symbol Trading pair symbol (e.g., BTCUSDT)
	 * @param usdtValue Value in USDT to short
	 * @param stopLossPercent Stop loss percentage based on account balance (default 15%)
	 *                        Note: This will be adjusted by leverage. With 10x leverage,
	 *                        15% SL = 1.5% price movement to lose 15% of account
	 * @param takeProfitPercent Take profit percentage based on account balance (default 15%)
	 *                          Note: This will be adjusted by leverage. With 10x leverage,
	 *                          15% TP = 1.5% price movement to gain 15% of account
	 * @param leverage Leverage multiplier (default 10x)
	 */
	async quickShort(
		symbol: string,
		usdtValue: number,
		stopLossPercent: number = 15,
		takeProfitPercent: number = 15,
		leverage: number = 10,
	): Promise<AsterApiResponse<{ mainOrder: Order; stopLoss?: Order; takeProfit?: Order }>> {
		try {
			this.logger.log(`Quick SHORT: ${symbol} with ${usdtValue} USDT, Leverage: ${leverage}x (for calculation only, set via /aster/leverage API), SL: ${stopLossPercent}%, TP: ${takeProfitPercent}%`);

			// Note: Leverage should be set separately via setLeverage() API
			// The leverage parameter here is only used for quantity calculation

			// Get current market price
			const priceResponse = await this.marketDataService.getPriceTicker(symbol);
			if (!priceResponse.success || !priceResponse.data) {
				return {
					success: false,
					error: 'Failed to get current price',
					timestamp: Date.now(),
				};
			}

			const currentPrice = parseFloat(priceResponse.data.price);

			// Calculate quantity with leverage
			const rawQuantity = (usdtValue * leverage) / currentPrice;
			// Format with symbol-specific precision
			const quantity = this.formatQuantity(rawQuantity, symbol);

			this.logger.debug(`Current price: ${currentPrice}, USDT value: ${usdtValue}, Leverage: ${leverage}x, Raw quantity: ${rawQuantity}, Formatted quantity: ${quantity}`);

			// Check if quantity is too small after formatting
			const numQuantity = parseFloat(quantity);
			if (numQuantity <= 0 || isNaN(numQuantity)) {
				const minUSDT = symbol.startsWith('BTC') ? currentPrice * 0.001
					: symbol.includes('ETH') ? currentPrice * 0.01
						: currentPrice * 0.01;
				return {
					success: false,
					error: `USDT value too small. Quantity after rounding: ${quantity}. Minimum recommended: ${minUSDT.toFixed(2)} USDT for ${symbol}`,
					timestamp: Date.now(),
				};
			}

			// Set leverage BEFORE placing orders (critical!)
			try {
				const levResp = await this.setLeverage(symbol, leverage);
				if (!levResp.success) {
					this.logger.warn(`⚠️ Leverage set failed: ${levResp.error} - continuing with existing leverage`);
				} else {
					this.logger.log(`✅ Leverage set to ${leverage}x for ${symbol}`);
				}
			} catch (e) {
				this.logger.warn('⚠️ Error setting leverage (continuing):', e.message || e);
			}

			// Calculate stop loss and take profit prices BEFORE placing orders
			// IMPORTANT: Adjust SL/TP by leverage to get actual account P&L percentage
			// Example: 15% SL with 10x leverage = 1.5% price movement = 15% account loss
			const priceMovementSL = stopLossPercent / leverage;
			const priceMovementTP = takeProfitPercent / leverage;

			// Use higher precision for small price movements to avoid rounding issues
			const precision = currentPrice < 1 ? 6 : currentPrice < 10 ? 4 : 2;
			const stopLossPrice = (currentPrice * (1 + priceMovementSL / 100)).toFixed(precision);
			const takeProfitPrice = (currentPrice * (1 - priceMovementTP / 100)).toFixed(precision);

			this.logger.debug(`SL/TP adjusted by ${leverage}x leverage: Price SL movement: ${priceMovementSL.toFixed(2)}%, Price TP movement: ${priceMovementTP.toFixed(2)}%`);
			this.logger.debug(`Current Price: ${currentPrice}, SL Price: ${stopLossPrice}, TP Price: ${takeProfitPrice}`);

			// Batch ALL 3 orders: Main SHORT + Stop Loss + Take Profit
			const allOrders: OrderRequest[] = [
				{
					symbol,
					side: 'SELL',
					type: 'MARKET',
					quantity,
					newClientOrderId: this.generateClientOrderId(),
				},
				{
					symbol,
					side: 'BUY', // SHORT position needs BUY to close
					type: 'STOP_MARKET',
					stopPrice: stopLossPrice,
					closePosition: 'true',
					workingType: 'CONTRACT_PRICE',
					newClientOrderId: this.generateClientOrderId(),
				},
				{
					symbol,
					side: 'BUY', // SHORT position needs BUY to close
					type: 'TAKE_PROFIT_MARKET',
					stopPrice: takeProfitPrice,
					closePosition: 'true',
					workingType: 'CONTRACT_PRICE',
					newClientOrderId: this.generateClientOrderId(),
				},
			];

			const batchResult = await this.batchOrders(allOrders);

			if (!batchResult.success || !Array.isArray(batchResult.data) || batchResult.data.length < 3) {
				this.logger.error('❌ Batch orders failed:', batchResult.error);
				return {
					success: false,
					error: batchResult.error || 'Failed to place batch orders',
					data: batchResult.data as any,
					timestamp: Date.now(),
				};
			}

			const mainOrder = batchResult.data[0];
			const stopLossOrder = batchResult.data[1];
			const takeProfitOrder = batchResult.data[2];

			this.logger.log(`✅ All 3 orders placed in batch: Main=${mainOrder.orderId}, SL=${stopLossOrder.orderId}, TP=${takeProfitOrder.orderId}`);

			return {
				success: true,
				data: {
					mainOrder,
					stopLoss: stopLossOrder,
					takeProfit: takeProfitOrder,
				},
				timestamp: Date.now(),
			};
		} catch (error) {
			this.logger.error('Error in quick short:', error);
			return {
				success: false,
				error: error.message || 'Failed to execute quick short',
				data: error.response?.data || null, // Return detailed error from API
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Get all positions for account (Position Information v3 USER_DATA endpoint)
	 * GET /fapi/v3/positionRisk
	 */
	async getPositions(symbol?: string): Promise<AsterApiResponse<any[]>> {
		try {
			const params: any = {
				timestamp: Date.now(),
				recvWindow: 50000,
			};

			if (symbol) {
				params.symbol = symbol;
			}

			const response = await this.asterApiService.get<any[]>('/fapi/v3/positionRisk', params);

			return response;
		} catch (error) {
			this.logger.error('Error fetching positions:', error);
			return {
				success: false,
				error: error.message || 'Failed to fetch positions',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Get account information (Account Information v3 USER_DATA endpoint)
	 * GET /fapi/v3/account
	 */
	async getAccountInfo(): Promise<AsterApiResponse<any>> {
		try {
			const params = {
				timestamp: Date.now(),
				recvWindow: 50000,
			};

			const response = await this.asterApiService.get<any>('/fapi/v3/account', params);

			return response;
		} catch (error) {
			this.logger.error('Error fetching account information:', error);
			return {
				success: false,
				error: error.message || 'Failed to fetch account information',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Get all orders history (All Orders USER_DATA endpoint)
	 * Uses /fapi/v1/allOrders with HMAC SHA256
	 */
	async getAllOrders(
		symbol: string,
		orderId?: string,
		startTime?: number,
		endTime?: number,
		limit: number = 500
	): Promise<AsterApiResponse<Order[]>> {
		try {
			const params: any = {
				symbol,
				timestamp: Date.now(),
				recvWindow: 50000,
				limit,
			};

			if (startTime) {
				params.startTime = startTime;
			}

			if (endTime) {
				params.endTime = endTime;
			}

			if (orderId) {
				params.orderId = orderId;
			}

			// Use HMAC GET for v1 endpoint
			const response = await this.asterApiService.hmacGet<Order[]>('/fapi/v1/allOrders', params);

			return response;
		} catch (error) {
			this.logger.error('Error fetching all orders:', error);
			return {
				success: false,
				error: error.message || 'Failed to fetch all orders',
				timestamp: Date.now(),
			};
		}

	}
	/**
	 * Close position (full or partial)
	 * Uses market or limit order with reduceOnly=true
	 */
	async closePosition(closeRequest: ClosePositionRequest): Promise<AsterApiResponse<Order>> {
		try {
			this.logger.debug(`Closing position for ${closeRequest.symbol}`);

			// Get current position to determine side and quantity
			const positionResponse = await this.balanceService.getPositionRisk(closeRequest.symbol);
			if (!positionResponse.success || !positionResponse.data) {
				return {
					success: false,
					error: 'Failed to get current position',
					timestamp: Date.now(),
				};
			}

			// Find the position based on positionSide
			let position = positionResponse.data.find(p => {
				if (closeRequest.positionSide) {
					return p.positionSide === closeRequest.positionSide;
				}
				// If no positionSide specified, find any non-zero position
				return parseFloat(p.positionAmt) !== 0;
			});

			if (!position) {
				return {
					success: false,
					error: 'No open position found',
					timestamp: Date.now(),
				};
			}

			const positionAmt = parseFloat(position.positionAmt);
			if (positionAmt === 0) {
				return {
					success: false,
					error: 'Position amount is zero',
					timestamp: Date.now(),
				};
			}

			// Determine order side (opposite of position)
			// Positive positionAmt = LONG position, need SELL to close
			// Negative positionAmt = SHORT position, need BUY to close
			const orderSide = positionAmt > 0 ? 'SELL' : 'BUY';

			// Determine quantity to close
			const quantity = closeRequest.quantity || Math.abs(positionAmt).toString();

			// Build order request
			const orderRequest: OrderRequest = {
				symbol: closeRequest.symbol,
				side: orderSide,
				type: closeRequest.type || 'MARKET',
				quantity,
				reduceOnly: 'true',
				positionSide: position.positionSide,
			};

			// Add price for LIMIT orders
			if (closeRequest.type === 'LIMIT') {
				if (!closeRequest.price) {
					return {
						success: false,
						error: 'Price is required for LIMIT orders',
						timestamp: Date.now(),
					};
				}
				orderRequest.price = closeRequest.price;
			}

			this.logger.log(`Closing ${orderRequest.side} position for ${closeRequest.symbol}, quantity: ${quantity}`);

			return this.placeOrder(orderRequest);
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
	 * Close all positions using STOP_MARKET or TAKE_PROFIT_MARKET with closePosition=true
	 * This is useful for setting stop-loss or take-profit to close entire position
	 */
	async closeAllPosition(request: CloseAllPositionRequest): Promise<AsterApiResponse<Order>> {
		try {
			this.logger.debug(`Setting close-all order for ${request.symbol}`);

			// Validate: SELL with LONG or BUY with SHORT
			if (request.positionSide === 'LONG' && request.side === 'BUY') {
				return {
					success: false,
					error: 'Cannot use BUY orders in LONG position side',
					timestamp: Date.now(),
				};
			}

			if (request.positionSide === 'SHORT' && request.side === 'SELL') {
				return {
					success: false,
					error: 'Cannot use SELL orders in SHORT position side',
					timestamp: Date.now(),
				};
			}

			// Build order request for close-all
			const orderRequest: OrderRequest = {
				symbol: request.symbol,
				side: request.side,
				type: request.type,
				stopPrice: request.stopPrice,
				closePosition: 'true',
				workingType: request.workingType || 'CONTRACT_PRICE',
			};

			// Add optional fields
			if (request.positionSide) {
				orderRequest.positionSide = request.positionSide;
			}

			if (request.priceProtect) {
				orderRequest.priceProtect = request.priceProtect;
			}

			this.logger.log(`Setting ${request.type} close-all order for ${request.symbol} at stopPrice ${request.stopPrice}`);

			return this.placeOrder(orderRequest);
		} catch (error) {
			this.logger.error('Error setting close-all order:', error);
			return {
				success: false,
				error: error.message || 'Failed to set close-all order',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Quick method to close LONG position with market order
	 */
	async closeLongPosition(symbol: string, quantity?: string): Promise<AsterApiResponse<Order>> {
		return this.closePosition({
			symbol,
			positionSide: 'LONG',
			quantity,
			type: 'MARKET',
		});
	}

	/**
	 * Quick method to close SHORT position with market order
	 */
	async closeShortPosition(symbol: string, quantity?: string): Promise<AsterApiResponse<Order>> {
		return this.closePosition({
			symbol,
			positionSide: 'SHORT',
			quantity,
			type: 'MARKET',
		});
	}

	/**
	 * Set stop-loss to close all LONG position
	 */
	async setStopLossLong(symbol: string, stopPrice: string, priceProtect?: string): Promise<AsterApiResponse<Order>> {
		return this.closeAllPosition({
			symbol,
			side: 'SELL',
			positionSide: 'LONG',
			type: 'STOP_MARKET',
			stopPrice,
			priceProtect,
		});
	}

	/**
	 * Set stop-loss to close all SHORT position
	 */
	async setStopLossShort(symbol: string, stopPrice: string, priceProtect?: string): Promise<AsterApiResponse<Order>> {
		return this.closeAllPosition({
			symbol,
			side: 'BUY',
			positionSide: 'SHORT',
			type: 'STOP_MARKET',
			stopPrice,
			priceProtect,
		});
	}

	/**
	 * Set take-profit to close all LONG position
	 */
	async setTakeProfitLong(symbol: string, stopPrice: string, priceProtect?: string): Promise<AsterApiResponse<Order>> {
		return this.closeAllPosition({
			symbol,
			side: 'SELL',
			positionSide: 'LONG',
			type: 'TAKE_PROFIT_MARKET',
			stopPrice,
			priceProtect,
		});
	}

	/**
	 * Set take-profit to close all SHORT position
	 */
	async setTakeProfitShort(symbol: string, stopPrice: string, priceProtect?: string): Promise<AsterApiResponse<Order>> {
		return this.closeAllPosition({
			symbol,
			side: 'BUY',
			positionSide: 'SHORT',
			type: 'TAKE_PROFIT_MARKET',
			stopPrice,
			priceProtect,
		});
	}

	/**
	 * Simple close position - just provide symbol
	 * Automatically detects and closes ALL open positions for the symbol
	 * Also cancels all open orders (TP/SL) for the symbol
	 */
	async closePositionSimple(symbol: string): Promise<AsterApiResponse<any>> {
		try {
			this.logger.debug(`Simple close position for ${symbol}`);

			// Step 1: Cancel all open orders (TP/SL) for this symbol
			this.logger.debug(`Cancelling all open orders for ${symbol}`);
			const cancelResult = await this.cancelAllOrders(symbol);
			const cancelledOrders = cancelResult.success ? (cancelResult.data?.length || 0) : 0;

			// Step 2: Get current positions
			const positionResponse = await this.balanceService.getPositionRisk(symbol);
			if (!positionResponse.success || !positionResponse.data) {
				return {
					success: false,
					error: 'Failed to get current positions',
					timestamp: Date.now(),
				};
			}

			// Find all non-zero positions
			const openPositions = positionResponse.data.filter(p => parseFloat(p.positionAmt) !== 0);

			if (openPositions.length === 0) {
				return {
					success: cancelledOrders > 0,
					data: {
						message: cancelledOrders > 0
							? `No open positions, but cancelled ${cancelledOrders} open orders`
							: 'No open positions or orders found for this symbol',
						cancelledOrders,
						closedPositions: [],
						totalClosed: 0,
					},
					timestamp: Date.now(),
				};
			}

			// Step 3: Close all positions
			const results = [];
			for (const position of openPositions) {
				const positionAmt = parseFloat(position.positionAmt);
				const orderSide = positionAmt > 0 ? 'SELL' : 'BUY';
				const quantity = Math.abs(positionAmt).toString();

				const orderRequest: OrderRequest = {
					symbol,
					side: orderSide,
					type: 'MARKET',
					quantity,
					reduceOnly: 'true',
					positionSide: position.positionSide,
				};

				const result = await this.placeOrder(orderRequest);
				results.push({
					positionSide: position.positionSide,
					quantity,
					side: orderSide,
					result,
				});
			}

			return {
				success: true,
				data: {
					cancelledOrders,
					closedPositions: results,
					totalClosed: results.length,
				},
				timestamp: Date.now(),
			};
		} catch (error) {
			this.logger.error('Error closing position:', error);
			return {
				success: false,
				error: error.message || 'Failed to close position',
				timestamp: Date.now(),
			};
		}
	}
}