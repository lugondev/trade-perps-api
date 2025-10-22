import { Controller, Get, Post, Delete, Body, Param, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { BalanceService } from '../services/balance.service';
import { TradingService } from '../services/trading.service';
import { HistoryService } from '../services/history.service';
import { AsterWebSocketService } from '../services/aster-websocket.service';
import { AsterApiService } from '../services/aster-api.service';
import { MarketDataService } from '../services/market-data.service';
import { OrderRequest } from '../types';

@ApiTags('aster')
@Controller('aster')
export class AsterController {
	private readonly logger = new Logger(AsterController.name);

	constructor(
		private readonly balanceService: BalanceService,
		private readonly tradingService: TradingService,
		private readonly historyService: HistoryService,
		private readonly webSocketService: AsterWebSocketService,
		private readonly asterApiService: AsterApiService,
		private readonly marketDataService: MarketDataService,
	) { }

	// Debug endpoint
	@Get('debug/credentials')
	@ApiOperation({ summary: 'Debug credentials configuration (development only)' })
	@ApiResponse({ status: 200, description: 'Credentials debug info' })
	async debugCredentials() {
		return this.asterApiService.debugCredentials();
	}

	// Balance endpoints
	@Get('balance')
	@ApiOperation({ summary: 'Get account balances' })
	@ApiResponse({ status: 200, description: 'Account balances retrieved successfully' })
	async getBalances() {
		return this.balanceService.getBalance();
	}

	@Get('balance/non-zero')
	@ApiOperation({ summary: 'Get non-zero balances only' })
	@ApiResponse({ status: 200, description: 'Non-zero balances retrieved successfully' })
	async getNonZeroBalances() {
		const result = await this.balanceService.getBalance();
		if (result.success && result.data) {
			const nonZeroBalances = result.data.filter(balance => parseFloat(balance.total) > 0);
			return { ...result, data: nonZeroBalances };
		}
		return result;
	}

	@Get('balance/:asset')
	@ApiOperation({ summary: 'Get balance for specific asset' })
	@ApiParam({ name: 'asset', description: 'Asset symbol (e.g., BTC, USDT)' })
	@ApiResponse({ status: 200, description: 'Asset balance retrieved successfully' })
	async getBalance(@Param('asset') asset: string) {
		const result = await this.balanceService.getBalance();
		if (result.success && result.data) {
			const assetBalance = result.data.find(balance => balance.asset === asset);
			if (assetBalance) {
				return { ...result, data: assetBalance };
			}
			return {
				success: false,
				error: `Asset ${asset} not found`,
				timestamp: Date.now(),
			};
		}
		return result;
	}

	@Get('portfolio/value')
	@ApiOperation({ summary: 'Get total portfolio value' })
	@ApiResponse({ status: 200, description: 'Portfolio value retrieved successfully' })
	async getPortfolioValue() {
		const accountInfo = await this.balanceService.getAccountInfo();
		if (accountInfo.success && accountInfo.data) {
			return {
				success: true,
				data: {
					totalWalletBalance: accountInfo.data.totalWalletBalance,
					totalUnrealizedProfit: accountInfo.data.totalUnrealizedProfit,
					totalMarginBalance: accountInfo.data.totalMarginBalance,
					availableBalance: accountInfo.data.availableBalance,
				},
				timestamp: Date.now(),
			};
		}
		return accountInfo;
	}

	@Get('account/info')
	@ApiOperation({ summary: 'Get account information v3 (includes positions, assets, margin info)' })
	@ApiResponse({ status: 200, description: 'Account information retrieved successfully' })
	async getAccountInfo() {
		return this.balanceService.getAccountInfo();
	}

	@Get('positions')
	@ApiOperation({ summary: 'Get position information v3' })
	@ApiQuery({ name: 'symbol', description: 'Trading symbol (optional)', required: false })
	@ApiResponse({ status: 200, description: 'Position information retrieved successfully' })
	async getPositions(@Query('symbol') symbol?: string) {
		return this.balanceService.getPositionRisk(symbol);
	}

	@Get('trading/positions')
	@ApiOperation({ summary: 'Get all positions (from trading service)' })
	@ApiQuery({ name: 'symbol', description: 'Trading symbol (optional)', required: false })
	@ApiResponse({ status: 200, description: 'Positions retrieved successfully' })
	async getTradingPositions(@Query('symbol') symbol?: string) {
		return this.tradingService.getPositions(symbol);
	}

	@Get('trading/account')
	@ApiOperation({ summary: 'Get account info (from trading service)' })
	@ApiResponse({ status: 200, description: 'Account info retrieved successfully' })
	async getTradingAccount() {
		return this.tradingService.getAccountInfo();
	}

	// Trading endpoints
	@Post('orders')
	@ApiOperation({ summary: 'Place a new order' })
	@ApiBody({
		description: 'Order details',
		schema: {
			type: 'object',
			properties: {
				symbol: { type: 'string', example: 'BTCUSDT' },
				side: { type: 'string', enum: ['BUY', 'SELL'] },
				type: { type: 'string', enum: ['MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT'] },
				quantity: { type: 'string', example: '0.001' },
				price: { type: 'string', example: '45000.00' },
				timeInForce: { type: 'string', enum: ['GTC', 'IOC', 'FOK'] },
			},
			required: ['symbol', 'side', 'type', 'quantity']
		}
	})
	@ApiResponse({ status: 201, description: 'Order placed successfully' })
	async placeOrder(@Body() orderRequest: OrderRequest) {
		return this.tradingService.placeOrder(orderRequest);
	}

	@Delete('orders/:orderId')
	@ApiOperation({ summary: 'Cancel an order' })
	@ApiParam({ name: 'orderId', description: 'Order ID to cancel' })
	@ApiQuery({ name: 'symbol', required: false, description: 'Trading symbol' })
	@ApiResponse({ status: 200, description: 'Order cancelled successfully' })
	async cancelOrder(@Param('orderId') orderId: string, @Query('symbol') symbol?: string) {
		return this.tradingService.cancelOrder(orderId, symbol);
	}



	@Get('orders/open')
	@ApiOperation({ summary: 'Get all open orders' })
	@ApiQuery({ name: 'symbol', required: false, description: 'Filter by trading symbol' })
	@ApiResponse({ status: 200, description: 'Open orders retrieved successfully' })
	async getOpenOrders(@Query('symbol') symbol?: string) {
		return this.historyService.getOpenOrders(symbol);
	}

	@Get('orders/all')
	@ApiOperation({ summary: 'Get all orders history' })
	@ApiQuery({ name: 'symbol', required: true, description: 'Trading symbol' })
	@ApiParam({ name: 'orderId', description: 'Order ID' })
	@ApiQuery({ name: 'startTime', required: false, description: 'Start time in ms (optional)' })
	@ApiQuery({ name: 'endTime', required: false, description: 'End time in ms (optional)' })
	@ApiQuery({ name: 'limit', required: false, description: 'Limit (default 500, max 1000)' })
	@ApiResponse({ status: 200, description: 'Orders history retrieved successfully' })
	async getAllOrders(
		@Query('symbol') symbol: string,
		@Query('orderId') orderId?: string,
		@Query('startTime') startTime?: number,
		@Query('endTime') endTime?: number,
		@Query('limit') limit?: number
	) {
		return this.tradingService.getAllOrders(symbol, orderId, startTime, endTime, limit);
	}

	@Get('orders/:orderId')
	@ApiOperation({ summary: 'Get order details' })
	@ApiParam({ name: 'orderId', description: 'Order ID' })
	@ApiQuery({ name: 'symbol', required: true, description: 'Trading symbol' })
	@ApiResponse({ status: 200, description: 'Order details retrieved successfully' })
	async getOrder(@Param('orderId') orderId: string, @Query('symbol') symbol: string) {
		return this.tradingService.getOrder(symbol, orderId);
	}

	@Delete('orders')
	@ApiOperation({ summary: 'Cancel all open orders' })
	@ApiQuery({ name: 'symbol', required: false, description: 'Filter by trading symbol' })
	@ApiResponse({ status: 200, description: 'All orders cancelled successfully' })
	async cancelAllOrders(@Query('symbol') symbol?: string) {
		return this.tradingService.cancelAllOrders(symbol);
	}

	// Quick trading endpoints
	@Post('orders/market-buy')
	@ApiOperation({ summary: 'Place market buy order' })
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				symbol: { type: 'string', example: 'BTCUSDT' },
				quantity: { type: 'string', example: '0.001' },
				clientOrderId: { type: 'string' }
			},
			required: ['symbol', 'quantity']
		}
	})
	@ApiResponse({ status: 201, description: 'Market buy order placed successfully' })
	async marketBuy(@Body() body: { symbol: string; quantity: string; clientOrderId?: string }) {
		return this.tradingService.marketBuy(body.symbol, body.quantity, body.clientOrderId);
	}

	@Post('orders/market-sell')
	@ApiOperation({ summary: 'Place market sell order' })
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				symbol: { type: 'string', example: 'BTCUSDT' },
				quantity: { type: 'string', example: '0.001' },
				clientOrderId: { type: 'string' }
			},
			required: ['symbol', 'quantity']
		}
	})
	@ApiResponse({ status: 201, description: 'Market sell order placed successfully' })
	async marketSell(@Body() body: { symbol: string; quantity: string; clientOrderId?: string }) {
		return this.tradingService.marketSell(body.symbol, body.quantity, body.clientOrderId);
	}

	@Post('orders/limit-buy')
	@ApiOperation({ summary: 'Place limit buy order' })
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				symbol: { type: 'string', example: 'BTCUSDT' },
				quantity: { type: 'string', example: '0.001' },
				price: { type: 'string', example: '45000.00' },
				clientOrderId: { type: 'string' }
			},
			required: ['symbol', 'quantity', 'price']
		}
	})
	@ApiResponse({ status: 201, description: 'Limit buy order placed successfully' })
	async limitBuy(@Body() body: { symbol: string; quantity: string; price: string; clientOrderId?: string }) {
		return this.tradingService.limitBuy(body.symbol, body.quantity, body.price, body.clientOrderId);
	}

	@Post('orders/limit-sell')
	@ApiOperation({ summary: 'Place limit sell order' })
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				symbol: { type: 'string', example: 'BTCUSDT' },
				quantity: { type: 'string', example: '0.001' },
				price: { type: 'string', example: '45000.00' },
				clientOrderId: { type: 'string' }
			},
			required: ['symbol', 'quantity', 'price']
		}
	})
	@ApiResponse({ status: 201, description: 'Limit sell order placed successfully' })
	async limitSell(@Body() body: { symbol: string; quantity: string; price: string; clientOrderId?: string }) {
		return this.tradingService.limitSell(body.symbol, body.quantity, body.price, body.clientOrderId);
	}

	// Leverage setting endpoint
	@Post('leverage')
	@ApiOperation({ summary: 'Set leverage for a specific symbol' })
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				symbol: { type: 'string', example: 'BTCUSDT', description: 'Trading pair symbol' },
				leverage: { type: 'number', example: 10, minimum: 1, maximum: 125, description: 'Leverage multiplier (1-125)' }
			},
			required: ['symbol', 'leverage']
		}
	})
	@ApiResponse({
		status: 200,
		description: 'Leverage set successfully',
		schema: {
			type: 'object',
			properties: {
				success: { type: 'boolean' },
				data: { type: 'object' },
				timestamp: { type: 'number' }
			}
		}
	})
	async setLeverage(@Body() body: { symbol: string; leverage: number }) {
		return this.tradingService.setLeverage(body.symbol, body.leverage);
	}

	// Quick position endpoints with risk management
	@Post('orders/quick-long')
	@ApiOperation({ summary: 'Quick LONG position with current market price and auto SL/TP' })
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				symbol: { type: 'string', example: 'BTCUSDT', description: 'Trading pair symbol' },
				usdtValue: { type: 'number', example: 100, description: 'Amount in USDT to long' },
				stopLossPercent: { type: 'number', example: 15, description: 'Stop loss percentage (default: 15%)' },
				takeProfitPercent: { type: 'number', example: 15, description: 'Take profit percentage (default: 15%)' },
				leverage: { type: 'number', example: 10, description: 'Leverage multiplier (default: 10x)' }
			},
			required: ['symbol', 'usdtValue']
		}
	})
	@ApiResponse({
		status: 201,
		description: 'Quick LONG position placed with stop loss and take profit orders',
		schema: {
			type: 'object',
			properties: {
				success: { type: 'boolean' },
				data: {
					type: 'object',
					properties: {
						mainOrder: { type: 'object', description: 'Main market order' },
						stopLoss: { type: 'object', description: 'Stop loss order' },
						takeProfit: { type: 'object', description: 'Take profit order' }
					}
				},
				timestamp: { type: 'number' }
			}
		}
	})
	async quickLong(
		@Body() body: {
			symbol: string;
			usdtValue: number;
			stopLossPercent?: number;
			takeProfitPercent?: number;
			leverage?: number;
		}
	) {
		return this.tradingService.quickLong(
			body.symbol,
			body.usdtValue,
			body.stopLossPercent ?? 15,
			body.takeProfitPercent ?? 15,
			body.leverage ?? 10
		);
	}

	@Post('orders/quick-short')
	@ApiOperation({ summary: 'Quick SHORT position with current market price and auto SL/TP' })
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				symbol: { type: 'string', example: 'BTCUSDT', description: 'Trading pair symbol' },
				usdtValue: { type: 'number', example: 100, description: 'Amount in USDT to short' },
				stopLossPercent: { type: 'number', example: 15, description: 'Stop loss percentage (default: 15%)' },
				takeProfitPercent: { type: 'number', example: 15, description: 'Take profit percentage (default: 15%)' },
				leverage: { type: 'number', example: 10, description: 'Leverage multiplier (default: 10x)' }
			},
			required: ['symbol', 'usdtValue']
		}
	})
	@ApiResponse({
		status: 201,
		description: 'Quick SHORT position placed with stop loss and take profit orders',
		schema: {
			type: 'object',
			properties: {
				success: { type: 'boolean' },
				data: {
					type: 'object',
					properties: {
						mainOrder: { type: 'object', description: 'Main market order' },
						stopLoss: { type: 'object', description: 'Stop loss order' },
						takeProfit: { type: 'object', description: 'Take profit order' }
					}
				},
				timestamp: { type: 'number' }
			}
		}
	})
	async quickShort(
		@Body() body: {
			symbol: string;
			usdtValue: number;
			stopLossPercent?: number;
			takeProfitPercent?: number;
			leverage?: number;
		}
	) {
		return this.tradingService.quickShort(
			body.symbol,
			body.usdtValue,
			body.stopLossPercent ?? 15,
			body.takeProfitPercent ?? 15,
			body.leverage ?? 10
		);
	}

	// History endpoints
	@Get('history/trades')
	@ApiOperation({ summary: 'Get trade history' })
	@ApiQuery({ name: 'symbol', required: false, description: 'Filter by trading symbol' })
	@ApiQuery({ name: 'limit', required: false, description: 'Number of records (default: 100)' })
	@ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
	@ApiQuery({ name: 'startTime', required: false, description: 'Start timestamp' })
	@ApiQuery({ name: 'endTime', required: false, description: 'End timestamp' })
	@ApiResponse({ status: 200, description: 'Trade history retrieved successfully' })
	async getTradeHistory(
		@Query('symbol') symbol?: string,
		@Query('limit') limit: number = 100,
		@Query('page') page: number = 1,
		@Query('startTime') startTime?: number,
		@Query('endTime') endTime?: number,
	) {
		return this.historyService.getTradeHistory(symbol, limit, page, startTime, endTime);
	}

	@Get('history/orders')
	@ApiOperation({ summary: 'Get order history' })
	@ApiQuery({ name: 'symbol', required: false, description: 'Filter by trading symbol' })
	@ApiQuery({ name: 'limit', required: false, description: 'Number of records (default: 100)' })
	@ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
	@ApiQuery({ name: 'startTime', required: false, description: 'Start timestamp' })
	@ApiQuery({ name: 'endTime', required: false, description: 'End timestamp' })
	@ApiResponse({ status: 200, description: 'Order history retrieved successfully' })
	async getOrderHistory(
		@Query('symbol') symbol?: string,
		@Query('limit') limit: number = 100,
		@Query('page') page: number = 1,
		@Query('startTime') startTime?: number,
		@Query('endTime') endTime?: number,
	) {
		return this.historyService.getOrderHistory(symbol, limit, page, startTime, endTime);
	}

	@Get('history/trades/:symbol/recent')
	@ApiOperation({ summary: 'Get recent trades for symbol' })
	@ApiParam({ name: 'symbol', description: 'Trading symbol' })
	@ApiQuery({ name: 'limit', required: false, description: 'Number of records (default: 50)' })
	@ApiResponse({ status: 200, description: 'Recent trades retrieved successfully' })
	async getRecentTrades(@Param('symbol') symbol: string, @Query('limit') limit: number = 50) {
		return this.historyService.getRecentTrades(symbol, limit);
	}

	@Get('stats/:symbol')
	@ApiOperation({ summary: 'Get trading statistics for symbol' })
	@ApiParam({ name: 'symbol', description: 'Trading symbol' })
	@ApiQuery({ name: 'days', required: false, description: 'Number of days (default: 30)' })
	@ApiResponse({ status: 200, description: 'Trading statistics retrieved successfully' })
	async getTradingStats(@Param('symbol') symbol: string, @Query('days') days: number = 30) {
		return this.historyService.getTradingStats(symbol, days);
	}

	@Get('pnl')
	@ApiOperation({ summary: 'Get P&L report' })
	@ApiQuery({ name: 'symbol', required: false, description: 'Filter by trading symbol' })
	@ApiQuery({ name: 'days', required: false, description: 'Number of days (default: 30)' })
	@ApiResponse({ status: 200, description: 'P&L report retrieved successfully' })
	async getPnL(@Query('symbol') symbol?: string, @Query('days') days: number = 30) {
		return this.historyService.getPnL(symbol, days);
	}

	@Get('export/trades')
	@ApiOperation({ summary: 'Export trade history as CSV' })
	@ApiQuery({ name: 'symbol', required: false, description: 'Filter by trading symbol' })
	@ApiQuery({ name: 'days', required: false, description: 'Number of days (default: 30)' })
	@ApiResponse({ status: 200, description: 'CSV export successful' })
	async exportTrades(@Query('symbol') symbol?: string, @Query('days') days: number = 30) {
		return this.historyService.exportTradeHistoryCSV(symbol, days);
	}

	// WebSocket endpoints
	@Post('websocket/connect')
	@ApiOperation({ summary: 'Connect to WebSocket' })
	@ApiResponse({ status: 200, description: 'WebSocket connection initiated' })
	async connectWebSocket() {
		try {
			await this.webSocketService.connect();
			return { success: true, message: 'WebSocket connection initiated' };
		} catch (error) {
			return { success: false, error: error.message };
		}
	}

	@Post('websocket/disconnect')
	@ApiOperation({ summary: 'Disconnect from WebSocket' })
	@ApiResponse({ status: 200, description: 'WebSocket disconnected' })
	async disconnectWebSocket() {
		this.webSocketService.disconnect();
		return { success: true, message: 'WebSocket disconnected' };
	}

	@Post('websocket/subscribe/ticker/:symbol')
	@ApiOperation({ summary: 'Subscribe to ticker updates' })
	@ApiParam({ name: 'symbol', description: 'Trading symbol' })
	@ApiResponse({ status: 200, description: 'Subscribed to ticker updates' })
	async subscribeTicker(@Param('symbol') symbol: string) {
		this.webSocketService.subscribeTicker(symbol);
		return { success: true, message: `Subscribed to ticker for ${symbol}` };
	}

	@Post('websocket/subscribe/orderbook/:symbol')
	@ApiOperation({ summary: 'Subscribe to order book updates' })
	@ApiParam({ name: 'symbol', description: 'Trading symbol' })
	@ApiQuery({ name: 'depth', required: false, description: 'Order book depth (default: 20)' })
	@ApiResponse({ status: 200, description: 'Subscribed to order book updates' })
	async subscribeOrderBook(@Param('symbol') symbol: string, @Query('depth') depth: number = 20) {
		this.webSocketService.subscribeOrderBook(symbol, depth);
		return { success: true, message: `Subscribed to order book for ${symbol} with depth ${depth}` };
	}

	@Get('websocket/status')
	@ApiOperation({ summary: 'Get WebSocket connection status' })
	@ApiResponse({ status: 200, description: 'WebSocket status retrieved' })
	async getWebSocketStatus() {
		return {
			connected: this.webSocketService.isWebSocketConnected(),
			timestamp: Date.now(),
		};
	}

	// Market Data Endpoints
	@Get('ping')
	@ApiOperation({ summary: 'Test connectivity to Aster API' })
	@ApiResponse({ status: 200, description: 'Connection test successful' })
	async ping() {
		return this.asterApiService.ping();
	}

	@Get('time')
	@ApiOperation({ summary: 'Get server time' })
	@ApiResponse({ status: 200, description: 'Server time retrieved successfully' })
	async getServerTime() {
		return this.asterApiService.getServerTime();
	}

	@Get('exchangeInfo')
	@ApiOperation({ summary: 'Get exchange trading rules and symbol information' })
	@ApiResponse({ status: 200, description: 'Exchange information retrieved successfully' })
	async getExchangeInfo() {
		return this.asterApiService.getExchangeInfo();
	}

	@Get('depth')
	@ApiOperation({ summary: 'Get order book depth' })
	@ApiQuery({ name: 'symbol', description: 'Trading symbol', required: true })
	@ApiQuery({ name: 'limit', description: 'Limit for order book depth (default: 500)', required: false })
	@ApiResponse({ status: 200, description: 'Order book retrieved successfully' })
	async getOrderBook(@Query('symbol') symbol: string, @Query('limit') limit: number = 500) {
		return this.asterApiService.getOrderBook(symbol, limit);
	}

	@Get('market/trades')
	@ApiOperation({ summary: 'Get recent market trades from Aster API' })
	@ApiQuery({ name: 'symbol', description: 'Trading symbol', required: true })
	@ApiQuery({ name: 'limit', description: 'Number of trades to return (default: 500)', required: false })
	@ApiResponse({ status: 200, description: 'Recent market trades retrieved successfully' })
	async getMarketTrades(@Query('symbol') symbol: string, @Query('limit') limit: number = 500) {
		return this.asterApiService.getRecentTrades(symbol, limit);
	}

	@Get('ticker/24hr')
	@ApiOperation({ summary: 'Get 24hr ticker price change statistics' })
	@ApiQuery({ name: 'symbol', description: 'Trading symbol (optional - if not provided, returns all symbols)', required: false })
	@ApiResponse({ status: 200, description: '24hr ticker statistics retrieved successfully' })
	async get24hrTicker(@Query('symbol') symbol?: string) {
		return this.asterApiService.get24hrTicker(symbol);
	}

	@Get('ticker/price')
	@ApiOperation({ summary: 'Get symbol price ticker' })
	@ApiQuery({ name: 'symbol', description: 'Trading symbol (optional - if not provided, returns all symbols)', required: false })
	@ApiResponse({ status: 200, description: 'Price ticker retrieved successfully' })
	async getPriceTicker(@Query('symbol') symbol?: string) {
		return this.asterApiService.getPriceTicker(symbol);
	}

	@Get('ticker/bookTicker')
	@ApiOperation({ summary: 'Get best price/qty on the order book' })
	@ApiQuery({ name: 'symbol', description: 'Trading symbol (optional - if not provided, returns all symbols)', required: false })
	@ApiResponse({ status: 200, description: 'Book ticker retrieved successfully' })
	async getBookTicker(@Query('symbol') symbol?: string) {
		return this.asterApiService.getBookTicker(symbol);
	}

	@Get('klines')
	@ApiOperation({ summary: 'Get kline/candlestick data' })
	@ApiQuery({ name: 'symbol', description: 'Trading symbol', required: true })
	@ApiQuery({ name: 'interval', description: 'Kline interval (e.g., 1m, 5m, 1h, 1d)', required: true })
	@ApiQuery({ name: 'startTime', description: 'Start time (timestamp)', required: false })
	@ApiQuery({ name: 'endTime', description: 'End time (timestamp)', required: false })
	@ApiQuery({ name: 'limit', description: 'Number of klines to return', required: true })
	@ApiResponse({ status: 200, description: 'Kline data retrieved successfully' })
	async getKlines(
		@Query('symbol') symbol: string,
		@Query('interval') interval: string,
		@Query('startTime') startTime?: number,
		@Query('endTime') endTime?: number,
		@Query('limit') limit: number = 500
	) {
		return this.asterApiService.getKlines(symbol, interval, startTime, endTime, limit);
	}

	@Get('premiumIndex')
	@ApiOperation({ summary: 'Get mark price and funding rate' })
	@ApiQuery({ name: 'symbol', description: 'Trading symbol (optional - if not provided, returns all symbols)', required: false })
	@ApiResponse({ status: 200, description: 'Mark price data retrieved successfully' })
	async getMarkPrice(@Query('symbol') symbol?: string) {
		return this.asterApiService.getMarkPrice(symbol);
	}

	@Get('fundingRate')
	@ApiOperation({ summary: 'Get funding rate history' })
	@ApiQuery({ name: 'symbol', description: 'Trading symbol (optional)', required: false })
	@ApiQuery({ name: 'startTime', description: 'Start time (timestamp)', required: false })
	@ApiQuery({ name: 'endTime', description: 'End time (timestamp)', required: false })
	@ApiQuery({ name: 'limit', description: 'Number of records to return (default: 100)', required: false })
	@ApiResponse({ status: 200, description: 'Funding rate history retrieved successfully' })
	async getFundingRate(
		@Query('symbol') symbol?: string,
		@Query('startTime') startTime?: number,
		@Query('endTime') endTime?: number,
		@Query('limit') limit: number = 100
	) {
		return this.asterApiService.getFundingRate(symbol, startTime, endTime, limit);
	}

	// New Market Data Endpoints from MarketDataService
	@Get('market/symbols')
	@ApiOperation({ summary: 'Get all trading symbols' })
	@ApiResponse({ status: 200, description: 'Trading symbols retrieved successfully' })
	async getSymbols() {
		return this.marketDataService.getSymbols();
	}

	@Get('market/price/:symbol')
	@ApiOperation({ summary: 'Get current price for a symbol' })
	@ApiParam({ name: 'symbol', description: 'Trading symbol' })
	@ApiResponse({ status: 200, description: 'Current price retrieved successfully' })
	async getCurrentPrice(@Param('symbol') symbol: string) {
		return this.marketDataService.getCurrentPrice(symbol);
	}

	@Get('market/depth/:symbol')
	@ApiOperation({ summary: 'Get formatted market depth' })
	@ApiParam({ name: 'symbol', description: 'Trading symbol' })
	@ApiQuery({ name: 'limit', description: 'Limit for order book depth (default: 10)', required: false })
	@ApiResponse({ status: 200, description: 'Market depth retrieved successfully' })
	async getMarketDepth(@Param('symbol') symbol: string, @Query('limit') limit: number = 10) {
		return this.marketDataService.getMarketDepth(symbol, limit);
	}

	@Get('market/ticker24hr/:symbol')
	@ApiOperation({ summary: 'Get 24hr ticker for specific symbol' })
	@ApiParam({ name: 'symbol', description: 'Trading symbol' })
	@ApiResponse({ status: 200, description: '24hr ticker retrieved successfully' })
	async get24hrTickerForSymbol(@Param('symbol') symbol: string) {
		return this.marketDataService.get24hrTicker(symbol);
	}

	@Get('market/klines/:symbol')
	@ApiOperation({ summary: 'Get klines with improved parameters' })
	@ApiParam({ name: 'symbol', description: 'Trading symbol' })
	@ApiQuery({ name: 'interval', description: 'Kline interval (1m, 5m, 15m, 30m, 1h, 4h, 1d)', required: true })
	@ApiQuery({ name: 'startTime', description: 'Start time (timestamp)', required: false })
	@ApiQuery({ name: 'endTime', description: 'End time (timestamp)', required: false })
	@ApiQuery({ name: 'limit', description: 'Number of klines', required: true })
	@ApiResponse({ status: 200, description: 'Klines retrieved successfully' })
	async getKlinesForSymbol(
		@Param('symbol') symbol: string,
		@Query('interval') interval: string,
		@Query('startTime') startTime?: number,
		@Query('endTime') endTime?: number,
		@Query('limit') limit: number = 500
	) {
		return this.marketDataService.getKlines(symbol, interval, startTime, endTime, limit);
	}
}