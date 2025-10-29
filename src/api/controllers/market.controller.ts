import { Controller, Get, Query, Param, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ApiKeyAuth } from '../../common/decorators/api-key.decorator';
import { ExchangeServiceFactory } from '../../common/factory/exchange.factory';
import { ExchangeName, TradingType } from '../../common/types/exchange.types';
import { IFuturesMarketService } from '../../common/interfaces';

@ApiTags('� Market API')
@ApiKeyAuth()
@Controller('api/market')
export class MarketController {
  private readonly logger = new Logger(MarketController.name);

  constructor(private readonly exchangeFactory: ExchangeServiceFactory) {}

  /**
   * Get default exchange parameters
   */
  private getExchangeParams(exchange?: string, tradingType?: string) {
    return {
      exchange: (exchange || 'aster') as ExchangeName,
      tradingType: (tradingType || 'futures') as TradingType,
    };
  }

  /**
   * Get futures market service
   */
  private async getFuturesMarketService(
    exchange: ExchangeName,
    tradingType: TradingType,
  ): Promise<IFuturesMarketService> {
    return this.exchangeFactory.getMarketService(
      exchange,
      tradingType,
    ) as Promise<IFuturesMarketService>;
  }

  /**
   * Get current price for a symbol
   */
  @Get('price/:symbol')
  @ApiOperation({ summary: 'Get current price for a symbol' })
  @ApiQuery({
    name: 'exchange',
    required: false,
    enum: ['aster', 'hyperliquid'],
    example: 'hyperliquid',
  })
  @ApiQuery({
    name: 'tradingType',
    required: false,
    enum: ['futures', 'perpetual'],
    example: 'perpetual',
  })
  @ApiResponse({ status: 200, description: 'Price retrieved successfully' })
  async getCurrentPrice(
    @Param('symbol') symbol: string,
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesMarketService(ex, tt);
    return service.getCurrentPrice(symbol);
  }

  /**
   * Get prices for all symbols
   */
  @Get('prices')
  @ApiOperation({ summary: 'Get prices for all symbols' })
  @ApiQuery({
    name: 'exchange',
    required: false,
    enum: ['aster', 'hyperliquid'],
    example: 'hyperliquid',
  })
  @ApiQuery({
    name: 'tradingType',
    required: false,
    enum: ['futures', 'perpetual'],
    example: 'perpetual',
  })
  @ApiResponse({ status: 200, description: 'Prices retrieved successfully' })
  async getAllPrices(
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesMarketService(ex, tt);
    return service.getAllPrices();
  }

