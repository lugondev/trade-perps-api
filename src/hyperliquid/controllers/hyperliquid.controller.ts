import {
	Controller,
	Get,
	Post,
	Delete,
	Body,
	Query,
	Param,
	Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody, ApiParam } from '@nestjs/swagger';
import { HyperliquidApiService } from '../services/hyperliquid-api.service';
import { BalanceService } from '../services/balance.service';
import { TradingService } from '../services/trading.service';
import { MarketDataService } from '../services/market-data.service';
import { HistoryService } from '../services/history.service';
import { ApiKeyAuth } from '../../common/decorators/api-key.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('hyperliquid')
@ApiKeyAuth()
@Controller('hyperliquid')
export class HyperliquidController {
	private readonly logger = new Logger(HyperliquidController.name);

	constructor(
		private readonly hyperliquidApiService: HyperliquidApiService,
		private readonly balanceService: BalanceService,
		private readonly tradingService: TradingService,
		private readonly marketDataService: MarketDataService,
		private readonly historyService: HistoryService,
	) { }

	// ==================== Debug Endpoint ====================

	@Get('debug/credentials')
	@ApiOperation({ summary: 'Debug credentials configuration (development only)' })
	@ApiResponse({ status: 200, description: 'Credentials debug info' })
	async debugCredentials() {
		return this.hyperliquidApiService.debugCredentials();
	}

	// ==================== Balance Endpoints ====================

	@Get('balance')
	@ApiOperation({ summary: 'Get account balance and positions' })
	@ApiQuery({ name: 'user', description: 'User address (optional)', required: false })
	@ApiResponse({ status: 200, description: 'Balance retrieved successfully' })
	async getBalance(@Query('user') user?: string) {
		return this.balanceService.getBalance(user);
	}

	@Get('portfolio')
	@ApiOperation({ summary: 'Get portfolio summary' })
	@ApiQuery({ name: 'user', description: 'User address (optional)', required: false })
	@ApiResponse({ status: 200, description: 'Portfolio summary retrieved successfully' })
	async getPortfolio(@Query('user') user?: string) {
		return this.balanceService.getPortfolioSummary(user);
	}

	@Get('portfolio/value')
	@ApiOperation({ summary: 'Get total portfolio value' })
	@ApiQuery({ name: 'user', description: 'User address (optional)', required: false })
	@ApiResponse({ status: 200, description: 'Portfolio value retrieved successfully' })
	async getPortfolioValue(@Query('user') user?: string) {
		const portfolio = await this.balanceService.getPortfolioSummary(user);
		if (portfolio.success && portfolio.data) {
			return {
				success: true,
				data: {
					accountValue: portfolio.data.accountValue,
					totalMarginUsed: portfolio.data.totalMarginUsed,
					withdrawable: portfolio.data.withdrawable,
					totalUnrealizedPnl: portfolio.data.totalUnrealizedPnl,
				},
				timestamp: Date.now(),
			};
		}
		return portfolio;
	}

	@Get('positions')
	@ApiOperation({ summary: 'Get all open positions' })
	@ApiQuery({ name: 'user', description: 'User address (optional)', required: false })
	@ApiResponse({ status: 200, description: 'Positions retrieved successfully' })
	async getPositions(@Query('user') user?: string) {
		return this.balanceService.getPositions(user);
	}

	@Get('positions/non-zero')
	@ApiOperation({ summary: 'Get non-zero positions only' })
	@ApiQuery({ name: 'user', description: 'User address (optional)', required: false })
	@ApiResponse({ status: 200, description: 'Non-zero positions retrieved successfully' })
	async getNonZeroPositions(@Query('user') user?: string) {
		const result = await this.balanceService.getPositions(user);
		if (result.success && result.data) {
			const nonZeroPositions = result.data.filter(pos => parseFloat(pos.szi) !== 0);
			return { ...result, data: nonZeroPositions };
		}
		return result;
	}

	@Get('position/:coin')
	@ApiOperation({ summary: 'Get position for specific coin' })
	@ApiParam({ name: 'coin', description: 'Coin symbol (e.g., BTC, ETH)' })
	@ApiQuery({ name: 'user', description: 'User address (optional)', required: false })
	@ApiResponse({ status: 200, description: 'Position retrieved successfully' })
	async getPosition(@Param('coin') coin: string, @Query('user') user?: string) {
		return this.balanceService.getPosition(coin, user);
	}

