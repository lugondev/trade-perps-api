import { Get, Post, Delete, Body, Query, Param, Logger } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
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
} from '../interfaces';
import {
	PlaceOrderDto,
	MarketOrderDto,
	LimitOrderDto,
	CancelOrderDto,
	QuickTradeDto,
	QuickLongShortDto,
	SetLeverageDto,
	SetMarginTypeDto,
	SetPositionModeDto,
	ModifyPositionMarginDto,
	SetStopLossDto,
	SetTakeProfitDto,
	ClosePositionDto,
	OpenPositionDto,
} from '../dto';

/**
 * Base Futures Trading Controller
 * All exchange-specific futures trading controllers should extend this
 */
export abstract class BaseFuturesTradingController {
	protected abstract readonly logger: Logger;
	protected abstract readonly tradingService: IFuturesTradingService;

	// ==================== Order Management ====================

	@Post('orders/market')
	@ApiOperation({ summary: 'Place a market order' })
	@ApiResponse({ status: 201, description: 'Market order placed successfully' })
	async placeMarketOrder(@Body() dto: MarketOrderDto) {
		const params: MarketOrderParams = {
			symbol: dto.symbol,
			side: dto.side,
			quantity: dto.quantity,
			clientOrderId: dto.clientOrderId,
			reduceOnly: dto.reduceOnly,
		};
		return this.tradingService.placeMarketOrder(params);
	}

	@Post('orders/limit')
	@ApiOperation({ summary: 'Place a limit order' })
	@ApiResponse({ status: 201, description: 'Limit order placed successfully' })
	async placeLimitOrder(@Body() dto: LimitOrderDto) {
		const params: LimitOrderParams = {
			symbol: dto.symbol,
			side: dto.side,
			quantity: dto.quantity,
			price: dto.price,
			timeInForce: dto.timeInForce,
			clientOrderId: dto.clientOrderId,
			reduceOnly: dto.reduceOnly,
		};
		return this.tradingService.placeLimitOrder(params);
	}

	@Post('orders')
	@ApiOperation({ summary: 'Place any type of order' })
	@ApiResponse({ status: 201, description: 'Order placed successfully' })
	async placeOrder(@Body() dto: PlaceOrderDto) {
		const params: PlaceOrderParams = {
			symbol: dto.symbol,
			side: dto.side,
			type: dto.type,
			quantity: dto.quantity,
			price: dto.price,
			timeInForce: dto.timeInForce,
			clientOrderId: dto.clientOrderId,
			stopPrice: dto.stopPrice,
			reduceOnly: dto.reduceOnly,
		};
		return this.tradingService.placeOrder(params);
	}

	@Delete('orders')
	@ApiOperation({ summary: 'Cancel an order' })
	@ApiResponse({ status: 200, description: 'Order cancelled successfully' })
	async cancelOrder(@Body() dto: CancelOrderDto) {
		const params: CancelOrderParams = {
			symbol: dto.symbol,
			orderId: dto.orderId,
			clientOrderId: dto.clientOrderId,
		};
		return this.tradingService.cancelOrder(params);
	}

	@Delete('orders/all')
	@ApiOperation({ summary: 'Cancel all orders' })
	@ApiQuery({ name: 'symbol', required: false, description: 'Trading symbol' })
	@ApiResponse({ status: 200, description: 'All orders cancelled successfully' })
	async cancelAllOrders(@Query('symbol') symbol?: string) {
		return this.tradingService.cancelAllOrders(symbol);
	}

	@Get('orders/open')
	@ApiOperation({ summary: 'Get open orders' })
	@ApiQuery({ name: 'symbol', required: false, description: 'Trading symbol' })
	@ApiResponse({ status: 200, description: 'Open orders retrieved successfully' })
	async getOpenOrders(@Query('symbol') symbol?: string) {
		return this.tradingService.getOpenOrders(symbol);
	}

	@Get('orders/:symbol/:orderId')
	@ApiOperation({ summary: 'Get order details' })
	@ApiParam({ name: 'symbol', description: 'Trading symbol' })
	@ApiParam({ name: 'orderId', description: 'Order ID' })
	@ApiResponse({ status: 200, description: 'Order details retrieved successfully' })
	async getOrder(@Param('symbol') symbol: string, @Param('orderId') orderId: string) {
		return this.tradingService.getOrder(symbol, orderId);
	}

	// ==================== Quick Trading ====================

	@Post('market-buy')
	@ApiOperation({ summary: 'Quick market buy' })
	@ApiResponse({ status: 201, description: 'Market buy executed' })
	async marketBuy(@Body() dto: QuickTradeDto) {
		return this.tradingService.marketBuy(dto.symbol, dto.quantity);
	}

