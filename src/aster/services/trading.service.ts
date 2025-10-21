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
			const asterOrderRequest = {
				symbol: orderRequest.symbol,
				side: orderRequest.side,
				type: orderRequest.type,
				quantity: orderRequest.quantity,
				price: orderRequest.price,
				timeInForce: orderRequest.timeInForce || 'GTC',
				newClientOrderId: orderRequest.newClientOrderId,
				stopPrice: orderRequest.stopPrice,
				closePosition: orderRequest.closePosition,
				activationPrice: orderRequest.activationPrice,
				callbackRate: orderRequest.callbackRate,
				workingType: orderRequest.workingType || 'CONTRACT_PRICE',
				priceProtect: orderRequest.priceProtect || 'FALSE',
				newOrderRespType: orderRequest.newOrderRespType || 'ACK',
				positionSide: orderRequest.positionSide || 'BOTH',
				reduceOnly: orderRequest.reduceOnly || 'false',
				timestamp: Date.now(),
				recvWindow: orderRequest.recvWindow || 50000,
			};

			// Remove undefined/null values
			Object.keys(asterOrderRequest).forEach(key => {
				if (asterOrderRequest[key] === undefined || asterOrderRequest[key] === null) {
					delete asterOrderRequest[key];
				}
			});

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

			const response = await this.asterApiService.delete<Order>('/fapi/v1/order', params);

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
	 */
	async getOrder(symbol: string, orderId?: string, origClientOrderId?: string): Promise<AsterApiResponse<Order>> {
		try {
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

			const response = await this.asterApiService.get<Order>('/fapi/v1/order', params);

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

			const response = await this.asterApiService.get<Order[]>('/fapi/v1/openOrders', params);

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
	 */
	async cancelAllOrders(symbol: string): Promise<AsterApiResponse<any>> {
		try {
			this.logger.debug(`Cancelling all orders for ${symbol}`);

			const params = {
				symbol,
				timestamp: Date.now(),
				recvWindow: 50000,
			};

			const response = await this.asterApiService.delete<any>('/fapi/v1/allOpenOrders', params);

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

			// Check balance for buy orders (simplified check)
			if (orderRequest.side === 'BUY' && orderRequest.type === 'LIMIT' && orderRequest.price) {
				const baseAsset = this.extractBaseAsset(orderRequest.symbol);
				const requiredAmount = (parseFloat(orderRequest.quantity) * parseFloat(orderRequest.price)).toString();

				const hasSufficientBalance = await this.balanceService.hasSufficientBalance(baseAsset, requiredAmount);
				if (!hasSufficientBalance) {
					return { isValid: false, error: 'Insufficient balance' };
				}
			}

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
	 * Quick Long position with current market price
	 * @param symbol Trading pair symbol (e.g., BTCUSDT)
	 * @param usdtValue Value in USDT to long
	 * @param stopLossPercent Stop loss percentage (default 15%)
	 * @param takeProfitPercent Take profit percentage (default 15%)
	 */
	async quickLong(
		symbol: string,
		usdtValue: number,
		stopLossPercent: number = 15,
		takeProfitPercent: number = 15,
	): Promise<AsterApiResponse<{ mainOrder: Order; stopLoss?: Order; takeProfit?: Order }>> {
		try {
			this.logger.log(`Quick LONG: ${symbol} with ${usdtValue} USDT, SL: ${stopLossPercent}%, TP: ${takeProfitPercent}%`);

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
			const quantity = (usdtValue / currentPrice).toFixed(6);

			this.logger.debug(`Current price: ${currentPrice}, Quantity: ${quantity}`);

			// Place market buy order (LONG)
			const mainOrderRequest: OrderRequest = {
				symbol,
				side: 'BUY',
				type: 'MARKET',
				quantity,
				positionSide: 'LONG',
				newClientOrderId: this.generateClientOrderId(),
			};

			const mainOrder = await this.placeOrder(mainOrderRequest);
			if (!mainOrder.success) {
				return {
					success: false,
					error: mainOrder.error || 'Failed to place main order',
					timestamp: Date.now(),
				};
			}

			// Calculate stop loss and take profit prices
			const stopLossPrice = (currentPrice * (1 - stopLossPercent / 100)).toFixed(2);
			const takeProfitPrice = (currentPrice * (1 + takeProfitPercent / 100)).toFixed(2);

			this.logger.debug(`SL Price: ${stopLossPrice}, TP Price: ${takeProfitPrice}`);

			// Place stop loss order
			const stopLossRequest: OrderRequest = {
				symbol,
				side: 'SELL',
				type: 'STOP_MARKET',
				quantity,
				stopPrice: stopLossPrice,
				positionSide: 'LONG',
				workingType: 'CONTRACT_PRICE',
				newClientOrderId: this.generateClientOrderId(),
			};

			const stopLossOrder = await this.placeOrder(stopLossRequest);

			// Place take profit order
			const takeProfitRequest: OrderRequest = {
				symbol,
				side: 'SELL',
				type: 'TAKE_PROFIT_MARKET',
				quantity,
				stopPrice: takeProfitPrice,
				positionSide: 'LONG',
				workingType: 'CONTRACT_PRICE',
				newClientOrderId: this.generateClientOrderId(),
			};

			const takeProfitOrder = await this.placeOrder(takeProfitRequest);

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
	 */
	async quickShort(
		symbol: string,
		usdtValue: number,
		stopLossPercent: number = 15,
		takeProfitPercent: number = 15,
	): Promise<AsterApiResponse<{ mainOrder: Order; stopLoss?: Order; takeProfit?: Order }>> {
		try {
			this.logger.log(`Quick SHORT: ${symbol} with ${usdtValue} USDT, SL: ${stopLossPercent}%, TP: ${takeProfitPercent}%`);

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
			const quantity = (usdtValue / currentPrice).toFixed(6);

			this.logger.debug(`Current price: ${currentPrice}, Quantity: ${quantity}`);

			// Place market sell order (SHORT)
			const mainOrderRequest: OrderRequest = {
				symbol,
				side: 'SELL',
				type: 'MARKET',
				quantity,
				positionSide: 'SHORT',
				newClientOrderId: this.generateClientOrderId(),
			};

			const mainOrder = await this.placeOrder(mainOrderRequest);
			if (!mainOrder.success) {
				return {
					success: false,
					error: mainOrder.error || 'Failed to place main order',
					timestamp: Date.now(),
				};
			}

			// Calculate stop loss and take profit prices
			const stopLossPrice = (currentPrice * (1 + stopLossPercent / 100)).toFixed(2);
			const takeProfitPrice = (currentPrice * (1 - takeProfitPercent / 100)).toFixed(2);

			this.logger.debug(`SL Price: ${stopLossPrice}, TP Price: ${takeProfitPrice}`);

			// Place stop loss order
			const stopLossRequest: OrderRequest = {
				symbol,
				side: 'BUY',
				type: 'STOP_MARKET',
				quantity,
				stopPrice: stopLossPrice,
				positionSide: 'SHORT',
				workingType: 'CONTRACT_PRICE',
				newClientOrderId: this.generateClientOrderId(),
			};

			const stopLossOrder = await this.placeOrder(stopLossRequest);

			// Place take profit order
			const takeProfitRequest: OrderRequest = {
				symbol,
				side: 'BUY',
				type: 'TAKE_PROFIT_MARKET',
				quantity,
				stopPrice: takeProfitPrice,
				positionSide: 'SHORT',
				workingType: 'CONTRACT_PRICE',
				newClientOrderId: this.generateClientOrderId(),
			};

			const takeProfitOrder = await this.placeOrder(takeProfitRequest);

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
				timestamp: Date.now(),
			};
		}
	}
}