	// ==================== Trading Endpoints ====================

	@Post('orders')
	@ApiOperation({ summary: 'Place a new order' })
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				coin: { type: 'string', example: 'BTC', description: 'Coin symbol' },
				isBuy: { type: 'boolean', example: true, description: 'True for buy, false for sell' },
				size: { type: 'number', example: 0.01, description: 'Order size' },
				limitPrice: { type: 'number', example: 50000, description: 'Limit price (optional for market orders)' },
				orderType: { type: 'string', enum: ['market', 'limit'], example: 'limit' },
				timeInForce: { type: 'string', enum: ['Gtc', 'Ioc', 'Alo'], example: 'Gtc' },
				reduceOnly: { type: 'boolean', example: false },
				cloid: { type: 'string', description: 'Client order ID (optional)' },
			},
			required: ['coin', 'isBuy', 'size', 'orderType'],
		},
	})
	@ApiResponse({ status: 201, description: 'Order placed successfully' })
	async placeOrder(@Body() orderRequest: any) {
		if (orderRequest.orderType === 'market') {
			return this.tradingService.placeMarketOrder(
				orderRequest.coin,
				orderRequest.isBuy,
				orderRequest.size,
				orderRequest.reduceOnly,
			);
		} else {
			return this.tradingService.placeLimitOrder(
				orderRequest.coin,
				orderRequest.isBuy,
				orderRequest.size,
				orderRequest.limitPrice,
				orderRequest.timeInForce || 'Gtc',
				orderRequest.reduceOnly,
			);
		}
	}

	@Post('orders/market')
	@ApiOperation({ summary: 'Place a market order' })
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				coin: { type: 'string', example: 'BTC' },
				isBuy: { type: 'boolean', example: true },
				size: { type: 'number', example: 0.01 },
				reduceOnly: { type: 'boolean', example: false },
			},
			required: ['coin', 'isBuy', 'size'],
		},
	})
	@ApiResponse({ status: 200, description: 'Market order placed successfully' })
	async placeMarketOrder(@Body() body: { coin: string; isBuy: boolean; size: number; reduceOnly?: boolean }) {
		return this.tradingService.placeMarketOrder(body.coin, body.isBuy, body.size, body.reduceOnly);
	}

	@Post('orders/limit')
	@ApiOperation({ summary: 'Place a limit order' })
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				coin: { type: 'string', example: 'BTC' },
				isBuy: { type: 'boolean', example: true },
				size: { type: 'number', example: 0.01 },
				limitPrice: { type: 'number', example: 50000 },
				timeInForce: { type: 'string', enum: ['Gtc', 'Ioc', 'Alo'], example: 'Gtc' },
				reduceOnly: { type: 'boolean', example: false },
				cloid: { type: 'string', description: 'Client order ID (optional)' },
			},
			required: ['coin', 'isBuy', 'size', 'limitPrice'],
		},
	})
	@ApiResponse({ status: 200, description: 'Limit order placed successfully' })
	async placeLimitOrder(@Body() body: {
		coin: string;
		isBuy: boolean;
		size: number;
		limitPrice: number;
		timeInForce?: 'Gtc' | 'Ioc' | 'Alo';
		reduceOnly?: boolean;
		cloid?: string;
	}) {
		return this.tradingService.placeLimitOrder(
			body.coin,
			body.isBuy,
			body.size,
			body.limitPrice,
			body.timeInForce || 'Gtc',
			body.reduceOnly,
		);
	}

	@Get('orders/open')
	@ApiOperation({ summary: 'Get all open orders' })
	@ApiQuery({ name: 'user', description: 'User address (optional)', required: false })
	@ApiResponse({ status: 200, description: 'Open orders retrieved successfully' })
	async getOpenOrders(@Query('user') user?: string) {
		return this.tradingService.getOpenOrders(user);
	}

	@Delete('orders/:orderId')
	@ApiOperation({ summary: 'Cancel an order by order ID' })
	@ApiParam({ name: 'orderId', description: 'Order ID to cancel' })
	@ApiQuery({ name: 'coin', required: true, description: 'Coin symbol' })
	@ApiResponse({ status: 200, description: 'Order cancelled successfully' })
	async cancelOrder(@Param('orderId') orderId: string, @Query('coin') coin: string) {
		return this.tradingService.cancelOrder(coin, parseInt(orderId));
	}

	@Delete('orders')
	@ApiOperation({ summary: 'Cancel all open orders' })
	@ApiQuery({ name: 'coin', required: false, description: 'Filter by coin (optional)' })
	@ApiResponse({ status: 200, description: 'All orders cancelled successfully' })
	async cancelAllOrders(@Query('coin') coin?: string) {
		return this.tradingService.cancelAllOrders(coin);
	}

	// Quick trading shortcuts
	@Post('orders/market-buy')
	@ApiOperation({ summary: 'Quick market buy' })
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				coin: { type: 'string', example: 'BTC' },
				size: { type: 'number', example: 0.01 },
			},
			required: ['coin', 'size'],
		},
	})
	@ApiResponse({ status: 200, description: 'Market buy order placed' })
	async marketBuy(@Body() body: { coin: string; size: number }) {
		return this.tradingService.placeMarketOrder(body.coin, true, body.size);
	}

	@Post('orders/market-sell')
	@ApiOperation({ summary: 'Quick market sell' })
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				coin: { type: 'string', example: 'BTC' },
				size: { type: 'number', example: 0.01 },
			},
			required: ['coin', 'size'],
		},
	})
	@ApiResponse({ status: 200, description: 'Market sell order placed' })
	async marketSell(@Body() body: { coin: string; size: number }) {
		return this.tradingService.placeMarketOrder(body.coin, false, body.size);
	}

	@Post('orders/limit-buy')
	@ApiOperation({ summary: 'Quick limit buy' })
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				coin: { type: 'string', example: 'BTC' },
				size: { type: 'number', example: 0.01 },
				price: { type: 'number', example: 50000 },
			},
			required: ['coin', 'size', 'price'],
		},
	})
	@ApiResponse({ status: 200, description: 'Limit buy order placed' })
	async limitBuy(@Body() body: { coin: string; size: number; price: number }) {
		return this.tradingService.placeLimitOrder(body.coin, true, body.size, body.price);
	}

	@Post('orders/limit-sell')
	@ApiOperation({ summary: 'Quick limit sell' })
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				coin: { type: 'string', example: 'BTC' },
				size: { type: 'number', example: 0.01 },
				price: { type: 'number', example: 50000 },
			},
			required: ['coin', 'size', 'price'],
		},
	})
	@ApiResponse({ status: 200, description: 'Limit sell order placed' })
	async limitSell(@Body() body: { coin: string; size: number; price: number }) {
		return this.tradingService.placeLimitOrder(body.coin, false, body.size, body.price);
	}

	// ==================== Leverage Management ====================

	@Post('leverage')
	@ApiOperation({ summary: 'Update leverage for a coin' })
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				coin: { type: 'string', example: 'BTC' },
				leverage: { type: 'number', example: 10, minimum: 1, maximum: 50 },
				isCross: { type: 'boolean', example: true, description: 'True for cross, false for isolated' },
			},
			required: ['coin', 'leverage', 'isCross'],
		},
	})
	@ApiResponse({ status: 200, description: 'Leverage updated successfully' })
	async updateLeverage(@Body() body: { coin: string; leverage: number; isCross: boolean }) {
		return this.tradingService.updateLeverage(body.coin, body.isCross, body.leverage);
	}

	// ==================== Transfer Endpoints ====================

	@Post('transfer/spot-perp')
	@ApiOperation({ summary: 'Transfer between spot and perp accounts' })
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				usdc: { type: 'string', example: '100', description: 'Amount in USDC' },
				toPerp: { type: 'boolean', example: true, description: 'True to transfer to perp, false to spot' },
			},
			required: ['usdc', 'toPerp'],
		},
	})
	@ApiResponse({ status: 200, description: 'Transfer completed successfully' })
	async spotPerpTransfer(@Body() body: { usdc: string; toPerp: boolean }) {
		return this.hyperliquidApiService.spotPerpTransfer(body.usdc, body.toPerp);
	}

	@Post('withdraw')
	@ApiOperation({ summary: 'Withdraw USDC' })
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				destination: { type: 'string', example: '0x...' },
				amount: { type: 'string', example: '100' },
			},
			required: ['destination', 'amount'],
		},
	})
	@ApiResponse({ status: 200, description: 'Withdrawal initiated successfully' })
	async withdraw(@Body() body: { destination: string; amount: string }) {
		return this.hyperliquidApiService.withdraw(body.destination, body.amount);
	}

	// ==================== Market Data Endpoints ====================

	@Get('market/meta')
	@ApiOperation({ summary: 'Get market metadata (all available assets)' })
	@ApiResponse({ status: 200, description: 'Market metadata retrieved successfully' })
	async getMeta() {
		return this.marketDataService.getMeta();
	}

	@Get('market/prices')
	@ApiOperation({ summary: 'Get current prices for all assets' })
	@ApiResponse({ status: 200, description: 'Prices retrieved successfully' })
	async getAllPrices() {
		return this.marketDataService.getAllMids();
	}

	@Get('market/price/:coin')
	@ApiOperation({ summary: 'Get current price for specific coin' })
	@ApiParam({ name: 'coin', description: 'Coin symbol (e.g., BTC, ETH)' })
	@ApiResponse({ status: 200, description: 'Price retrieved successfully' })
	async getPrice(@Param('coin') coin: string) {
		const prices = await this.marketDataService.getAllMids();
		if (prices.success && prices.data && prices.data[coin]) {
			return {
				success: true,
				data: {
					coin,
					price: prices.data[coin],
				},
				timestamp: Date.now(),
			};
		}
		return {
			success: false,
			error: `Price not found for ${coin}`,
			timestamp: Date.now(),
		};
	}

	@Get('market/orderbook/:coin')
	@ApiOperation({ summary: 'Get L2 order book for a coin' })
	@ApiParam({ name: 'coin', description: 'Coin symbol (e.g., BTC, ETH)' })
	@ApiResponse({ status: 200, description: 'Order book retrieved successfully' })
	async getOrderBook(@Param('coin') coin: string) {
		return this.marketDataService.getL2Book(coin);
	}

	@Get('market/trades/:coin')
	@ApiOperation({ summary: 'Get recent trades for a coin' })
	@ApiParam({ name: 'coin', description: 'Coin symbol (e.g., BTC, ETH)' })
	@ApiQuery({ name: 'limit', required: false, description: 'Number of trades (default 100)' })
	@ApiResponse({ status: 200, description: 'Recent trades retrieved successfully' })
	async getRecentTrades(@Param('coin') coin: string, @Query('limit') limit?: number) {
		return this.marketDataService.getRecentTrades(coin, limit);
	}

	@Get('market/candles/:coin')
	@ApiOperation({ summary: 'Get candlestick data for a coin' })
	@ApiParam({ name: 'coin', description: 'Coin symbol (e.g., BTC, ETH)' })
	@ApiQuery({ name: 'interval', required: true, description: 'Interval (e.g., 1m, 5m, 1h, 1d)' })
	@ApiQuery({ name: 'startTime', required: false, description: 'Start time in ms' })
	@ApiQuery({ name: 'endTime', required: false, description: 'End time in ms' })
	@ApiResponse({ status: 200, description: 'Candles retrieved successfully' })
	async getCandles(
		@Param('coin') coin: string,
		@Query('interval') interval: string,
		@Query('startTime') startTime?: number,
		@Query('endTime') endTime?: number,
	) {
		return this.marketDataService.getCandles(coin, interval, startTime, endTime);
	}

	// ==================== Quick Trading Endpoints ====================

	@Public()
	@Post('quick-long')
	@ApiOperation({ summary: 'Quick long position with TP/SL' })
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				coin: { type: 'string', example: 'BTC', description: 'Coin symbol' },
				usdValue: { type: 'number', example: 100, description: 'USD value of position' },
				stopLossPercent: { type: 'number', example: 5, description: 'Stop loss percentage (default: 5%)' },
				takeProfitPercent: { type: 'number', example: 10, description: 'Take profit percentage (default: 10%)' },
				leverage: { type: 'number', example: 5, description: 'Leverage multiplier (default: 5x)' },
			},
			required: ['coin', 'usdValue'],
		},
	})
	@ApiResponse({ status: 200, description: 'Long position opened with TP/SL' })
	async quickLong(@Body() body: {
		coin: string;
		usdValue: number;
		stopLossPercent?: number;
		takeProfitPercent?: number;
		leverage?: number;
	}) {
		return this.tradingService.quickLong(
			body.coin,
			body.usdValue,
			body.stopLossPercent,
			body.takeProfitPercent,
			body.leverage,
		);
	}

	@Public()
	@Post('quick-short')
	@ApiOperation({ summary: 'Quick short position with TP/SL' })
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				coin: { type: 'string', example: 'ETH', description: 'Coin symbol' },
				usdValue: { type: 'number', example: 100, description: 'USD value of position' },
				stopLossPercent: { type: 'number', example: 5, description: 'Stop loss percentage (default: 5%)' },
				takeProfitPercent: { type: 'number', example: 10, description: 'Take profit percentage (default: 10%)' },
				leverage: { type: 'number', example: 5, description: 'Leverage multiplier (default: 5x)' },
			},
			required: ['coin', 'usdValue'],
		},
	})
	@ApiResponse({ status: 200, description: 'Short position opened with TP/SL' })
	async quickShort(@Body() body: {
		coin: string;
		usdValue: number;
		stopLossPercent?: number;
		takeProfitPercent?: number;
		leverage?: number;
	}) {
		return this.tradingService.quickShort(
			body.coin,
			body.usdValue,
			body.stopLossPercent,
			body.takeProfitPercent,
			body.leverage,
		);
	}

	@Public()
	@Post('close-position')
	@ApiOperation({ summary: 'Close position for a coin' })
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				coin: { type: 'string', example: 'BTC', description: 'Coin symbol' },
				size: { type: 'number', example: 0.01, description: 'Size to close (optional, closes full position if not specified)' },
				slippage: { type: 'number', example: 1, description: 'Slippage tolerance in percentage (default: 1%)' },
			},
			required: ['coin'],
		},
	})
	@ApiResponse({ status: 200, description: 'Position closed successfully' })
	async closePosition(@Body() body: {
		coin: string;
		size?: number;
		slippage?: number;
	}) {
		return this.tradingService.closePosition(body);
	}

	@Public()
	@Post('close-all-positions')
	@ApiOperation({ summary: 'Close all open positions' })
	@ApiBody({
		required: false,
		schema: {
			type: 'object',
			properties: {
				slippage: { type: 'number', example: 1, description: 'Slippage tolerance in percentage (default: 1%)' },
			},
		},
	})
	@ApiResponse({ status: 200, description: 'All positions closed successfully' })
	async closeAllPositions(@Body() body?: { slippage?: number }) {
		return this.tradingService.closeAllPositions(body);
	}

	// ==================== History Endpoints ====================

	@Get('history/fills')
	@ApiOperation({ summary: 'Get user fill history (executed trades)' })
	@ApiQuery({ name: 'user', description: 'User address (optional)', required: false })
	@ApiResponse({ status: 200, description: 'Fill history retrieved successfully' })
	async getUserFills(@Query('user') user?: string) {
		return this.historyService.getUserFills(user);
	}

	@Get('history/funding/:coin')
	@ApiOperation({ summary: 'Get funding history for a coin' })
	@ApiParam({ name: 'coin', description: 'Coin symbol (e.g., BTC, ETH)' })
	@ApiQuery({ name: 'startTime', required: false, description: 'Start time in ms' })
	@ApiQuery({ name: 'endTime', required: false, description: 'End time in ms' })
	@ApiResponse({ status: 200, description: 'Funding history retrieved successfully' })
	async getFundingHistory(
		@Param('coin') coin: string,
		@Query('startTime') startTime?: number,
		@Query('endTime') endTime?: number,
	) {
		return this.historyService.getFundingHistory(coin, startTime, endTime);
	}
}
