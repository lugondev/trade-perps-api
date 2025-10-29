import { Controller, Post, Get, Delete, Body, Query, Param, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ApiKeyAuth } from '../../common/decorators/api-key.decorator';
import { ExchangeServiceFactory } from '../../common/factory/exchange.factory';
import { ExchangeName, TradingType } from '../../common/types/exchange.types';
import { IFuturesTradingService } from '../../common/interfaces';
import {
  PlaceOrderDto,
  MarketOrderDto,
  LimitOrderDto,
  CancelOrderDto,
  SetLeverageDto,
  SetMarginTypeDto,
  SetPositionModeDto,
  ModifyPositionMarginDto,
  SetStopLossDto,
  SetTakeProfitDto,
  OpenPositionDto,
  ClosePositionDto,
} from '../../common/dto/trading.dto';

@ApiTags('🔄 Trading API')
@ApiKeyAuth()
@Controller('api/trading')
export class TradingController {
  private readonly logger = new Logger(TradingController.name);

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
   * Get futures trading service
   */
  private async getFuturesTradingService(
    exchange: ExchangeName,
    tradingType: TradingType,
  ): Promise<IFuturesTradingService> {
    return this.exchangeFactory.getTradingService(
      exchange,
      tradingType,
    ) as Promise<IFuturesTradingService>;
  }

  /**
   * Place a new order
   */
  @Post('order')
  @ApiOperation({ summary: 'Place a new order' })
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
  @ApiResponse({ status: 201, description: 'Order placed successfully' })
  async placeOrder(
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
    @Body() dto?: PlaceOrderDto,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = (await this.getFuturesTradingService(ex, tt)) as IFuturesTradingService;
    return service.placeOrder(dto!);
  }

  /**
   * Place market order
   */
  @Post('order/market')
  @ApiOperation({ summary: 'Place a market order' })
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
  @ApiResponse({ status: 201, description: 'Market order placed successfully' })
  async placeMarketOrder(
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
    @Body() dto?: MarketOrderDto,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesTradingService(ex, tt);
    return service.placeMarketOrder(dto!);
  }

  /**
   * Place limit order
   */
  @Post('order/limit')
  @ApiOperation({ summary: 'Place a limit order' })
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
  @ApiResponse({ status: 201, description: 'Limit order placed successfully' })
  async placeLimitOrder(
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
    @Body() dto?: LimitOrderDto,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesTradingService(ex, tt);
    return service.placeLimitOrder(dto!);
  }

  /**
   * Cancel an order
   */
  @Delete('order')
  @ApiOperation({ summary: 'Cancel an order' })
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
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  async cancelOrder(
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
    @Body() dto?: CancelOrderDto,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesTradingService(ex, tt);
    return service.cancelOrder(dto!);
  }

  /**
   * Cancel all orders
   */
  @Delete('orders/all')
  @ApiOperation({ summary: 'Cancel all orders for a symbol or all symbols' })
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
  @ApiQuery({ name: 'symbol', required: false, example: 'BTCUSDT' })
  @ApiResponse({ status: 200, description: 'All orders cancelled successfully' })
  async cancelAllOrders(
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
    @Query('symbol') symbol?: string,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesTradingService(ex, tt);
    return service.cancelAllOrders(symbol);
  }

  /**
   * Get open orders
   */
  @Get('orders/open')
  @ApiOperation({ summary: 'Get open orders' })
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
  @ApiQuery({ name: 'symbol', required: false, example: 'BTCUSDT' })
  @ApiResponse({ status: 200, description: 'Open orders retrieved successfully' })
  async getOpenOrders(
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
    @Query('symbol') symbol?: string,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesTradingService(ex, tt);
    return service.getOpenOrders(symbol);
  }

  /**
   * Get order details
   */
  @Get('order/:symbol/:orderId')
  @ApiOperation({ summary: 'Get order details' })
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
  @ApiResponse({ status: 200, description: 'Order details retrieved successfully' })
  async getOrder(
    @Param('symbol') symbol: string,
    @Param('orderId') orderId: string,
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesTradingService(ex, tt);
    return service.getOrder(symbol, orderId);
  }

