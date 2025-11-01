import { Controller, Get, Query, Param, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ApiKeyAuth } from '../../common/decorators/api-key.decorator';
import { ExchangeServiceFactory } from '../../common/factory/exchange.factory';
import { ExchangeName, TradingType } from '../../common/types/exchange.types';
import { IPerpetualBalanceService } from '../../common/interfaces';

@ApiTags('� Balance API')
@ApiKeyAuth()
@Controller('api/balance')
export class BalanceController {
  private readonly logger = new Logger(BalanceController.name);

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
   * Get futures balance service
   */
  private async getFuturesBalanceService(
    exchange: ExchangeName,
    tradingType: TradingType,
  ): Promise<IPerpetualBalanceService> {
    return this.exchangeFactory.getBalanceService(
      exchange,
      tradingType,
    ) as Promise<IPerpetualBalanceService>;
  }

  /**
   * Get account balance
   */
  @Get()
  @ApiOperation({ summary: 'Get account balance' })
  @ApiQuery({
    name: 'exchange',
    required: false,
    enum: ['aster', 'hyperliquid'],
    example: 'hyperliquid',
  })
  @ApiQuery({
    name: 'tradingType',
    required: false,
    enum: ['perpetual'],
    example: 'perpetual',
  })
  @ApiResponse({ status: 200, description: 'Balance retrieved successfully' })
  async getBalance(
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesBalanceService(ex, tt);
    return service.getBalance();
  }

  /**
   * Get all positions
   */
  @Get('positions')
  @ApiOperation({ summary: 'Get all positions' })
  @ApiQuery({
    name: 'exchange',
    required: false,
    enum: ['aster', 'hyperliquid'],
    example: 'hyperliquid',
  })
  @ApiQuery({
    name: 'tradingType',
    required: false,
    enum: ['perpetual'],
    example: 'perpetual',
  })
  @ApiQuery({ name: 'symbol', required: false, example: 'BTCUSDT' })
  @ApiResponse({ status: 200, description: 'Positions retrieved successfully' })
  async getPositions(
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
    @Query('symbol') symbol?: string,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesBalanceService(ex, tt);
    return service.getPositions(symbol);
  }

  /**
   * Get total portfolio value
   */
  @Get('portfolio/value')
  @ApiOperation({ summary: 'Get total portfolio value in USDT' })
  @ApiQuery({
    name: 'exchange',
    required: false,
    enum: ['aster', 'hyperliquid'],
    example: 'hyperliquid',
  })
  @ApiQuery({
    name: 'tradingType',
    required: false,
    enum: ['perpetual'],
    example: 'perpetual',
  })
  @ApiResponse({ status: 200, description: 'Portfolio value retrieved successfully' })
  async getPortfolioValue(
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesBalanceService(ex, tt);
    return service.getPortfolioValue();
  }

  /**
   * Get total unrealized profit/loss
   */
  @Get('pnl/unrealized')
  @ApiOperation({ summary: 'Get total unrealized PnL across all positions' })
  @ApiQuery({
    name: 'exchange',
    required: false,
    enum: ['aster', 'hyperliquid'],
    example: 'hyperliquid',
  })
  @ApiQuery({
    name: 'tradingType',
    required: false,
    enum: ['perpetual'],
    example: 'perpetual',
  })
  @ApiResponse({ status: 200, description: 'Unrealized PnL retrieved successfully' })
  async getTotalUnrealizedPnl(
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesBalanceService(ex, tt);
    return service.getTotalUnrealizedPnl();
  }