  /**
   * Get order book
   */
  @Get('orderbook/:symbol')
  @ApiOperation({ summary: 'Get order book depth' })
  @ApiQuery({
    name: 'exchange',
    required: false,
    enum: ['aster', 'hyperliquid'],
    example: 'hyperliquid',
  })
  @ApiQuery({
    name: 'tradingType',
    required: false,
    enum: ['futures', 'perpetual'],
    example: 'perpetual',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Order book retrieved successfully' })
  async getOrderBook(
    @Param('symbol') symbol: string,
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
    @Query('limit') limit?: number,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesMarketService(ex, tt);
    return service.getOrderBook(symbol, limit);
  }

  /**
   * Get recent trades
   */
  @Get('trades/:symbol')
  @ApiOperation({ summary: 'Get recent market trades' })
  @ApiQuery({
    name: 'exchange',
    required: false,
    enum: ['aster', 'hyperliquid'],
    example: 'hyperliquid',
  })
  @ApiQuery({
    name: 'tradingType',
    required: false,
    enum: ['futures', 'perpetual'],
    example: 'perpetual',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 100 })
  @ApiResponse({ status: 200, description: 'Recent trades retrieved successfully' })
  async getRecentTrades(
    @Param('symbol') symbol: string,
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
    @Query('limit') limit?: number,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesMarketService(ex, tt);
    return service.getRecentTrades(symbol, limit);
  }

  /**
   * Get candlestick data
   */
  @Get('candles/:symbol')
  @ApiOperation({ summary: 'Get candlestick/kline data' })
  @ApiQuery({
    name: 'exchange',
    required: false,
    enum: ['aster', 'hyperliquid'],
    example: 'hyperliquid',
  })
  @ApiQuery({
    name: 'tradingType',
    required: false,
    enum: ['futures', 'perpetual'],
    example: 'perpetual',
  })
  @ApiQuery({ name: 'interval', required: true, example: '1h' })
  @ApiQuery({ name: 'startTime', required: false, type: Number })
  @ApiQuery({ name: 'endTime', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Candlestick data retrieved successfully' })
  async getCandles(
    @Param('symbol') symbol: string,
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
    @Query('interval') interval?: string,
    @Query('startTime') startTime?: number,
    @Query('endTime') endTime?: number,
    @Query('limit') limit?: number,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesMarketService(ex, tt);
    return service.getCandles(symbol, interval!, startTime, endTime, limit);
  }

  /**
   * Get 24h ticker statistics
   */
  @Get('ticker/:symbol')
  @ApiOperation({ summary: 'Get 24h price change statistics' })
  @ApiQuery({
    name: 'exchange',
    required: false,
    enum: ['aster', 'hyperliquid'],
    example: 'hyperliquid',
  })
  @ApiQuery({
    name: 'tradingType',
    required: false,
    enum: ['futures', 'perpetual'],
    example: 'perpetual',
  })
  @ApiResponse({ status: 200, description: 'Ticker retrieved successfully' })
  async getTicker(
    @Param('symbol') symbol: string,
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesMarketService(ex, tt);
    return service.getTicker(symbol);
  }

  /**
   * Get funding rate
   */
  @Get('funding-rate/:symbol')
  @ApiOperation({ summary: 'Get current funding rate' })
  @ApiQuery({
    name: 'exchange',
    required: false,
    enum: ['aster', 'hyperliquid'],
    example: 'hyperliquid',
  })
  @ApiQuery({
    name: 'tradingType',
    required: false,
    enum: ['futures', 'perpetual'],
    example: 'perpetual',
  })
  @ApiResponse({ status: 200, description: 'Funding rate retrieved successfully' })
  async getFundingRate(
    @Param('symbol') symbol: string,
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesMarketService(ex, tt);
    return service.getFundingRate(symbol);
  }

  /**
   * Get funding rate history
   */
  @Get('funding-rate-history/:symbol')
  @ApiOperation({ summary: 'Get funding rate history' })
  @ApiQuery({
    name: 'exchange',
    required: false,
    enum: ['aster', 'hyperliquid'],
    example: 'hyperliquid',
  })
  @ApiQuery({
    name: 'tradingType',
    required: false,
    enum: ['futures', 'perpetual'],
    example: 'perpetual',
  })
  @ApiQuery({ name: 'startTime', required: false, type: Number })
  @ApiQuery({ name: 'endTime', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Funding rate history retrieved successfully' })
  async getFundingRateHistory(
    @Param('symbol') symbol: string,
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
    @Query('startTime') startTime?: number,
    @Query('endTime') endTime?: number,
    @Query('limit') limit?: number,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesMarketService(ex, tt);
    return service.getFundingRateHistory(symbol, startTime, endTime, limit);
  }

  /**
   * Get contract information
   */
  @Get('contract/:symbol')
  @ApiOperation({ summary: 'Get contract/symbol information' })
  @ApiQuery({
    name: 'exchange',
    required: false,
    enum: ['aster', 'hyperliquid'],
    example: 'hyperliquid',
  })
  @ApiQuery({
    name: 'tradingType',
    required: false,
    enum: ['futures', 'perpetual'],
    example: 'perpetual',
  })
  @ApiResponse({ status: 200, description: 'Contract info retrieved successfully' })
  async getContractInfo(
    @Param('symbol') symbol: string,
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesMarketService(ex, tt);
    return service.getContractInfo(symbol);
  }

  /**
   * Get all trading symbols
   */
  @Get('symbols')
  @ApiOperation({ summary: 'Get all available trading symbols' })
  @ApiQuery({
    name: 'exchange',
    required: false,
    enum: ['aster', 'hyperliquid'],
    example: 'hyperliquid',
  })
  @ApiQuery({
    name: 'tradingType',
    required: false,
    enum: ['futures', 'perpetual'],
    example: 'perpetual',
  })
  @ApiResponse({ status: 200, description: 'Symbols retrieved successfully' })
  async getSymbols(
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesMarketService(ex, tt);
    return service.getSymbols();
  }

  /**
   * Get open interest
   */
  @Get('open-interest/:symbol')
  @ApiOperation({ summary: 'Get open interest statistics' })
  @ApiQuery({
    name: 'exchange',
    required: false,
    enum: ['aster', 'hyperliquid'],
    example: 'hyperliquid',
  })
  @ApiQuery({
    name: 'tradingType',
    required: false,
    enum: ['futures', 'perpetual'],
    example: 'perpetual',
  })
  @ApiResponse({ status: 200, description: 'Open interest retrieved successfully' })
  async getOpenInterest(
    @Param('symbol') symbol: string,
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesMarketService(ex, tt);
    return service.getOpenInterest(symbol);
  }

  /**
   * Get long/short ratio
   */
  @Get('long-short-ratio/:symbol')
  @ApiOperation({ summary: 'Get long/short position ratio' })
  @ApiQuery({
    name: 'exchange',
    required: false,
    enum: ['aster', 'hyperliquid'],
    example: 'hyperliquid',
  })
  @ApiQuery({
    name: 'tradingType',
    required: false,
    enum: ['futures', 'perpetual'],
    example: 'perpetual',
  })
  @ApiQuery({ name: 'period', required: true, example: '5m' })
  @ApiResponse({ status: 200, description: 'Long/short ratio retrieved successfully' })
  async getLongShortRatio(
    @Param('symbol') symbol: string,
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
    @Query('period') period?: string,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesMarketService(ex, tt);
    return service.getLongShortRatio(symbol, period!);
  }

  /**
   * Get mark price
   */
  @Get('mark-price/:symbol')
  @ApiOperation({ summary: 'Get mark price (used for liquidation)' })
  @ApiQuery({
    name: 'exchange',
    required: false,
    enum: ['aster', 'hyperliquid'],
    example: 'hyperliquid',
  })
  @ApiQuery({
    name: 'tradingType',
    required: false,
    enum: ['futures', 'perpetual'],
    example: 'perpetual',
  })
  @ApiResponse({ status: 200, description: 'Mark price retrieved successfully' })
  async getMarkPrice(
    @Param('symbol') symbol: string,
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesMarketService(ex, tt);
    return service.getMarkPrice(symbol);
  }

  /**
   * Get exchange information
   */
  @Get('info')
  @ApiOperation({ summary: 'Get exchange trading rules and information' })
  @ApiQuery({
    name: 'exchange',
    required: false,
    enum: ['aster', 'hyperliquid'],
    example: 'hyperliquid',
  })
  @ApiQuery({
    name: 'tradingType',
    required: false,
    enum: ['futures', 'perpetual'],
    example: 'perpetual',
  })
  @ApiResponse({ status: 200, description: 'Exchange info retrieved successfully' })
  async getExchangeInfo(
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesMarketService(ex, tt);
    return service.getExchangeInfo();
  }
}
