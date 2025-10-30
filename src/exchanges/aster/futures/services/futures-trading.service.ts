import { Injectable, Logger } from '@nestjs/common';
import {
  IFuturesTradingService,
  PlaceOrderParams,
  MarketOrderParams,
  LimitOrderParams,
  CancelOrderParams,
  SetLeverageParams,
  SetPositionModeParams,
  SetStopLossParams,
  SetTakeProfitParams,
} from '../../../../common/interfaces';
import {
  ApiResponse,
  Order,
  OrderSide,
  OrderType,
  TimeInForce,
  Position,
  PositionSide,
} from '../../../../common/types';
import { AsterApiService } from '../../shared/aster-api.service';
import { AsterFuturesBalanceService } from './futures-balance.service';
import { AsterFuturesMarketService } from './futures-market.service';

@Injectable()
export class AsterFuturesTradingService implements IFuturesTradingService {
  private readonly logger = new Logger(AsterFuturesTradingService.name);

  constructor(
    private readonly asterApiService: AsterApiService,
    private readonly balanceService: AsterFuturesBalanceService,
    private readonly marketService: AsterFuturesMarketService,
  ) {}

  /**
   * Place a new order - implements interface
   */
  async placeOrder(params: PlaceOrderParams): Promise<ApiResponse<Order>> {
    try {
      this.logger.debug(`Placing ${params.type} ${params.side} order for ${params.symbol}`);

      // Format quantity and price according to symbol precision
      const formattedQuantity = await this.marketService.formatQuantity(
        params.symbol,
        params.quantity,
      );

      let formattedPrice: string | undefined;
      if (params.price) {
        formattedPrice = await this.marketService.formatPrice(params.symbol, params.price);
      }

      let formattedStopPrice: string | undefined;
      if (params.stopPrice) {
        formattedStopPrice = await this.marketService.formatPrice(params.symbol, params.stopPrice);
      }

      const orderRequest: any = {
        symbol: params.symbol,
        side: params.side,
        type: params.type,
        quantity: formattedQuantity,
        timestamp: Date.now(),
        recvWindow: 50000,
      };

      // Add optional fields
      if (formattedPrice) orderRequest.price = formattedPrice;
      if (params.clientOrderId) orderRequest.newClientOrderId = params.clientOrderId;
      if (formattedStopPrice) orderRequest.stopPrice = formattedStopPrice;

      // Add timeInForce for LIMIT orders
      if (params.type === OrderType.LIMIT) {
        orderRequest.timeInForce = params.timeInForce || TimeInForce.GTC;
      }

      // Add workingType for STOP orders
      if (params.type.includes('STOP') || params.type.includes('TAKE_PROFIT')) {
        orderRequest.workingType = 'CONTRACT_PRICE';
      }

      // Add reduceOnly
      if (params.reduceOnly) {
        // Use boolean true for reduceOnly to match API expectations
        orderRequest.reduceOnly = true;
      }

      // Debug: log order request for troubleshooting conditional orders
      this.logger.debug('Aster order request body:', JSON.stringify(orderRequest));

      // Add positionSide if provided (required in hedge mode)
      if ((params as any).positionSide) {
        orderRequest.positionSide = (params as any).positionSide;
      }

      const response = await this.asterApiService.post<any>('/fapi/v3/order', orderRequest);

      if (response.success && response.data) {
        const order: Order = this.mapToStandardOrder(response.data);
        return {
          success: true,
          data: order,
          timestamp: Date.now(),
          exchange: 'aster',
          tradingType: 'perpetual',
        };
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
   * Cancel only conditional orders (STOP/TAKE_PROFIT/TRAILING stops) for a symbol
   */
  private async cancelConditionalOrders(symbol: string): Promise<void> {
    try {
      const params: any = { symbol, timestamp: Date.now(), recvWindow: 50000 };
      const resp = await this.asterApiService.hmacGet<any[]>('/fapi/v1/openOrders', params);
      if (!resp.success || !resp.data) return;

      const conditionalTypes = [
        OrderType.STOP_MARKET,
        OrderType.TAKE_PROFIT_MARKET,
        'STOP',
        'TAKE_PROFIT',
        'TRAILING_STOP_MARKET',
      ];

      for (const o of resp.data) {
        if (o && o.symbol === symbol && conditionalTypes.includes(o.type)) {
          try {
            await this.asterApiService.hmacDelete('/fapi/v1/order', {
              symbol,
              orderId: o.orderId,
              timestamp: Date.now(),
              recvWindow: 50000,
            });
            this.logger.debug(`Cancelled conditional order ${o.orderId} for ${symbol}`);
          } catch (e) {
            this.logger.debug(`Failed to cancel conditional order ${o.orderId}:`, e?.message || e);
          }
        }
      }
    } catch (error) {
      this.logger.debug('Error cancelling conditional orders:', error?.message || error);
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
      const cancelRequest: any = {
        symbol: params.symbol,
        timestamp: Date.now(),
        recvWindow: 50000,
      };

      if (params.orderId) cancelRequest.orderId = params.orderId;
      if (params.clientOrderId) cancelRequest.origClientOrderId = params.clientOrderId;

      return await this.asterApiService.hmacDelete('/fapi/v1/order', cancelRequest);
    } catch (error) {
      this.logger.error('Error cancelling order:', error);
      return {
        success: false,
        error: error.message || 'Failed to cancel order',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Cancel all orders
   */
  async cancelAllOrders(symbol?: string): Promise<ApiResponse<any>> {
    try {
      if (!symbol) {
        return {
          success: false,
          error: 'Symbol is required for cancelling all orders',
          timestamp: Date.now(),
        };
      }

      const params = {
        symbol,
        timestamp: Date.now(),
        recvWindow: 50000,
      };

      return await this.asterApiService.hmacDelete('/fapi/v1/allOpenOrders', params);
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
   * Get open orders
   */
  async getOpenOrders(symbol?: string): Promise<ApiResponse<Order[]>> {
    try {
      const params: any = {
        timestamp: Date.now(),
        recvWindow: 50000,
      };

      if (symbol) params.symbol = symbol;

      // Use hmacGet for authenticated endpoint
      const response = await this.asterApiService.hmacGet<any[]>('/fapi/v1/openOrders', params);

      if (response.success && response.data) {
        const orders: Order[] = response.data.map(o => this.mapToStandardOrder(o));
        return {
          success: true,
          data: orders,
          timestamp: Date.now(),
          exchange: 'aster',
          tradingType: 'perpetual',
        };
      }

      return response;
    } catch (error) {
      this.logger.error('Error getting open orders:', error);
      return {
        success: false,
        error: error.message || 'Failed to get open orders',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get order details
   */
  async getOrder(symbol: string, orderId: string): Promise<ApiResponse<Order>> {
    try {
      const params = {
        symbol,
        orderId,
        timestamp: Date.now(),
        recvWindow: 50000,
      };

      // Use hmacGet for authenticated endpoint
      const response = await this.asterApiService.hmacGet<any>('/fapi/v1/order', params);

      if (response.success && response.data) {
        const order: Order = this.mapToStandardOrder(response.data);
        return {
          success: true,
          data: order,
          timestamp: Date.now(),
          exchange: 'aster',
          tradingType: 'perpetual',
        };
      }

      return response;
    } catch (error) {
      this.logger.error('Error getting order:', error);
      return {
        success: false,
        error: error.message || 'Failed to get order',
        timestamp: Date.now(),
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
      timeInForce: TimeInForce.GTC,
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
      timeInForce: TimeInForce.GTC,
    });
  }

  // ==================== Futures-specific methods ====================

  /**
   * Get current positions
   */
  async getPositions(symbol?: string): Promise<ApiResponse<Position | Position[]>> {
    return this.balanceService.getPositions(symbol);
  }

  /**
   * Set leverage for symbol
   */
  async setLeverage(
    params: SetLeverageParams,
  ): Promise<ApiResponse<{ leverage: number; symbol: string }>> {
    try {
      const requestParams = {
        symbol: params.symbol,
        leverage: params.leverage,
        timestamp: Date.now(),
        recvWindow: 50000,
      };

      // Use HMAC POST for leverage to match v1 HMAC signing
      const response = await this.asterApiService.hmacPost('/fapi/v1/leverage', requestParams);

      if (response.success) {
        return {
          ...response,
          data: {
            leverage: params.leverage,
            symbol: params.symbol,
          },
        };
      }

      return response;
    } catch (error) {
      this.logger.error('Error setting leverage:', error);
      return {
        success: false,
        error: error.message || 'Failed to set leverage',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get current leverage for symbol
   */
  async getLeverage(symbol: string): Promise<ApiResponse<number>> {
    // Aster doesn't have direct API for getting leverage, return from position info
    try {
      const positionResponse = await this.getPositions(symbol);
      if (positionResponse.success && positionResponse.data) {
        const position = Array.isArray(positionResponse.data)
          ? positionResponse.data[0]
          : positionResponse.data;

        return {
          success: true,
          data: position?.leverage || 1,
          timestamp: Date.now(),
        };
      }

      return {
        success: false,
        error: 'Failed to get leverage',
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Set position mode (one-way or hedge mode)
   */
  async setPositionMode(params: SetPositionModeParams): Promise<ApiResponse<any>> {
    try {
      const requestParams = {
        dualSidePosition: params.dualSidePosition,
        timestamp: Date.now(),
        recvWindow: 50000,
      };

      return await this.asterApiService.post('/fapi/v1/positionSide/dual', requestParams);
    } catch (error) {
      this.logger.error('Error setting position mode:', error);
      return {
        success: false,
        error: error.message || 'Failed to set position mode',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get current position mode
   */
  async getPositionMode(): Promise<ApiResponse<{ dualSidePosition: boolean }>> {
    try {
      const params = {
        timestamp: Date.now(),
        recvWindow: 50000,
      };

      return await this.asterApiService.hmacGet('/fapi/v1/positionSide/dual', params);
    } catch (error) {
      this.logger.error('Error getting position mode:', error);
      return {
        success: false,
        error: error.message || 'Failed to get position mode',
        timestamp: Date.now(),
      };
    }
  }
  // Margin-related methods removed (margin is not supported)

  /**
   * Set stop loss for position
   */
  async setStopLoss(params: SetStopLossParams): Promise<ApiResponse<Order>> {
    const quantity = params.quantity || (await this.getPositionQuantity(params.symbol));
    const side = params.side || (await this.getOppositeSide(params.symbol));

    return this.placeOrder({
      symbol: params.symbol,
      side: side as OrderSide,
      type: OrderType.STOP_MARKET,
      quantity,
      stopPrice: params.stopPrice,
      reduceOnly: true,
    });
  }

  /**
   * Set take profit for position
   */
  async setTakeProfit(params: SetTakeProfitParams): Promise<ApiResponse<Order>> {
    const quantity = params.quantity || (await this.getPositionQuantity(params.symbol));
    const side = params.side || (await this.getOppositeSide(params.symbol));

    return this.placeOrder({
      symbol: params.symbol,
      side: side as OrderSide,
      type: OrderType.TAKE_PROFIT_MARKET,
      quantity,
      stopPrice: params.takeProfitPrice,
      reduceOnly: true,
    });
  }

  /**
   * Cancel all stop loss and take profit orders for symbol
   */
  async cancelAllConditionalOrders(symbol: string): Promise<ApiResponse<any>> {
    return this.cancelAllOrders(symbol);
  }

  /**
   * Get funding rate
   */
  async getFundingRate(symbol?: string): Promise<ApiResponse<any>> {
    return this.marketService.getFundingRate(symbol);
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
    return this.marketService.getFundingRateHistory(symbol, startTime, endTime, limit);
  }

  /**
   * Get position risk (margin ratio, liquidation price, etc.)
   */
  async getPositionRisk(symbol?: string): Promise<ApiResponse<any>> {
    try {
      const params: any = {
        timestamp: Date.now(),
        recvWindow: 50000,
      };

      if (symbol) {
        params.symbol = symbol;
      }

      return await this.asterApiService.hmacGet('/fapi/v2/positionRisk', params);
    } catch (error) {
      this.logger.error('Error getting position risk:', error);
      return {
        success: false,
        error: error.message || 'Failed to get position risk',
        timestamp: Date.now(),
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
    const qty = quantity || (await this.getPositionQuantity(symbol));
    return this.placeMarketOrder({
      symbol,
      side: OrderSide.SELL,
      quantity: qty,
      reduceOnly: true,
    });
  }

  /**
   * Close short position
   */
  async closeShort(symbol: string, quantity?: string): Promise<ApiResponse<Order>> {
    const qty = quantity || (await this.getPositionQuantity(symbol));
    return this.placeMarketOrder({
      symbol,
      side: OrderSide.BUY,
      quantity: qty,
      reduceOnly: true,
    });
  }

  /**
   * Helper: Get position quantity
   */
  private async getPositionQuantity(symbol: string): Promise<string> {
    const positionResponse = await this.getPositions(symbol);
    if (positionResponse.success && positionResponse.data) {
      const position = Array.isArray(positionResponse.data)
        ? positionResponse.data[0]
        : positionResponse.data;
      return Math.abs(parseFloat(position.size)).toString();
    }
    return '0';
  }

  /**
   * Helper: Get opposite side of current position
   */
  private async getOppositeSide(symbol: string): Promise<string> {
    const positionResponse = await this.getPositions(symbol);
    if (positionResponse.success && positionResponse.data) {
      const position = Array.isArray(positionResponse.data)
        ? positionResponse.data[0]
        : positionResponse.data;
      const positionSize = parseFloat(position.size);
      return positionSize > 0 ? 'SELL' : 'BUY';
    }
    return 'SELL';
  }

  /**
   * Close position (with TP/SL cleanup)
   */
  async closePosition(symbol: string, quantity?: string): Promise<ApiResponse<any>> {
    try {
      // Step 1: Cancel all open orders for this symbol (including TP/SL)
      this.logger.log(`Cancelling all open orders for ${symbol} before closing position`);
      const cancelResponse = await this.cancelAllOrders(symbol);

      if (!cancelResponse.success) {
        this.logger.warn(
          `Failed to cancel orders for ${symbol}, continuing with close:`,
          cancelResponse.error,
        );
      } else {
        this.logger.log(`Successfully cancelled all orders for ${symbol}`);
      }

      // Step 2: Get current position
      const positionsResponse = await this.balanceService.getPositions(symbol);
      if (!positionsResponse.success || !positionsResponse.data) {
        return positionsResponse;
      }

      const positions = Array.isArray(positionsResponse.data)
        ? positionsResponse.data
        : [positionsResponse.data];
      const position = positions.find(p => p.symbol === symbol);

      if (!position || parseFloat(position.size) === 0) {
        return {
          success: false,
          error: 'No open position found for this symbol',
          timestamp: Date.now(),
        };
      }

      // Step 3: Determine side to close position
      const positionSize = parseFloat(position.size);
      const side = positionSize > 0 ? OrderSide.SELL : OrderSide.BUY;
      const closeQty = quantity || Math.abs(positionSize).toString();

      this.logger.log(`Closing ${side} position for ${symbol}, quantity: ${closeQty}`);

      // Step 4: Place market order to close
      const closeResult = await this.placeMarketOrder({
        symbol,
        side,
        quantity: closeQty,
        reduceOnly: true,
      });

      if (closeResult.success) {
        this.logger.log(`Successfully closed position for ${symbol}`);
      }

      return closeResult;
    } catch (error) {
      this.logger.error('Error closing position:', error);
      return {
        success: false,
        error: error.message || 'Failed to close position',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Close all positions
   */
  async closeAllPositions(): Promise<ApiResponse<any>> {
    try {
      const positionsResponse = await this.balanceService.getPositions();
      if (!positionsResponse.success || !positionsResponse.data) {
        return positionsResponse;
      }

      const positions = Array.isArray(positionsResponse.data)
        ? positionsResponse.data
        : [positionsResponse.data];
      const openPositions = positions.filter(p => parseFloat(p.size) !== 0);

      if (openPositions.length === 0) {
        return {
          success: true,
          data: { message: 'No open positions to close' },
          timestamp: Date.now(),
        };
      }

      const results = [];
      for (const position of openPositions) {
        const result = await this.closePosition(position.symbol);
        results.push({ symbol: position.symbol, result });
      }

      return {
        success: true,
        data: results,
        timestamp: Date.now(),
      };
    } catch (error) {
      this.logger.error('Error closing all positions:', error);
      return {
        success: false,
        error: error.message || 'Failed to close all positions',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Quick long with SL/TP
   */
  async quickLong(
    symbol: string,
    usdValue: number,
    stopLossPercent: number = 15,
    takeProfitPercent: number = 15,
    leverage: number = 10,
  ): Promise<ApiResponse<any>> {
    try {
      // Set leverage
      const leverageResp = await this.setLeverage({ symbol, leverage });
      if (!leverageResp.success) {
        return leverageResp;
      }

      // Check account position mode (one-way vs hedge/dual-side). If hedge mode is disabled,
      // do not send positionSide with orders because the exchange will reject positionSide mismatches.
      let includePositionSide = false;
      try {
        const modeResp = await this.getPositionMode();
        this.logger.debug('getPositionMode response', JSON.stringify(modeResp));
        if (
          modeResp.success &&
          modeResp.data &&
          String(modeResp.data.dualSidePosition) === 'true'
        ) {
          includePositionSide = true;
        }
      } catch (err) {
        // ignore and proceed without positionSide
        includePositionSide = false;
      }

      // Get current price
      const priceResponse = await this.marketService.getCurrentPrice(symbol);
      if (!priceResponse.success || !priceResponse.data) {
        return priceResponse;
      }

      const currentPrice = parseFloat(priceResponse.data);
      const quantity = ((usdValue * leverage) / currentPrice).toFixed(8);

      // Place main order. Only include positionSide when account is in hedge (dual-side) mode.
      const mainOrderParams: any = {
        symbol,
        side: OrderSide.BUY,
        type: OrderType.MARKET,
        quantity,
      };
      if (includePositionSide) mainOrderParams.positionSide = PositionSide.LONG;
      const mainOrder = await this.placeOrder(mainOrderParams);

      if (!mainOrder.success) {
        return mainOrder;
      }

      // Calculate SL/TP prices
      const stopLossPriceRaw = currentPrice * (1 - stopLossPercent / 100);
      const takeProfitPriceRaw = currentPrice * (1 + takeProfitPercent / 100);
      const stopLossPrice = await this.marketService.formatPrice(
        symbol,
        stopLossPriceRaw.toString(),
      );
      const takeProfitPrice = await this.marketService.formatPrice(
        symbol,
        takeProfitPriceRaw.toString(),
      );

      this.logger.debug(
        `SL/TP prices - Raw SL: ${stopLossPriceRaw}, Formatted SL: ${stopLossPrice}, Raw TP: ${takeProfitPriceRaw}, Formatted TP: ${takeProfitPrice}`,
      );

      // Place SL and TP orders
      // Cancel existing open orders for the symbol to avoid duplicates
      try {
        // Cancel only conditional orders first (stop/take-profit/trailing) to avoid leftover conditional orders
        await this.cancelConditionalOrders(symbol);
      } catch (e) {
        // non-fatal, log and continue
        this.logger.debug(
          'Failed to cancel existing conditional orders before placing TP/SL:',
          e?.message || e,
        );
      }

      // Use batchOrders to place TP and SL together (HMAC v1)
      const orders: any[] = [];
      const slOrder: any = {
        symbol,
        side: OrderSide.SELL,
        type: OrderType.STOP_MARKET,
        stopPrice: stopLossPrice,
        workingType: 'CONTRACT_PRICE',
        newClientOrderId: `sl_${Date.now()}`,
      };
      const tpOrder: any = {
        symbol,
        side: OrderSide.SELL,
        type: OrderType.TAKE_PROFIT_MARKET,
        stopPrice: takeProfitPrice,
        workingType: 'CONTRACT_PRICE',
        newClientOrderId: `tp_${Date.now()}`,
      };
      // Use closePosition=true to close the full position (cannot be used with quantity or reduceOnly)
      if (includePositionSide) {
        slOrder.positionSide = PositionSide.LONG;
        tpOrder.positionSide = PositionSide.LONG;
        slOrder.closePosition = 'true';
        tpOrder.closePosition = 'true';
      } else {
        slOrder.closePosition = 'true';
        tpOrder.closePosition = 'true';
      }

      orders.push(slOrder, tpOrder);

      this.logger.debug('Aster batchOrders body:', JSON.stringify(orders));
      const batchResp = await this.asterApiService.hmacPost('/fapi/v1/batchOrders', {
        batchOrders: JSON.stringify(orders),
      });

      let stopLoss: any = batchResp;
      let takeProfit: any = batchResp;
      // batchResp.data is an array of per-order results; map them to stopLoss and takeProfit separately
      if (batchResp && batchResp.success && Array.isArray((batchResp as any).data)) {
        const arr = (batchResp as any).data;
        stopLoss = { success: true, data: [arr[0]] };
        takeProfit = { success: true, data: [arr[1]] };
      }

      return {
        success: true,
        data: { mainOrder, stopLoss, takeProfit },
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
   * Quick short with SL/TP
   */
  async quickShort(
    symbol: string,
    usdValue: number,
    stopLossPercent: number = 15,
    takeProfitPercent: number = 15,
    leverage: number = 10,
  ): Promise<ApiResponse<any>> {
    try {
      // Set leverage
      const leverageResp = await this.setLeverage({ symbol, leverage });
      if (!leverageResp.success) {
        return leverageResp;
      }

      // Check account position mode (one-way vs hedge/dual-side). If hedge mode is disabled,
      // do not send positionSide with orders because the exchange will reject positionSide mismatches.
      let includePositionSide = false;
      try {
        const modeResp = await this.getPositionMode();
        this.logger.debug('getPositionMode response', JSON.stringify(modeResp));
        if (
          modeResp.success &&
          modeResp.data &&
          String(modeResp.data.dualSidePosition) === 'true'
        ) {
          includePositionSide = true;
        }
      } catch (err) {
        // ignore and proceed without positionSide
        includePositionSide = false;
      }

      // Get current price
      const priceResponse = await this.marketService.getCurrentPrice(symbol);
      if (!priceResponse.success || !priceResponse.data) {
        return priceResponse;
      }

      const currentPrice = parseFloat(priceResponse.data);
      const quantity = ((usdValue * leverage) / currentPrice).toFixed(8);

      const mainOrderParams: any = {
        symbol,
        side: OrderSide.SELL,
        type: OrderType.MARKET,
        quantity,
      };
      if (includePositionSide) mainOrderParams.positionSide = PositionSide.SHORT;
      const mainOrder = await this.placeOrder(mainOrderParams);

      if (!mainOrder.success) {
        return mainOrder;
      }

      // Calculate SL/TP prices
      const stopLossPriceRaw = currentPrice * (1 + stopLossPercent / 100);
      const takeProfitPriceRaw = currentPrice * (1 - takeProfitPercent / 100);
      const stopLossPrice = await this.marketService.formatPrice(
        symbol,
        stopLossPriceRaw.toString(),
      );
      const takeProfitPrice = await this.marketService.formatPrice(
        symbol,
        takeProfitPriceRaw.toString(),
      );

      this.logger.debug(
        `SL/TP prices - Raw SL: ${stopLossPriceRaw}, Formatted SL: ${stopLossPrice}, Raw TP: ${takeProfitPriceRaw}, Formatted TP: ${takeProfitPrice}`,
      );

      // Place SL and TP orders
      // Use batchOrders to place TP and SL together (HMAC v1)
      const ordersShort: any[] = [];
      const slOrderShort: any = {
        symbol,
        side: OrderSide.BUY,
        type: OrderType.STOP_MARKET,
        stopPrice: stopLossPrice,
        workingType: 'CONTRACT_PRICE',
        newClientOrderId: `sl_${Date.now()}`,
      };
      const tpOrderShort: any = {
        symbol,
        side: OrderSide.BUY,
        type: OrderType.TAKE_PROFIT_MARKET,
        stopPrice: takeProfitPrice,
        workingType: 'CONTRACT_PRICE',
        newClientOrderId: `tp_${Date.now()}`,
      };
      // Use closePosition=true to close the full position (cannot be used with quantity or reduceOnly)
      if (includePositionSide) {
        slOrderShort.positionSide = PositionSide.SHORT;
        tpOrderShort.positionSide = PositionSide.SHORT;
        slOrderShort.closePosition = 'true';
        tpOrderShort.closePosition = 'true';
      } else {
        slOrderShort.closePosition = 'true';
        tpOrderShort.closePosition = 'true';
      }

      ordersShort.push(slOrderShort, tpOrderShort);

      this.logger.debug('Aster batchOrders body (short):', JSON.stringify(ordersShort));
      const batchRespShort = await this.asterApiService.hmacPost('/fapi/v1/batchOrders', {
        batchOrders: JSON.stringify(ordersShort),
      });

      let stopLoss: any = batchRespShort;
      let takeProfit: any = batchRespShort;
      if (batchRespShort && batchRespShort.success && Array.isArray((batchRespShort as any).data)) {
        const arr = (batchRespShort as any).data;
        stopLoss = { success: true, data: [arr[0]] };
        takeProfit = { success: true, data: [arr[1]] };
      }

      return {
        success: true,
        data: { mainOrder, stopLoss, takeProfit },
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

  /**
   * Map Aster response to standard Order format
   */
  private mapToStandardOrder(asterOrder: any): Order {
    return {
      orderId: asterOrder.orderId?.toString() || '',
      clientOrderId: asterOrder.clientOrderId,
      symbol: asterOrder.symbol,
      side: asterOrder.side as OrderSide,
      type: asterOrder.type as OrderType,
      status: asterOrder.status,
      price: asterOrder.price || '0',
      quantity: asterOrder.origQty || asterOrder.quantity || '0',
      executedQuantity: asterOrder.executedQty || '0',
      remainingQuantity: asterOrder.origQty
        ? (parseFloat(asterOrder.origQty) - parseFloat(asterOrder.executedQty || '0')).toString()
        : undefined,
      timestamp: asterOrder.time || asterOrder.transactTime || Date.now(),
      updateTime: asterOrder.updateTime,
    };
  }
}
