import { Get, Query, Param, Logger } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { IFuturesMarketService } from '../interfaces';

/**
 * Base Futures Market Controller
 * All exchange-specific futures market controllers should extend this
 */
export abstract class BaseFuturesMarketController {
	protected abstract readonly logger: Logger;
	protected abstract readonly marketService: IFuturesMarketService;

	@Get('price/:symbol')
	@ApiOperation({ summary: 'Get current price' })
	@ApiParam({ name: 'symbol', description: 'Trading symbol' })
	@ApiResponse({ status: 200, description: 'Price retrieved successfully' })
	async getCurrentPrice(@Param('symbol') symbol: string) {
		return this.marketService.getCurrentPrice(symbol);
	}

	@Get('prices')
	@ApiOperation({ summary: 'Get all prices' })
	@ApiResponse({ status: 200, description: 'All prices retrieved successfully' })
	async getAllPrices() {
		return this.marketService.getAllPrices();
	}

	@Get('ticker')
	@ApiOperation({ summary: 'Get 24hr ticker' })
	@ApiQuery({ name: 'symbol', required: false })
	@ApiResponse({ status: 200, description: 'Ticker retrieved successfully' })
	async getTicker(@Query('symbol') symbol?: string) {
		return this.marketService.getTicker(symbol);
	}

	@Get('orderbook/:symbol')
	@ApiOperation({ summary: 'Get order book' })
	@ApiParam({ name: 'symbol', description: 'Trading symbol' })
	@ApiQuery({ name: 'limit', required: false })
	@ApiResponse({ status: 200, description: 'Order book retrieved successfully' })
	async getOrderBook(@Param('symbol') symbol: string, @Query('limit') limit?: string) {
		const parsedLimit = limit ? parseInt(limit) : 500;
		return this.marketService.getOrderBook(symbol, parsedLimit);
	}

	@Get('trades/:symbol')
	@ApiOperation({ summary: 'Get recent trades' })
	@ApiParam({ name: 'symbol', description: 'Trading symbol' })
	@ApiQuery({ name: 'limit', required: false })
	@ApiResponse({ status: 200, description: 'Trades retrieved successfully' })
	async getRecentTrades(@Param('symbol') symbol: string, @Query('limit') limit?: string) {
		const parsedLimit = limit ? parseInt(limit) : 500;
		return this.marketService.getRecentTrades(symbol, parsedLimit);
	}

	@Get('candles/:symbol')
	@ApiOperation({ summary: 'Get klines/candles' })
	@ApiParam({ name: 'symbol', description: 'Trading symbol' })
	@ApiQuery({ name: 'interval', required: true })
	@ApiQuery({ name: 'startTime', required: false })
	@ApiQuery({ name: 'endTime', required: false })
	@ApiQuery({ name: 'limit', required: false })
	@ApiResponse({ status: 200, description: 'Candles retrieved successfully' })
	async getCandles(
		@Param('symbol') symbol: string,
		@Query('interval') interval: string,
		@Query('startTime') startTime?: string,
		@Query('endTime') endTime?: string,
		@Query('limit') limit?: string,
	) {
		const parsedStartTime = startTime ? parseInt(startTime) : undefined;
		const parsedEndTime = endTime ? parseInt(endTime) : undefined;
		const parsedLimit = limit ? parseInt(limit) : 500;
		return this.marketService.getCandles(symbol, interval, parsedStartTime, parsedEndTime, parsedLimit);
	}

	@Get('symbols')
	@ApiOperation({ summary: 'Get all symbols' })
	@ApiResponse({ status: 200, description: 'Symbols retrieved successfully' })
	async getSymbols() {
		return this.marketService.getSymbols();
	}

	@Get('futures-symbols')
	@ApiOperation({ summary: 'Get all futures symbols' })
	@ApiResponse({ status: 200, description: 'Futures symbols retrieved successfully' })
	async getFuturesSymbols() {
		return this.marketService.getFuturesSymbols();
	}

	// ==================== Futures-specific market data ====================

	@Get('funding-rate')
	@ApiOperation({ summary: 'Get funding rate' })
	@ApiQuery({ name: 'symbol', required: false })
	@ApiResponse({ status: 200, description: 'Funding rate retrieved successfully' })
	async getFundingRate(@Query('symbol') symbol?: string) {
		return this.marketService.getFundingRate(symbol);
	}

	@Get('funding-rate/history/:symbol')
	@ApiOperation({ summary: 'Get funding rate history' })
	@ApiParam({ name: 'symbol', description: 'Trading symbol' })
	@ApiQuery({ name: 'startTime', required: false })
	@ApiQuery({ name: 'endTime', required: false })
	@ApiQuery({ name: 'limit', required: false })
	@ApiResponse({ status: 200, description: 'Funding rate history retrieved successfully' })
	async getFundingRateHistory(
		@Param('symbol') symbol: string,
		@Query('startTime') startTime?: string,
		@Query('endTime') endTime?: string,
		@Query('limit') limit?: string,
	) {
		const parsedStartTime = startTime ? parseInt(startTime) : undefined;
		const parsedEndTime = endTime ? parseInt(endTime) : undefined;
		const parsedLimit = limit ? parseInt(limit) : undefined;
		return this.marketService.getFundingRateHistory(symbol, parsedStartTime, parsedEndTime, parsedLimit);
	}

	@Get('mark-price')
	@ApiOperation({ summary: 'Get mark price' })
	@ApiQuery({ name: 'symbol', required: false })
	@ApiResponse({ status: 200, description: 'Mark price retrieved successfully' })
	async getMarkPrice(@Query('symbol') symbol?: string) {
		return this.marketService.getMarkPrice(symbol);
	}

	@Get('index-price/:symbol')
	@ApiOperation({ summary: 'Get index price' })
	@ApiParam({ name: 'symbol', description: 'Trading symbol' })
	@ApiResponse({ status: 200, description: 'Index price retrieved successfully' })
	async getIndexPrice(@Param('symbol') symbol: string) {
		return this.marketService.getIndexPrice(symbol);
	}

	@Get('open-interest/:symbol')
	@ApiOperation({ summary: 'Get open interest' })
	@ApiParam({ name: 'symbol', description: 'Trading symbol' })
	@ApiResponse({ status: 200, description: 'Open interest retrieved successfully' })
	async getOpenInterest(@Param('symbol') symbol: string) {
		return this.marketService.getOpenInterest(symbol);
	}

	@Get('contract-info')
	@ApiOperation({ summary: 'Get contract specifications' })
	@ApiQuery({ name: 'symbol', required: false })
	@ApiResponse({ status: 200, description: 'Contract info retrieved successfully' })
	async getContractInfo(@Query('symbol') symbol?: string) {
		return this.marketService.getContractInfo(symbol);
	}
}