	@Post('market-sell')
	@ApiOperation({ summary: 'Quick market sell' })
	@ApiResponse({ status: 201, description: 'Market sell executed' })
	async marketSell(@Body() dto: QuickTradeDto) {
		return this.tradingService.marketSell(dto.symbol, dto.quantity);
	}

	@Post('limit-buy')
	@ApiOperation({ summary: 'Quick limit buy' })
	@ApiResponse({ status: 201, description: 'Limit buy placed' })
	async limitBuy(@Body() dto: QuickTradeDto) {
		if (!dto.price) {
			return { success: false, error: 'Price is required for limit orders', timestamp: Date.now() };
		}
		return this.tradingService.limitBuy(dto.symbol, dto.quantity, dto.price);
	}

	@Post('limit-sell')
	@ApiOperation({ summary: 'Quick limit sell' })
	@ApiResponse({ status: 201, description: 'Limit sell placed' })
	async limitSell(@Body() dto: QuickTradeDto) {
		if (!dto.price) {
			return { success: false, error: 'Price is required for limit orders', timestamp: Date.now() };
		}
		return this.tradingService.limitSell(dto.symbol, dto.quantity, dto.price);
	}

	// ==================== Position Management ====================

	@Get('positions')
	@ApiOperation({ summary: 'Get positions' })
	@ApiQuery({ name: 'symbol', required: false, description: 'Trading symbol' })
	@ApiResponse({ status: 200, description: 'Positions retrieved successfully' })
	async getPositions(@Query('symbol') symbol?: string) {
		return this.tradingService.getPositions(symbol);
	}

	@Post('positions/open-long')
	@ApiOperation({ summary: 'Open long position' })
	@ApiResponse({ status: 201, description: 'Long position opened' })
	async openLong(@Body() dto: OpenPositionDto) {
		return this.tradingService.openLong(dto.symbol, dto.quantity);
	}

	@Post('positions/open-short')
	@ApiOperation({ summary: 'Open short position' })
	@ApiResponse({ status: 201, description: 'Short position opened' })
	async openShort(@Body() dto: OpenPositionDto) {
		return this.tradingService.openShort(dto.symbol, dto.quantity);
	}

	@Post('positions/close')
	@ApiOperation({ summary: 'Close position' })
	@ApiResponse({ status: 200, description: 'Position closed successfully' })
	async closePosition(@Body() dto: ClosePositionDto) {
		return this.tradingService.closePosition(dto.symbol, dto.positionSide);
	}

	@Post('positions/close-long')
	@ApiOperation({ summary: 'Close long position' })
	@ApiResponse({ status: 200, description: 'Long position closed' })
	async closeLong(@Body() dto: ClosePositionDto) {
		return this.tradingService.closeLong(dto.symbol, dto.quantity);
	}

	@Post('positions/close-short')
	@ApiOperation({ summary: 'Close short position' })
	@ApiResponse({ status: 200, description: 'Short position closed' })
	async closeShort(@Body() dto: ClosePositionDto) {
		return this.tradingService.closeShort(dto.symbol, dto.quantity);
	}

	@Post('positions/close-all')
	@ApiOperation({ summary: 'Close all positions' })
	@ApiResponse({ status: 200, description: 'All positions closed successfully' })
	async closeAllPositions() {
		return this.tradingService.closeAllPositions();
	}

	// ==================== Leverage & Margin ====================

	@Post('leverage')
	@ApiOperation({ summary: 'Set leverage' })
	@ApiResponse({ status: 200, description: 'Leverage set successfully' })
	async setLeverage(@Body() dto: SetLeverageDto) {
		const params: SetLeverageParams = {
			symbol: dto.symbol,
			leverage: dto.leverage,
		};
		return this.tradingService.setLeverage(params);
	}

	@Get('leverage/:symbol')
	@ApiOperation({ summary: 'Get leverage' })
	@ApiParam({ name: 'symbol', description: 'Trading symbol' })
	@ApiResponse({ status: 200, description: 'Leverage retrieved successfully' })
	async getLeverage(@Param('symbol') symbol: string) {
		return this.tradingService.getLeverage(symbol);
	}

	@Post('margin-type')
	@ApiOperation({ summary: 'Set margin type' })
	@ApiResponse({ status: 200, description: 'Margin type set successfully' })
	async setMarginType(@Body() dto: SetMarginTypeDto) {
		const params: SetMarginTypeParams = {
			symbol: dto.symbol,
			marginType: dto.marginType,
		};
		return this.tradingService.setMarginType(params);
	}