  /**
   * Get income history
   */
  @Get('income')
  @ApiOperation({ summary: 'Get income history (realized PnL, funding fees, etc.)' })
  @ApiQuery({
    name: 'exchange',
    required: false,
    enum: ['aster', 'hyperliquid'],
    example: 'hyperliquid',
  })
  @ApiQuery({
    name: 'tradingType',
    required: false,
    enum: ['perpetual'],
    example: 'perpetual',
  })
  @ApiQuery({ name: 'symbol', required: false, example: 'BTCUSDT' })
  @ApiQuery({ name: 'incomeType', required: false, example: 'REALIZED_PNL' })
  @ApiQuery({ name: 'startTime', required: false, type: Number })
  @ApiQuery({ name: 'endTime', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Income history retrieved successfully' })
  async getIncomeHistory(
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
    @Query('symbol') symbol?: string,
    @Query('incomeType') incomeType?: string,
    @Query('startTime') startTime?: number,
    @Query('endTime') endTime?: number,
    @Query('limit') limit?: number,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesBalanceService(ex, tt);
    return service.getIncomeHistory(symbol, incomeType, startTime, endTime, limit);
  }

  /**
   * Get funding fee history
   */
  @Get('funding-fees')
  @ApiOperation({ summary: 'Get funding fee history' })
  @ApiQuery({
    name: 'exchange',
    required: false,
    enum: ['aster', 'hyperliquid'],
    example: 'hyperliquid',
  })
  @ApiQuery({
    name: 'tradingType',
    required: false,
    enum: ['perpetual'],
    example: 'perpetual',
  })
  @ApiQuery({ name: 'symbol', required: false, example: 'BTCUSDT' })
  @ApiQuery({ name: 'startTime', required: false, type: Number })
  @ApiQuery({ name: 'endTime', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Funding fee history retrieved successfully' })
  async getFundingFeeHistory(
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
    @Query('symbol') symbol?: string,
    @Query('startTime') startTime?: number,
    @Query('endTime') endTime?: number,
    @Query('limit') limit?: number,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesBalanceService(ex, tt);
    return service.getFundingFeeHistory(symbol, startTime, endTime, limit);
  }

  /**
   * Check liquidation risk
   */
  @Get('risk/liquidation')
  @ApiOperation({ summary: 'Check if account is at risk of liquidation' })
  @ApiQuery({
    name: 'exchange',
    required: false,
    enum: ['aster', 'hyperliquid'],
    example: 'hyperliquid',
  })
  @ApiQuery({
    name: 'tradingType',
    required: false,
    enum: ['perpetual'],
    example: 'perpetual',
  })
  @ApiResponse({ status: 200, description: 'Liquidation risk retrieved successfully' })
  async isAtRiskOfLiquidation(
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesBalanceService(ex, tt);
    return service.isAtRiskOfLiquidation();
  }

  /**
   * Calculate required margin
   */
  @Get('margin/required/:symbol')
  @ApiOperation({ summary: 'Calculate required margin for a position' })
  @ApiQuery({
    name: 'exchange',
    required: false,
    enum: ['aster', 'hyperliquid'],
    example: 'hyperliquid',
  })
  @ApiQuery({
    name: 'tradingType',
    required: false,
    enum: ['perpetual'],
    example: 'perpetual',
  })
  @ApiQuery({ name: 'quantity', required: true, type: String })
  @ApiQuery({ name: 'leverage', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Required margin calculated successfully' })
  async calculateRequiredMargin(
    @Param('symbol') symbol: string,
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
    @Query('quantity') quantity?: string,
    @Query('leverage') leverage?: number,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesBalanceService(ex, tt);
    return service.calculateRequiredMargin(symbol, quantity!, leverage!);
  }

  /**
   * Calculate potential PnL
   */
  @Get('pnl/potential/:symbol')
  @ApiOperation({ summary: 'Calculate potential PnL for a trade' })
  @ApiQuery({
    name: 'exchange',
    required: false,
    enum: ['aster', 'hyperliquid'],
    example: 'hyperliquid',
  })
  @ApiQuery({
    name: 'tradingType',
    required: false,
    enum: ['perpetual'],
    example: 'perpetual',
  })
  @ApiQuery({ name: 'entryPrice', required: true, type: String })
  @ApiQuery({ name: 'exitPrice', required: true, type: String })
  @ApiQuery({ name: 'quantity', required: true, type: String })
  @ApiQuery({ name: 'side', required: true, enum: ['LONG', 'SHORT'] })
  @ApiResponse({ status: 200, description: 'Potential PnL calculated successfully' })
  async calculatePotentialPnl(
    @Param('symbol') symbol: string,
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
    @Query('entryPrice') entryPrice?: string,
    @Query('exitPrice') exitPrice?: string,
    @Query('quantity') quantity?: string,
    @Query('side') side?: 'LONG' | 'SHORT',
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesBalanceService(ex, tt);
    return service.calculatePotentialPnl(symbol, entryPrice!, exitPrice!, quantity!, side!);
  }

  /**
   * Get available balance for trading
   */
  @Get('available')
  @ApiOperation({ summary: 'Get available balance for opening new positions' })
  @ApiQuery({
    name: 'exchange',
    required: false,
    enum: ['aster', 'hyperliquid'],
    example: 'hyperliquid',
  })
  @ApiQuery({
    name: 'tradingType',
    required: false,
    enum: ['perpetual'],
    example: 'perpetual',
  })
  @ApiResponse({ status: 200, description: 'Available balance retrieved successfully' })
  async getAvailableBalance(
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesBalanceService(ex, tt);
    return service.getAvailableBalance();
  }
}