  /**
   * Get current positions
   */
  @Get('positions')
  @ApiOperation({ summary: 'Get current positions' })
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
  @ApiQuery({ name: 'symbol', required: false, example: 'BTCUSDT' })
  @ApiResponse({ status: 200, description: 'Positions retrieved successfully' })
  async getPositions(
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
    @Query('symbol') symbol?: string,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesTradingService(ex, tt);
    return service.getPositions(symbol);
  }

  /**
   * Set leverage
   */
  @Post('leverage')
  @ApiOperation({ summary: 'Set leverage for a symbol' })
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
  @ApiResponse({ status: 200, description: 'Leverage set successfully' })
  async setLeverage(
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
    @Body() dto?: SetLeverageDto,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesTradingService(ex, tt);
    return service.setLeverage(dto!);
  }

  /**
   * Get leverage
   */
  @Get('leverage/:symbol')
  @ApiOperation({ summary: 'Get current leverage for a symbol' })
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
  @ApiResponse({ status: 200, description: 'Leverage retrieved successfully' })
  async getLeverage(
    @Param('symbol') symbol: string,
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesTradingService(ex, tt);
    return service.getLeverage(symbol);
  }

  /**
   * Set margin type
   */
  @Post('margin-type')
  @ApiOperation({ summary: 'Set margin type (ISOLATED or CROSSED)' })
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
  @ApiResponse({ status: 200, description: 'Margin type set successfully' })
  async setMarginType(
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
    @Body() dto?: SetMarginTypeDto,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesTradingService(ex, tt);
    return service.setMarginType(dto!);
  }

  /**
   * Get margin type
   */
  @Get('margin-type/:symbol')
  @ApiOperation({ summary: 'Get current margin type for a symbol' })
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
  @ApiResponse({ status: 200, description: 'Margin type retrieved successfully' })
  async getMarginType(
    @Param('symbol') symbol: string,
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesTradingService(ex, tt);
    return service.getMarginType(symbol);
  }

  /**
   * Set position mode
   */
  @Post('position-mode')
  @ApiOperation({ summary: 'Set position mode (one-way or hedge)' })
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
  @ApiResponse({ status: 200, description: 'Position mode set successfully' })
  async setPositionMode(
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
    @Body() dto?: SetPositionModeDto,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesTradingService(ex, tt);
    return service.setPositionMode(dto!);
  }

  /**
   * Get position mode
   */
  @Get('position-mode')
  @ApiOperation({ summary: 'Get current position mode' })
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
  @ApiResponse({ status: 200, description: 'Position mode retrieved successfully' })
  async getPositionMode(
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesTradingService(ex, tt);
    return service.getPositionMode();
  }

  /**
   * Modify position margin
   */
  @Post('position/margin')
  @ApiOperation({ summary: 'Add or reduce position margin (isolated positions only)' })
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
  @ApiResponse({ status: 200, description: 'Position margin modified successfully' })
  async modifyPositionMargin(
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
    @Body() dto?: ModifyPositionMarginDto,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesTradingService(ex, tt);
    return service.modifyPositionMargin(dto!);
  }

  /**
   * Set stop loss
   */
  @Post('stop-loss')
  @ApiOperation({ summary: 'Set stop loss for a position' })
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
  @ApiResponse({ status: 201, description: 'Stop loss set successfully' })
  async setStopLoss(
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
    @Body() dto?: SetStopLossDto,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesTradingService(ex, tt);
    return service.setStopLoss(dto!);
  }

  /**
   * Set take profit
   */
  @Post('take-profit')
  @ApiOperation({ summary: 'Set take profit for a position' })
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
  @ApiResponse({ status: 201, description: 'Take profit set successfully' })
  async setTakeProfit(
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
    @Body() dto?: SetTakeProfitDto,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesTradingService(ex, tt);
    return service.setTakeProfit(dto!);
  }

  /**
   * Cancel all conditional orders
   */
  @Delete('conditional-orders/:symbol')
  @ApiOperation({ summary: 'Cancel all stop loss and take profit orders for a symbol' })
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
  @ApiResponse({ status: 200, description: 'Conditional orders cancelled successfully' })
  async cancelAllConditionalOrders(
    @Param('symbol') symbol: string,
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesTradingService(ex, tt);
    return service.cancelAllConditionalOrders(symbol);
  }

  /**
   * Get funding rate
   */
  @Get('funding-rate')
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
  @ApiQuery({ name: 'symbol', required: false, example: 'BTCUSDT' })
  @ApiResponse({ status: 200, description: 'Funding rate retrieved successfully' })
  async getFundingRate(
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
    @Query('symbol') symbol?: string,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesTradingService(ex, tt);
    return service.getFundingRate(symbol);
  }

