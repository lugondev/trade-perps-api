import { Injectable, Logger } from '@nestjs/common';
import {
	IFuturesTradingService,
	PlaceOrderParams,
	MarketOrderParams,
	LimitOrderParams,
	CancelOrderParams,
	SetLeverageParams,
	SetMarginTypeParams,
	SetPositionModeParams,
	ModifyPositionMarginParams,
	SetStopLossParams,
	SetTakeProfitParams,
} from '../../../../common/interfaces';
import { ApiResponse, Order, OrderSide, OrderType, OrderStatus, TimeInForce, PositionSide, Position } from '../../../../common/types';
import { HyperliquidApiService } from '../../shared/hyperliquid-api.service';

@Injectable()
export class HyperliquidPerpTradingService implements IFuturesTradingService {
	private readonly logger = new Logger(HyperliquidPerpTradingService.name);

	constructor(
		private readonly apiService: HyperliquidApiService,
	) { }

	/**
	 * Place a new order - implements interface
	 */
	async placeOrder(params: PlaceOrderParams): Promise<ApiResponse<Order>> {
		try {
			this.logger.debug(`Placing ${params.type} ${params.side} order for ${params.symbol}`);

			const coin = this.formatSymbol(params.symbol);
			const isBuy = params.side === OrderSide.BUY;

			// Build order request
			const orderRequest: any = {
				coin,
				is_buy: isBuy,
				sz: parseFloat(params.quantity),
				reduce_only: params.reduceOnly || false,
			};

			// Handle different order types
			if (params.type === OrderType.MARKET) {
				// Market order - use limit with slippage
				const allMids = await this.apiService.getAllMids();
				if (!allMids.success || !allMids.data) {
					throw new Error('Failed to get market price');
				}

				const midPrice = parseFloat(allMids.data[coin]);
				if (!midPrice) {
					throw new Error(`No market price found for ${coin}`);
				}

				const slippageMultiplier = isBuy ? 1.005 : 0.995;
				const limitPrice = midPrice * slippageMultiplier;

				orderRequest.limit_px = limitPrice.toFixed(2);
				orderRequest.order_type = {
					limit: { tif: 'Ioc' },
				};
			} else if (params.type === OrderType.LIMIT) {
				if (!params.price) {
					throw new Error('Price is required for limit orders');
				}

				let tif: 'Gtc' | 'Ioc' | 'Alo' = 'Gtc';
				if (params.timeInForce === TimeInForce.IOC) tif = 'Ioc';
				else if (params.timeInForce === TimeInForce.FOK) tif = 'Ioc';
				else if (params.timeInForce === TimeInForce.GTX) tif = 'Alo';

				orderRequest.limit_px = parseFloat(params.price).toFixed(2);
				orderRequest.order_type = {
					limit: { tif },
				};
			} else if (params.type === OrderType.STOP_MARKET || params.type === OrderType.TAKE_PROFIT_MARKET) {
				if (!params.stopPrice) {
					throw new Error('Stop price is required for stop/take profit orders');
				}

				const stopPrice = parseFloat(params.stopPrice);
				orderRequest.limit_px = stopPrice.toFixed(2);
				orderRequest.order_type = {
					trigger: {
						isMarket: true,
						triggerPx: stopPrice,
						tpsl: params.type === OrderType.TAKE_PROFIT_MARKET ? 'tp' : 'sl',
					},
				};
			}

			const result = await this.apiService.placeOrder(orderRequest);

			if (!result.success) {
				return {
					success: false,
					error: result.error || 'Failed to place order',
					timestamp: Date.now(),
					exchange: 'hyperliquid',
					tradingType: 'perpetual',
				};
			}

			const order: Order = {
				orderId: result.data?.response?.data?.statuses?.[0]?.resting?.oid?.toString() || 'unknown',
				symbol: params.symbol,
				side: params.side,
				type: params.type,
				status: params.type === OrderType.MARKET ? OrderStatus.FILLED : OrderStatus.NEW,
				price: params.price || '0',
				quantity: params.quantity,
				executedQuantity: params.type === OrderType.MARKET ? params.quantity : '0',
				timestamp: Date.now(),
			};

			return {
				success: true,
				data: order,
				timestamp: Date.now(),
				exchange: 'hyperliquid',
				tradingType: 'perpetual',
			};
		} catch (error: any) {
			this.logger.error(`Error placing order: ${error.message}`);
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
	 * Place market order
	 */
	async placeMarketOrder(params: MarketOrderParams): Promise<ApiResponse<Order>> {
		return this.placeOrder({
			symbol: params.symbol,
			side: params.side,
			type: OrderType.MARKET,
			quantity: params.quantity,
			clientOrderId: params.clientOrderId,
			reduceOnly: params.reduceOnly,
		});
	}

	/**
	 * Place limit order
	 */
	async placeLimitOrder(params: LimitOrderParams): Promise<ApiResponse<Order>> {
		if (!params.price) {
			return {
				success: false,
				error: 'Price is required for limit orders',
				timestamp: Date.now(),
				exchange: 'hyperliquid',
				tradingType: 'perpetual',
			};
		}

		return this.placeOrder({
			symbol: params.symbol,
			side: params.side,
			type: OrderType.LIMIT,
			quantity: params.quantity,
			price: params.price,
			timeInForce: params.timeInForce,
			clientOrderId: params.clientOrderId,
			reduceOnly: params.reduceOnly,
		});
	}

	/**
	 * Cancel an order
	 */
	async cancelOrder(params: CancelOrderParams): Promise<ApiResponse<any>> {
		try {
			const coin = this.formatSymbol(params.symbol);
			const result = await this.apiService.cancelOrder(coin, parseInt(params.orderId!));

			if (!result.success) {
				return {
					success: false,
					error: result.error || 'Failed to cancel order',
					timestamp: Date.now(),
					exchange: 'hyperliquid',
					tradingType: 'perpetual',
				};
			}

			return {
				success: true,
				data: {
					orderId: params.orderId,
					symbol: params.symbol,
					status: 'canceled',
				},
				timestamp: Date.now(),
				exchange: 'hyperliquid',
				tradingType: 'perpetual',
			};
		} catch (error: any) {
			this.logger.error(`Error canceling order: ${error.message}`);
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
	 * Cancel all orders
	 */
	async cancelAllOrders(symbol?: string): Promise<ApiResponse<any>> {
		try {
			const coin = symbol ? this.formatSymbol(symbol) : undefined;
			const result = await this.apiService.cancelAllOrders(coin);

			if (!result.success) {
				return {
					success: false,
					error: result.error || 'Failed to cancel all orders',
					timestamp: Date.now(),
					exchange: 'hyperliquid',
					tradingType: 'perpetual',
				};
			}

			return {
				success: true,
				data: {
					symbol: symbol || 'all',
					message: 'All orders canceled',
				},
				timestamp: Date.now(),
				exchange: 'hyperliquid',
				tradingType: 'perpetual',
			};
		} catch (error: any) {
			this.logger.error(`Error canceling all orders: ${error.message}`);
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
	 * Get open orders
	 */
	async getOpenOrders(symbol?: string): Promise<ApiResponse<Order[]>> {
		try {
			const result = await this.apiService.getOpenOrders();

			if (!result.success || !result.data) {
				return {
					success: false,
					error: 'Failed to get open orders',
					timestamp: Date.now(),
					exchange: 'hyperliquid',
					tradingType: 'perpetual',
				};
			}

			let orders = result.data;

			if (symbol) {
				const coin = this.formatSymbol(symbol);
				orders = orders.filter((o: any) => o.coin === coin);
			}

			const mappedOrders: Order[] = orders.map((order: any) => ({
				orderId: order.oid.toString(),
				symbol: this.formatSymbolResponse(order.coin),
				side: order.side === 'B' ? OrderSide.BUY : OrderSide.SELL,
				type: OrderType.LIMIT,
				status: OrderStatus.NEW,
				price: order.limitPx,
				quantity: order.sz,
				executedQuantity: (parseFloat(order.origSz) - parseFloat(order.sz)).toString(),
				timestamp: order.timestamp,
			}));

			return {
				success: true,
				data: mappedOrders,
				timestamp: Date.now(),
				exchange: 'hyperliquid',
				tradingType: 'perpetual',
			};
		} catch (error: any) {
			this.logger.error(`Error getting open orders: ${error.message}`);
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
	 * Get order details
	 */
	async getOrder(symbol: string, orderId: string): Promise<ApiResponse<Order>> {
		try {
			const openOrders = await this.getOpenOrders(symbol);

			if (!openOrders.success || !openOrders.data) {
				return {
					success: false,
					error: 'Failed to get order',
					timestamp: Date.now(),
					exchange: 'hyperliquid',
					tradingType: 'perpetual',
				};
			}

			const order = openOrders.data.find(o => o.orderId === orderId);

			if (!order) {
				return {
					success: false,
					error: 'Order not found',
					timestamp: Date.now(),
					exchange: 'hyperliquid',
					tradingType: 'perpetual',
				};
			}

			return {
				success: true,
				data: order,
				timestamp: Date.now(),
				exchange: 'hyperliquid',
				tradingType: 'perpetual',
			};
		} catch (error: any) {
			this.logger.error(`Error getting order: ${error.message}`);
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
	 * Quick market buy
	 */
	async marketBuy(symbol: string, quantity: string): Promise<ApiResponse<Order>> {
		return this.placeMarketOrder({
			symbol,
			side: OrderSide.BUY,
			quantity,
		});
	}

	/**
	 * Quick market sell
	 */
	async marketSell(symbol: string, quantity: string): Promise<ApiResponse<Order>> {
		return this.placeMarketOrder({
			symbol,
			side: OrderSide.SELL,
			quantity,
		});
	}

	/**
	 * Quick limit buy
	 */
	async limitBuy(symbol: string, quantity: string, price: string): Promise<ApiResponse<Order>> {
		return this.placeLimitOrder({
			symbol,
			side: OrderSide.BUY,
			quantity,
			price,
		});
	}

	/**
	 * Quick limit sell
	 */
	async limitSell(symbol: string, quantity: string, price: string): Promise<ApiResponse<Order>> {
		return this.placeLimitOrder({
			symbol,
			side: OrderSide.SELL,
			quantity,
			price,
		});
	}

	/**
	 * Get current positions
	 */
	async getPositions(symbol?: string): Promise<ApiResponse<Position | Position[]>> {
		try {
			const result = await this.apiService.getUserState();

			if (!result.success || !result.data?.assetPositions) {
				return {
					success: false,
					error: 'Failed to get positions',
					timestamp: Date.now(),
					exchange: 'hyperliquid',
					tradingType: 'perpetual',
				};
			}

			let positions = result.data.assetPositions;

			if (symbol) {
				const coin = this.formatSymbol(symbol);
				positions = positions.filter((p: any) => p.position.coin === coin);
			}

			const mappedPositions: Position[] = positions
				.filter((p: any) => parseFloat(p.position.szi) !== 0)
				.map((pos: any) => {
					const position = pos.position;
					const posSize = parseFloat(position.szi);

					return {
						symbol: this.formatSymbolResponse(position.coin),
						side: posSize > 0 ? PositionSide.LONG : PositionSide.SHORT,
						size: Math.abs(posSize).toString(),
						entryPrice: position.entryPx,
						markPrice: '0',
						liquidationPrice: position.liquidationPx || '0',
						unrealizedPnl: position.unrealizedPnl,
						leverage: position.leverage.value,
						marginType: position.leverage.type === 'cross' ? 'cross' : 'isolated',
					};
				});

			if (symbol) {
				return {
					success: true,
					data: mappedPositions[0] || null,
					timestamp: Date.now(),
					exchange: 'hyperliquid',
					tradingType: 'perpetual',
				};
			}

			return {
				success: true,
				data: mappedPositions,
				timestamp: Date.now(),
				exchange: 'hyperliquid',
				tradingType: 'perpetual',
			};
		} catch (error: any) {
			this.logger.error(`Error getting positions: ${error.message}`);
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
	 * Set leverage for symbol
	 */
	async setLeverage(params: SetLeverageParams): Promise<ApiResponse<{ leverage: number; symbol: string }>> {
		try {
			const coin = this.formatSymbol(params.symbol);

			// Get current margin type
			const marginTypeResponse = await this.getMarginType(params.symbol);
			const isCross = marginTypeResponse.data === 'CROSSED';

			const result = await this.apiService.updateLeverage(coin, isCross, params.leverage);

			if (!result.success) {
				return {
					success: false,
					error: result.error || 'Failed to set leverage',
					timestamp: Date.now(),
					exchange: 'hyperliquid',
					tradingType: 'perpetual',
				};
			}

			return {
				success: true,
				data: {
					leverage: params.leverage,
					symbol: params.symbol,
				},
				timestamp: Date.now(),
				exchange: 'hyperliquid',
				tradingType: 'perpetual',
			};
		} catch (error: any) {
			this.logger.error(`Error setting leverage: ${error.message}`);
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
	 * Get current leverage for symbol
	 */
	async getLeverage(symbol: string): Promise<ApiResponse<number>> {
		try {
			const positionResponse = await this.getPositions(symbol);

			if (positionResponse.success && positionResponse.data) {
				const position = Array.isArray(positionResponse.data)
					? positionResponse.data[0]
					: positionResponse.data;

				if (!position) {
					// No position, get max leverage from asset info
					const coin = this.formatSymbol(symbol);
					const assetInfo = await this.apiService.getAssetInfo(coin);

					return {
						success: true,
						data: assetInfo.maxLeverage,
						timestamp: Date.now(),
						exchange: 'hyperliquid',
						tradingType: 'perpetual',
					};
				}

				return {
					success: true,
					data: position.leverage || 1,
					timestamp: Date.now(),
					exchange: 'hyperliquid',
					tradingType: 'perpetual',
				};
			}

			return {
				success: false,
				error: 'Failed to get leverage',
				timestamp: Date.now(),
				exchange: 'hyperliquid',
				tradingType: 'perpetual',
			};
		} catch (error: any) {
			this.logger.error(`Error getting leverage: ${error.message}`);
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
	 * Set margin type (ISOLATED or CROSSED)
	 */
	async setMarginType(params: SetMarginTypeParams): Promise<ApiResponse<any>> {
		try {
			const coin = this.formatSymbol(params.symbol);

			// Get current leverage
			const leverageResponse = await this.getLeverage(params.symbol);
			const currentLeverage = leverageResponse.data || 1;

			const isCross = params.marginType === 'CROSSED';

			const result = await this.apiService.updateLeverage(coin, isCross, currentLeverage);

			if (!result.success) {
				return {
					success: false,
					error: result.error || 'Failed to set margin type',
					timestamp: Date.now(),
					exchange: 'hyperliquid',
					tradingType: 'perpetual',
				};
			}

			return {
				success: true,
				data: {
					symbol: params.symbol,
					marginType: params.marginType,
				},
				timestamp: Date.now(),
				exchange: 'hyperliquid',
				tradingType: 'perpetual',
			};
		} catch (error: any) {
			this.logger.error(`Error setting margin type: ${error.message}`);
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
	 * Get current margin type
	 */
	async getMarginType(symbol: string): Promise<ApiResponse<'ISOLATED' | 'CROSSED'>> {
		try {
			const positionResponse = await this.getPositions(symbol);

			if (positionResponse.success && positionResponse.data) {
				const position = Array.isArray(positionResponse.data)
					? positionResponse.data[0]
					: positionResponse.data;

				if (!position) {
					return {
						success: true,
						data: 'CROSSED',
						timestamp: Date.now(),
						exchange: 'hyperliquid',
						tradingType: 'perpetual',
					};
				}

				return {
					success: true,
					data: position.marginType === 'isolated' ? 'ISOLATED' : 'CROSSED',
					timestamp: Date.now(),
					exchange: 'hyperliquid',
					tradingType: 'perpetual',
				};
			}

			return {
				success: false,
				error: 'Failed to get margin type',
				timestamp: Date.now(),
				exchange: 'hyperliquid',
				tradingType: 'perpetual',
			};
		} catch (error: any) {
			this.logger.error(`Error getting margin type: ${error.message}`);
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
	 * Set position mode (one-way or hedge mode)
	 * Note: Hyperliquid only supports one-way mode
	 */
	async setPositionMode(params: SetPositionModeParams): Promise<ApiResponse<any>> {
		if (params.dualSidePosition) {
			this.logger.warn('Hyperliquid does not support hedge mode, using one-way mode');
		}

		return {
			success: true,
			data: {
				dualSidePosition: false,
				message: 'Hyperliquid uses one-way position mode',
			},
			timestamp: Date.now(),
			exchange: 'hyperliquid',
			tradingType: 'perpetual',
		};
	}

	/**
	 * Get current position mode
	 */
	async getPositionMode(): Promise<ApiResponse<{ dualSidePosition: boolean }>> {
		return {
			success: true,
			data: {
				dualSidePosition: false,
			},
			timestamp: Date.now(),
			exchange: 'hyperliquid',
			tradingType: 'perpetual',
		};
	}

	/**
	 * Modify position margin (add or reduce)
	 */
	async modifyPositionMargin(params: ModifyPositionMarginParams): Promise<ApiResponse<any>> {
		try {
			const coin = this.formatSymbol(params.symbol);

			// Get current position to determine side
			const positionsResponse = await this.getPositions(params.symbol);

			if (!positionsResponse.success || !positionsResponse.data) {
				return {
					success: false,
					error: 'No position found for this symbol',
					timestamp: Date.now(),
					exchange: 'hyperliquid',
					tradingType: 'perpetual',
				};
			}

			const position = Array.isArray(positionsResponse.data)
				? positionsResponse.data[0]
				: positionsResponse.data;

			if (!position) {
				return {
					success: false,
					error: 'No position found for this symbol',
					timestamp: Date.now(),
					exchange: 'hyperliquid',
					tradingType: 'perpetual',
				};
			}

			const isBuy = position.side === PositionSide.LONG;
			const amount = parseFloat(params.amount);
			const ntli = params.type === 1 ? amount : -amount;

			const result = await this.apiService.updateIsolatedMargin(coin, isBuy, ntli);

			if (!result.success) {
				return {
					success: false,
					error: result.error || 'Failed to modify position margin',
					timestamp: Date.now(),
					exchange: 'hyperliquid',
					tradingType: 'perpetual',
				};
			}

			return {
				success: true,
				data: {
					symbol: params.symbol,
					amount: params.amount,
					type: params.type,
				},
				timestamp: Date.now(),
				exchange: 'hyperliquid',
				tradingType: 'perpetual',
			};
		} catch (error: any) {
			this.logger.error(`Error modifying position margin: ${error.message}`);
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
	 * Set stop loss for position
	 */
	async setStopLoss(params: SetStopLossParams): Promise<ApiResponse<Order>> {
		try {
			const coin = this.formatSymbol(params.symbol);

			// Determine side based on current position or params
			let isBuy: boolean;
			if (params.side) {
				isBuy = params.side === 'BUY';
			} else {
				// Get position to determine side
				const positionsResponse = await this.getPositions(params.symbol);
				if (!positionsResponse.success || !positionsResponse.data) {
					return {
						success: false,
						error: 'No position found to set stop loss',
						timestamp: Date.now(),
						exchange: 'hyperliquid',
						tradingType: 'perpetual',
					};
				}

				const position = Array.isArray(positionsResponse.data)
					? positionsResponse.data[0]
					: positionsResponse.data;

				// Stop loss is opposite of position: if long, stop loss is sell
				isBuy = position.side === PositionSide.SHORT;
			}

			const stopPrice = parseFloat(params.stopPrice);
			const quantity = params.quantity ? parseFloat(params.quantity) : undefined;

			const orderRequest: any = {
				coin,
				is_buy: isBuy,
				sz: quantity,
				limit_px: stopPrice.toFixed(2),
				order_type: {
					trigger: {
						isMarket: true,
						triggerPx: stopPrice,
						tpsl: 'sl',
					},
				},
				reduce_only: true,
			};

			const result = await this.apiService.placeOrder(orderRequest);

			if (!result.success) {
				return {
					success: false,
					error: result.error || 'Failed to set stop loss',
					timestamp: Date.now(),
					exchange: 'hyperliquid',
					tradingType: 'perpetual',
				};
			}

			const order: Order = {
				orderId: result.data?.response?.data?.statuses?.[0]?.resting?.oid?.toString() || 'unknown',
				symbol: params.symbol,
				side: isBuy ? OrderSide.BUY : OrderSide.SELL,
				type: OrderType.STOP_MARKET,
				status: OrderStatus.NEW,
				price: params.stopPrice,
				quantity: params.quantity || '0',
				executedQuantity: '0',
				timestamp: Date.now(),
			};

			return {
				success: true,
				data: order,
				timestamp: Date.now(),
				exchange: 'hyperliquid',
				tradingType: 'perpetual',
			};
		} catch (error: any) {
			this.logger.error(`Error setting stop loss: ${error.message}`);
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
	 * Set take profit for position
	 */
	async setTakeProfit(params: SetTakeProfitParams): Promise<ApiResponse<Order>> {
		try {
			const coin = this.formatSymbol(params.symbol);

			// Determine side based on current position or params
			let isBuy: boolean;
			if (params.side) {
				isBuy = params.side === 'BUY';
			} else {
				// Get position to determine side
				const positionsResponse = await this.getPositions(params.symbol);
				if (!positionsResponse.success || !positionsResponse.data) {
					return {
						success: false,
						error: 'No position found to set take profit',
						timestamp: Date.now(),
						exchange: 'hyperliquid',
						tradingType: 'perpetual',
					};
				}

				const position = Array.isArray(positionsResponse.data)
					? positionsResponse.data[0]
					: positionsResponse.data;

				// Take profit is opposite of position: if long, take profit is sell
				isBuy = position.side === PositionSide.SHORT;
			}

			const takeProfitPrice = parseFloat(params.takeProfitPrice);
			const quantity = params.quantity ? parseFloat(params.quantity) : undefined;

			const orderRequest: any = {
				coin,
				is_buy: isBuy,
				sz: quantity,
				limit_px: takeProfitPrice.toFixed(2),
				order_type: {
					trigger: {
						isMarket: true,
						triggerPx: takeProfitPrice,
						tpsl: 'tp',
					},
				},
				reduce_only: true,
			};

			const result = await this.apiService.placeOrder(orderRequest);

			if (!result.success) {
				return {
					success: false,
					error: result.error || 'Failed to set take profit',
					timestamp: Date.now(),
					exchange: 'hyperliquid',
					tradingType: 'perpetual',
				};
			}

			const order: Order = {
				orderId: result.data?.response?.data?.statuses?.[0]?.resting?.oid?.toString() || 'unknown',
				symbol: params.symbol,
				side: isBuy ? OrderSide.BUY : OrderSide.SELL,
				type: OrderType.TAKE_PROFIT_MARKET,
				status: OrderStatus.NEW,
				price: params.takeProfitPrice,
				quantity: params.quantity || '0',
				executedQuantity: '0',
				timestamp: Date.now(),
			};

			return {
				success: true,
				data: order,
				timestamp: Date.now(),
				exchange: 'hyperliquid',
				tradingType: 'perpetual',
			};
		} catch (error: any) {
			this.logger.error(`Error setting take profit: ${error.message}`);
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
	 * Cancel all conditional orders (stop loss / take profit)
	 */
	async cancelAllConditionalOrders(symbol: string): Promise<ApiResponse<any>> {
		return this.cancelAllOrders(symbol);
	}

	/**
	 * Get funding rate
	 */
	async getFundingRate(symbol?: string): Promise<ApiResponse<any>> {
		try {
			if (!symbol) {
				return {
					success: false,
					error: 'Symbol is required for Hyperliquid funding rate',
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
					estimatedRate: latest.fundingRate,
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
	 * Get funding history
	 */
	async getFundingHistory(
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
					error: 'Failed to get funding history',
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
				data: history,
				timestamp: Date.now(),
				exchange: 'hyperliquid',
				tradingType: 'perpetual',
			};
		} catch (error: any) {
			this.logger.error(`Error getting funding history: ${error.message}`);
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
	 * Get position risk (margin ratio, liquidation price, etc.)
	 */
	async getPositionRisk(symbol?: string): Promise<ApiResponse<any>> {
		try {
			const positionsResponse = await this.getPositions(symbol);

			if (!positionsResponse.success) {
				return positionsResponse;
			}

			const positions = Array.isArray(positionsResponse.data)
				? positionsResponse.data
				: [positionsResponse.data].filter(Boolean);

			const risks = positions.map((pos) => ({
				symbol: pos.symbol,
				positionAmt: pos.size,
				entryPrice: pos.entryPrice,
				markPrice: pos.markPrice,
				unRealizedProfit: pos.unrealizedPnl,
				liquidationPrice: pos.liquidationPrice,
				leverage: pos.leverage?.toString() || '1',
				marginType: pos.marginType,
				positionSide: pos.side,
			}));

			return {
				success: true,
				data: symbol ? risks[0] : risks,
				timestamp: Date.now(),
				exchange: 'hyperliquid',
				tradingType: 'perpetual',
			};
		} catch (error: any) {
			this.logger.error(`Error getting position risk: ${error.message}`);
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
	 * Open long position with market order
	 */
	async openLong(symbol: string, quantity: string): Promise<ApiResponse<Order>> {
		return this.placeMarketOrder({
			symbol,
			side: OrderSide.BUY,
			quantity,
		});
	}

	/**
	 * Open short position with market order
	 */
	async openShort(symbol: string, quantity: string): Promise<ApiResponse<Order>> {
		return this.placeMarketOrder({
			symbol,
			side: OrderSide.SELL,
			quantity,
		});
	}

	/**
	 * Close long position
	 */
	async closeLong(symbol: string, quantity?: string): Promise<ApiResponse<Order>> {
		try {
			const positionsResponse = await this.getPositions(symbol);

			if (!positionsResponse.success || !positionsResponse.data) {
				return {
					success: false,
					error: 'No long position found',
					timestamp: Date.now(),
					exchange: 'hyperliquid',
					tradingType: 'perpetual',
				};
			}

			const position = Array.isArray(positionsResponse.data)
				? positionsResponse.data[0]
				: positionsResponse.data;

			if (!position || position.side !== PositionSide.LONG) {
				return {
					success: false,
					error: 'No long position found',
					timestamp: Date.now(),
					exchange: 'hyperliquid',
					tradingType: 'perpetual',
				};
			}

			const closeQty = quantity || position.size;

			return this.placeMarketOrder({
				symbol,
				side: OrderSide.SELL,
				quantity: closeQty,
				reduceOnly: true,
			});
		} catch (error: any) {
			this.logger.error(`Error closing long: ${error.message}`);
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
	 * Close short position
	 */
	async closeShort(symbol: string, quantity?: string): Promise<ApiResponse<Order>> {
		try {
			const positionsResponse = await this.getPositions(symbol);

			if (!positionsResponse.success || !positionsResponse.data) {
				return {
					success: false,
					error: 'No short position found',
					timestamp: Date.now(),
					exchange: 'hyperliquid',
					tradingType: 'perpetual',
				};
			}

			const position = Array.isArray(positionsResponse.data)
				? positionsResponse.data[0]
				: positionsResponse.data;

			if (!position || position.side !== PositionSide.SHORT) {
				return {
					success: false,
					error: 'No short position found',
					timestamp: Date.now(),
					exchange: 'hyperliquid',
					tradingType: 'perpetual',
				};
			}

			const closeQty = quantity || position.size;

			return this.placeMarketOrder({
				symbol,
				side: OrderSide.BUY,
				quantity: closeQty,
				reduceOnly: true,
			});
		} catch (error: any) {
			this.logger.error(`Error closing short: ${error.message}`);
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
	 * Close position (market order)
	 */
	async closePosition(symbol: string, positionSide?: PositionSide): Promise<ApiResponse<Order>> {
		try {
			const positionsResponse = await this.getPositions(symbol);

			if (!positionsResponse.success || !positionsResponse.data) {
				return {
					success: false,
					error: 'No position found',
					timestamp: Date.now(),
					exchange: 'hyperliquid',
					tradingType: 'perpetual',
				};
			}

			const position = Array.isArray(positionsResponse.data)
				? positionsResponse.data[0]
				: positionsResponse.data;

			if (!position) {
				return {
					success: false,
					error: 'No position found',
					timestamp: Date.now(),
					exchange: 'hyperliquid',
					tradingType: 'perpetual',
				};
			}

			// Check position side if specified
			if (positionSide && position.side !== positionSide) {
				return {
					success: false,
					error: `No ${positionSide} position found`,
					timestamp: Date.now(),
					exchange: 'hyperliquid',
					tradingType: 'perpetual',
				};
			}

			const side = position.side === PositionSide.LONG ? OrderSide.SELL : OrderSide.BUY;

			return this.placeMarketOrder({
				symbol,
				side,
				quantity: position.size,
				reduceOnly: true,
			});
		} catch (error: any) {
			this.logger.error(`Error closing position: ${error.message}`);
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
	 * Close all positions
	 */
	async closeAllPositions(): Promise<ApiResponse<Order[]>> {
		try {
			const positionsResponse = await this.getPositions();

			if (!positionsResponse.success || !positionsResponse.data) {
				return {
					success: false,
					error: 'No positions to close',
					timestamp: Date.now(),
					exchange: 'hyperliquid',
					tradingType: 'perpetual',
				};
			}

			const positions = Array.isArray(positionsResponse.data)
				? positionsResponse.data
				: [positionsResponse.data];

			if (positions.length === 0) {
				return {
					success: true,
					data: [],
					timestamp: Date.now(),
					exchange: 'hyperliquid',
					tradingType: 'perpetual',
				};
			}

			const results = await Promise.all(
				positions.map(async (pos) => {
					try {
						const side = pos.side === PositionSide.LONG ? OrderSide.SELL : OrderSide.BUY;

						const orderResponse = await this.placeMarketOrder({
							symbol: pos.symbol,
							side,
							quantity: pos.size,
							reduceOnly: true,
						});

						return orderResponse.data!;
					} catch (error: any) {
						this.logger.error(`Failed to close position for ${pos.symbol}: ${error.message}`);
						throw error;
					}
				})
			);

			return {
				success: true,
				data: results,
				timestamp: Date.now(),
				exchange: 'hyperliquid',
				tradingType: 'perpetual',
			};
		} catch (error: any) {
			this.logger.error(`Error closing all positions: ${error.message}`);
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
