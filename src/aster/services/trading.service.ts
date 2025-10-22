import { Injectable, Logger } from '@nestjs/common';
import { AsterApiService } from './aster-api.service';
import { BalanceService } from './balance.service';
import { MarketDataService } from './market-data.service';
import { OrderRequest, Order, AsterApiResponse } from '../types';

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
				error: error.message || 'Failed to fetch open orders',
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
	 * Extract base asset from symbol (e.g., BTCUSDT -> USDT)
	 */
	private extractBaseAsset(symbol: string): string {
		// This is a simplified extraction - adjust based on actual symbol format
		if (symbol.endsWith('USDT')) return 'USDT';
		if (symbol.endsWith('BTC')) return 'BTC';
		if (symbol.endsWith('ETH')) return 'ETH';

		// Default fallback
		return 'USDT';
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
			this.logger.log(`⚙️ Setting leverage for ${symbol} to ${leverage}x`);

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
				leverage,
				recvWindow: 50000,
				timestamp: Date.now(),
			};

			const response = await this.asterApiService.hmacPost('/fapi/v1/leverage', params);

			if (response.success) {
				this.logger.log(`✅ Leverage set successfully for ${symbol}: ${leverage}x`);
			} else {
				this.logger.error(`❌ Failed to set leverage for ${symbol}:`, response.error);
			}

			return response;
		} catch (error) {
			this.logger.error('Error setting leverage:', error);
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
	 * @param stopLossPercent Stop loss percentage (default 15%)
	 * @param takeProfitPercent Take profit percentage (default 15%)
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

			// Place market buy order (LONG)
			// Note: Not using positionSide for One-Way position mode compatibility
			const mainOrderRequest: any = {
				symbol,
				side: 'BUY',
				type: 'MARKET',
				quantity,
				newClientOrderId: this.generateClientOrderId(),
				timestamp: Date.now(),
				recvWindow: 50000,
			};

			const mainOrder = await this.asterApiService.post<Order>('/fapi/v3/order', mainOrderRequest);
			if (!mainOrder.success) {
				this.logger.error('Failed to place main order:', mainOrder.error);
				return {
					success: false,
					error: mainOrder.error || 'Failed to place main order',
					data: mainOrder.data as any, // Return error details from Aster API
					timestamp: Date.now(),
				};
			}

			// Log full response to debug
			this.logger.debug('Main order response:', JSON.stringify(mainOrder.data));

			// Get executed quantity from main order - prioritize origQty as executedQty may be 0 initially
			const orderData = mainOrder.data as any;
			const executedQty = mainOrder.data?.origQty || mainOrder.data?.executedQty || orderData?.qty || quantity;

			this.logger.log(`Main order placed with quantity: ${executedQty} (status: ${mainOrder.data?.status}, origQty: ${mainOrder.data?.origQty}, executedQty: ${mainOrder.data?.executedQty})`);

			// After placing main order, attempt to set user's leverage on exchange (non-blocking)
			try {
				const levResp = await this.setLeverage(symbol, leverage);
				if (!levResp.success) {
					this.logger.warn(`Leverage set attempt failed after main order: ${levResp.error}`);
				} else {
					this.logger.log(`Leverage set after main order: ${leverage}x for ${symbol}`);
				}
			} catch (e) {
				this.logger.warn('Error while setting leverage after main order (continuing):', e.message || e);
			}

			// Calculate stop loss and take profit prices
			const stopLossPrice = (currentPrice * (1 - stopLossPercent / 100)).toFixed(2);
			const takeProfitPrice = (currentPrice * (1 + takeProfitPercent / 100)).toFixed(2);

			this.logger.debug(`SL Price: ${stopLossPrice}, TP Price: ${takeProfitPrice}`);

			// Place stop loss order (close all position when triggered)
			const stopLossRequest: OrderRequest = {
				symbol,
				side: 'SELL',
				type: 'STOP_MARKET',
				stopPrice: stopLossPrice,
				closePosition: 'true', // Close all LONG position when triggered
				workingType: 'CONTRACT_PRICE',
				newClientOrderId: this.generateClientOrderId(),
			};

			const stopLossOrder = await this.placeOrder(stopLossRequest);

			if (!stopLossOrder.success) {
				this.logger.error('❌ FAILED to place STOP LOSS order:', stopLossOrder.error);
				this.logger.error('SL Request:', JSON.stringify(stopLossRequest));
			} else {
				this.logger.log('✅ STOP LOSS order placed:', stopLossOrder.data?.orderId);
			}

			// Place take profit order (close all position when triggered)
			const takeProfitRequest: OrderRequest = {
				symbol,
				side: 'SELL',
				type: 'TAKE_PROFIT_MARKET',
				stopPrice: takeProfitPrice,
				closePosition: 'true', // Close all LONG position when triggered
				workingType: 'CONTRACT_PRICE',
				newClientOrderId: this.generateClientOrderId(),
			};

			const takeProfitOrder = await this.placeOrder(takeProfitRequest);

			if (!takeProfitOrder.success) {
				this.logger.error('❌ FAILED to place TAKE PROFIT order:', takeProfitOrder.error);
				this.logger.error('TP Request:', JSON.stringify(takeProfitRequest));
			} else {
				this.logger.log('✅ TAKE PROFIT order placed:', takeProfitOrder.data?.orderId);
			}

			return {
				success: true,
				data: {
					mainOrder: mainOrder.data,
					stopLoss: stopLossOrder.success ? stopLossOrder.data : undefined,
					takeProfit: takeProfitOrder.success ? takeProfitOrder.data : undefined,
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
	 * @param stopLossPercent Stop loss percentage (default 15%)
	 * @param takeProfitPercent Take profit percentage (default 15%)
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

			// Place market sell order (SHORT)
			// Note: Not using positionSide for One-Way position mode compatibility
			const mainOrderRequest: any = {
				symbol,
				side: 'SELL',
				type: 'MARKET',
				quantity,
				newClientOrderId: this.generateClientOrderId(),
				timestamp: Date.now(),
				recvWindow: 50000,
			};

			const mainOrder = await this.asterApiService.post<Order>('/fapi/v3/order', mainOrderRequest);
			if (!mainOrder.success) {
				this.logger.error('Failed to place main order:', mainOrder.error);
				return {
					success: false,
					error: mainOrder.error || 'Failed to place main order',
					data: mainOrder.data as any, // Return error details from Aster API
					timestamp: Date.now(),
				};
			}

			// Log full response to debug
			this.logger.debug('Main order response:', JSON.stringify(mainOrder.data));

			// Get executed quantity from main order - prioritize origQty as executedQty may be 0 initially
			const orderData = mainOrder.data as any;
			const executedQty = mainOrder.data?.origQty || mainOrder.data?.executedQty || orderData?.qty || quantity;

			this.logger.log(`Main order placed with quantity: ${executedQty} (status: ${mainOrder.data?.status}, origQty: ${mainOrder.data?.origQty}, executedQty: ${mainOrder.data?.executedQty})`);

			// Calculate stop loss and take profit prices
			const stopLossPrice = (currentPrice * (1 + stopLossPercent / 100)).toFixed(2);
			const takeProfitPrice = (currentPrice * (1 - takeProfitPercent / 100)).toFixed(2);

			this.logger.debug(`SL Price: ${stopLossPrice}, TP Price: ${takeProfitPrice}`);

			// Place stop loss order (close all position when triggered)
			const stopLossRequest: OrderRequest = {
				symbol,
				side: 'BUY',
				type: 'STOP_MARKET',
				stopPrice: stopLossPrice,
				closePosition: 'true', // Close all SHORT position when triggered
				workingType: 'CONTRACT_PRICE',
				newClientOrderId: this.generateClientOrderId(),
			};

			const stopLossOrder = await this.placeOrder(stopLossRequest);

			if (!stopLossOrder.success) {
				this.logger.error('❌ FAILED to place STOP LOSS order:', stopLossOrder.error);
				this.logger.error('SL Request:', JSON.stringify(stopLossRequest));
			} else {
				this.logger.log('✅ STOP LOSS order placed:', stopLossOrder.data?.orderId);
			}

			// Place take profit order (close all position when triggered)
			const takeProfitRequest: OrderRequest = {
				symbol,
				side: 'BUY',
				type: 'TAKE_PROFIT_MARKET',
				stopPrice: takeProfitPrice,
				closePosition: 'true', // Close all SHORT position when triggered
				workingType: 'CONTRACT_PRICE',
				newClientOrderId: this.generateClientOrderId(),
			};

			const takeProfitOrder = await this.placeOrder(takeProfitRequest);

			if (!takeProfitOrder.success) {
				this.logger.error('❌ FAILED to place TAKE PROFIT order:', takeProfitOrder.error);
				this.logger.error('TP Request:', JSON.stringify(takeProfitRequest));
			} else {
				this.logger.log('✅ TAKE PROFIT order placed:', takeProfitOrder.data?.orderId);
			}

			return {
				success: true,
				data: {
					mainOrder: mainOrder.data,
					stopLoss: stopLossOrder.success ? stopLossOrder.data : undefined,
					takeProfit: takeProfitOrder.success ? takeProfitOrder.data : undefined,
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
}