  /**
   * Get funding history
   */
  @Get('funding-history/:symbol')
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
  @ApiResponse({ status: 200, description: 'Funding history retrieved successfully' })
  async getFundingHistory(
    @Param('symbol') symbol: string,
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
    @Query('startTime') startTime?: number,
    @Query('endTime') endTime?: number,
    @Query('limit') limit?: number,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesTradingService(ex, tt);
    return service.getFundingHistory(symbol, startTime, endTime, limit);
  }

  /**
   * Get position risk
   */
  @Get('position/risk')
  @ApiOperation({ summary: 'Get position risk information' })
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
  @ApiQuery({ name: 'symbol', required: false, example: 'BTCUSDT' })
  @ApiResponse({ status: 200, description: 'Position risk retrieved successfully' })
  async getPositionRisk(
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
    @Query('symbol') symbol?: string,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesTradingService(ex, tt);
    return service.getPositionRisk(symbol);
  }

  /**
   * Open long position
   */
  @Post('position/long')
  @ApiOperation({ summary: 'Open long position with market order' })
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
  @ApiResponse({ status: 201, description: 'Long position opened successfully' })
  async openLong(
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
    @Body() dto?: OpenPositionDto,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesTradingService(ex, tt);
    return service.openLong(dto!.symbol, dto!.quantity);
  }

  /**
   * Open short position
   */
  @Post('position/short')
  @ApiOperation({ summary: 'Open short position with market order' })
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
  @ApiResponse({ status: 201, description: 'Short position opened successfully' })
  async openShort(
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
    @Body() dto?: OpenPositionDto,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesTradingService(ex, tt);
    return service.openShort(dto!.symbol, dto!.quantity);
  }

  /**
   * Close long position
   */
  @Post('position/close-long')
  @ApiOperation({ summary: 'Close long position' })
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
  @ApiResponse({ status: 200, description: 'Long position closed successfully' })
  async closeLong(
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
    @Body() dto?: ClosePositionDto,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesTradingService(ex, tt);
    return service.closeLong(dto!.symbol, dto?.quantity);
  }

  /**
   * Close short position
   */
  @Post('position/close-short')
  @ApiOperation({ summary: 'Close short position' })
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
  @ApiResponse({ status: 200, description: 'Short position closed successfully' })
  async closeShort(
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
    @Body() dto?: ClosePositionDto,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesTradingService(ex, tt);
    return service.closeShort(dto!.symbol, dto?.quantity);
  }

  /**
   * Close position
   */
  @Post('position/close')
  @ApiOperation({ summary: 'Close position (any side)' })
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
  @ApiResponse({ status: 200, description: 'Position closed successfully' })
  async closePosition(
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
    @Body() dto?: ClosePositionDto,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesTradingService(ex, tt);
    return service.closePosition(dto!.symbol, dto?.positionSide);
  }

  /**
   * Close all positions
   */
  @Post('positions/close-all')
  @ApiOperation({ summary: 'Close all open positions' })
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
  @ApiResponse({ status: 200, description: 'All positions closed successfully' })
  async closeAllPositions(
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesTradingService(ex, tt);
    return service.closeAllPositions();
  }

  /**
   * Quick market buy
   */
  @Post('quick/buy')
  @ApiOperation({ summary: 'Quick market buy' })
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
  @ApiResponse({ status: 201, description: 'Market buy executed successfully' })
  async marketBuy(
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
    @Body() dto?: OpenPositionDto,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesTradingService(ex, tt);
    return service.marketBuy(dto!.symbol, dto!.quantity);
  }

  /**
   * Quick market sell
   */
  @Post('quick/sell')
  @ApiOperation({ summary: 'Quick market sell' })
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
  @ApiResponse({ status: 201, description: 'Market sell executed successfully' })
  async marketSell(
    @Query('exchange') exchange?: string,
    @Query('tradingType') tradingType?: string,
    @Body() dto?: OpenPositionDto,
  ) {
    const { exchange: ex, tradingType: tt } = this.getExchangeParams(exchange, tradingType);
    const service = await this.getFuturesTradingService(ex, tt);
    return service.marketSell(dto!.symbol, dto!.quantity);
  }
}