	@Get('margin-type/:symbol')
	@ApiOperation({ summary: 'Get margin type' })
	@ApiParam({ name: 'symbol', description: 'Trading symbol' })
	@ApiResponse({ status: 200, description: 'Margin type retrieved successfully' })
	async getMarginType(@Param('symbol') symbol: string) {
		return this.tradingService.getMarginType(symbol);
	}

	@Post('position-mode')
	@ApiOperation({ summary: 'Set position mode (one-way or hedge)' })
	@ApiResponse({ status: 200, description: 'Position mode set successfully' })
	async setPositionMode(@Body() dto: SetPositionModeDto) {
		const params: SetPositionModeParams = {
			dualSidePosition: dto.dualSidePosition,
		};
		return this.tradingService.setPositionMode(params);
	}

	@Get('position-mode')
	@ApiOperation({ summary: 'Get position mode' })
	@ApiResponse({ status: 200, description: 'Position mode retrieved successfully' })
	async getPositionMode() {
		return this.tradingService.getPositionMode();
	}

	@Post('position-margin')
	@ApiOperation({ summary: 'Modify position margin' })
	@ApiResponse({ status: 200, description: 'Position margin modified successfully' })
	async modifyPositionMargin(@Body() dto: ModifyPositionMarginDto) {
		const params: ModifyPositionMarginParams = {
			symbol: dto.symbol,
			amount: dto.amount,
			type: dto.type,
			positionSide: dto.positionSide,
		};
		return this.tradingService.modifyPositionMargin(params);
	}

	// ==================== Risk Management ====================

	@Post('stop-loss')
	@ApiOperation({ summary: 'Set stop loss' })
	@ApiResponse({ status: 201, description: 'Stop loss set successfully' })
	async setStopLoss(@Body() dto: SetStopLossDto) {
		const params: SetStopLossParams = {
			symbol: dto.symbol,
			stopPrice: dto.stopPrice,
			quantity: dto.quantity,
			side: dto.side,
		};
		return this.tradingService.setStopLoss(params);
	}

	@Post('take-profit')
	@ApiOperation({ summary: 'Set take profit' })
	@ApiResponse({ status: 201, description: 'Take profit set successfully' })
	async setTakeProfit(@Body() dto: SetTakeProfitDto) {
		const params: SetTakeProfitParams = {
			symbol: dto.symbol,
			takeProfitPrice: dto.takeProfitPrice,
			quantity: dto.quantity,
			side: dto.side,
		};
		return this.tradingService.setTakeProfit(params);
	}

	@Delete('conditional-orders/:symbol')
	@ApiOperation({ summary: 'Cancel all conditional orders (SL/TP)' })
	@ApiParam({ name: 'symbol', description: 'Trading symbol' })
	@ApiResponse({ status: 200, description: 'Conditional orders cancelled' })
	async cancelAllConditionalOrders(@Param('symbol') symbol: string) {
		return this.tradingService.cancelAllConditionalOrders(symbol);
	}

	@Get('funding-rate')
	@ApiOperation({ summary: 'Get funding rate' })
	@ApiQuery({ name: 'symbol', required: false, description: 'Trading symbol' })
	@ApiResponse({ status: 200, description: 'Funding rate retrieved successfully' })
	async getFundingRate(@Query('symbol') symbol?: string) {
		return this.tradingService.getFundingRate(symbol);
	}

	@Get('funding-history/:symbol')
	@ApiOperation({ summary: 'Get funding history' })
	@ApiParam({ name: 'symbol', description: 'Trading symbol' })
	@ApiQuery({ name: 'startTime', required: false })
	@ApiQuery({ name: 'endTime', required: false })
	@ApiQuery({ name: 'limit', required: false })
	@ApiResponse({ status: 200, description: 'Funding history retrieved successfully' })
	async getFundingHistory(
		@Param('symbol') symbol: string,
		@Query('startTime') startTime?: string,
		@Query('endTime') endTime?: string,
		@Query('limit') limit?: string,
	) {
		const parsedStartTime = startTime ? parseInt(startTime) : undefined;
		const parsedEndTime = endTime ? parseInt(endTime) : undefined;
		const parsedLimit = limit ? parseInt(limit) : undefined;
		return this.tradingService.getFundingHistory(symbol, parsedStartTime, parsedEndTime, parsedLimit);
	}

	@Get('position-risk')
	@ApiOperation({ summary: 'Get position risk' })
	@ApiQuery({ name: 'symbol', required: false, description: 'Trading symbol' })
	@ApiResponse({ status: 200, description: 'Position risk retrieved successfully' })
	async getPositionRisk(@Query('symbol') symbol?: string) {
		return this.tradingService.getPositionRisk(symbol);
	}
}
