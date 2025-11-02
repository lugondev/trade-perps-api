import { Injectable, Logger } from '@nestjs/common';
import { BinanceApiService } from '../../shared/binance-api.service';
import { OrderSide, TimeInForce, PositionSide } from '../../../../common/types/exchange.types';
import { BinanceOrderResponse } from '../../types';

@Injectable()
export class BinancePerpetualTradingService {
  private readonly logger = new Logger(BinancePerpetualTradingService.name);

  constructor(private readonly apiService: BinanceApiService) {}

  /**
   * Place a market order
   */
  async placeMarketOrder(params: {
    symbol: string;
    side: OrderSide;
    quantity: number;
    positionSide?: PositionSide;
    reduceOnly?: boolean;
  }): Promise<any> {
    try {
      this.logger.log(`Placing market order: ${params.side} ${params.quantity} ${params.symbol}`);

      const orderParams: any = {
        symbol: params.symbol,
        side: params.side,
        type: 'MARKET',
        quantity: params.quantity.toString(),
      };

      if (params.positionSide) {
        orderParams.positionSide = params.positionSide;
      }

      if (params.reduceOnly) {
        orderParams.reduceOnly = true;
      }

      const response = await this.apiService.post<BinanceOrderResponse>(
        '/fapi/v1/order',
        orderParams,
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to place market order');
      }

      return {
        success: true,
        data: {
          orderId: response.data.orderId.toString(),
          clientOrderId: response.data.clientOrderId,
          symbol: response.data.symbol,
          side: response.data.side,
          type: response.data.type,
          status: response.data.status,
          executedQty: parseFloat(response.data.executedQty),
          avgPrice: parseFloat(response.data.avgPrice),
          updateTime: response.data.updateTime,
        },
      };
    } catch (error: any) {
      this.logger.error('Error placing market order:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Place a limit order
   */
  async placeLimitOrder(params: {
    symbol: string;
    side: OrderSide;
    quantity: number;
    price: number;
    timeInForce?: TimeInForce;
    positionSide?: PositionSide;
    reduceOnly?: boolean;
  }): Promise<any> {
    try {
      this.logger.log(
        `Placing limit order: ${params.side} ${params.quantity} ${params.symbol} @ ${params.price}`,
      );

      const orderParams: any = {
        symbol: params.symbol,
        side: params.side,
        type: 'LIMIT',
        quantity: params.quantity.toString(),
        price: params.price.toString(),
        timeInForce: params.timeInForce || TimeInForce.GTC,
      };

      if (params.positionSide) {
        orderParams.positionSide = params.positionSide;
      }

      if (params.reduceOnly) {
        orderParams.reduceOnly = true;
      }

      const response = await this.apiService.post<BinanceOrderResponse>(
        '/fapi/v1/order',
        orderParams,
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to place limit order');
      }

      return {
        success: true,
        data: {
          orderId: response.data.orderId.toString(),
          clientOrderId: response.data.clientOrderId,
          symbol: response.data.symbol,
          side: response.data.side,
          type: response.data.type,
          price: parseFloat(response.data.price),
          status: response.data.status,
          executedQty: parseFloat(response.data.executedQty),
          updateTime: response.data.updateTime,
        },
      };
    } catch (error: any) {
      this.logger.error('Error placing limit order:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(symbol: string, orderId: string): Promise<any> {
    try {
      this.logger.log(`Canceling order ${orderId} for ${symbol}`);

      const response = await this.apiService.delete('/fapi/v1/order', {
        symbol,
        orderId: parseInt(orderId),
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to cancel order');
      }

      return {
        success: true,
        data: {
          orderId: response.data.orderId.toString(),
          symbol: response.data.symbol,
          status: response.data.status,
        },
      };
    } catch (error: any) {
      this.logger.error('Error canceling order:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Cancel all orders for a symbol
   */
  async cancelAllOrders(symbol: string): Promise<any> {
    try {
      this.logger.log(`Canceling all orders for ${symbol}`);

      const response = await this.apiService.delete('/fapi/v1/allOpenOrders', { symbol });

      if (!response.success) {
        throw new Error(response.error || 'Failed to cancel all orders');
      }

      return {
        success: true,
        data: {
          code: 200,
          msg: 'All orders canceled successfully',
        },
      };
    } catch (error: any) {
      this.logger.error('Error canceling all orders:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get order status
   */
  async getOrderStatus(symbol: string, orderId: string): Promise<any> {
    try {
      this.logger.log(`Getting order status for ${orderId}`);

      const response = await this.apiService.get<BinanceOrderResponse>('/fapi/v1/order', {
        symbol,
        orderId: parseInt(orderId),
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to get order status');
      }

      return {
        success: true,
        data: {
          orderId: response.data.orderId.toString(),
          symbol: response.data.symbol,
          status: response.data.status,
          side: response.data.side,
          type: response.data.type,
          price: parseFloat(response.data.price),
          avgPrice: parseFloat(response.data.avgPrice),
          executedQty: parseFloat(response.data.executedQty),
          origQty: parseFloat(response.data.origQty),
          updateTime: response.data.updateTime,
        },
      };
    } catch (error: any) {
      this.logger.error('Error getting order status:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get open orders
   */
  async getOpenOrders(symbol?: string): Promise<any> {
    try {
      this.logger.log('Fetching open orders...');

      const params = symbol ? { symbol } : {};
      const response = await this.apiService.get('/fapi/v1/openOrders', params);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to get open orders');
      }

      return {
        success: true,
        data: response.data.map((order: BinanceOrderResponse) => ({
          orderId: order.orderId.toString(),
          symbol: order.symbol,
          status: order.status,
          side: order.side,
          type: order.type,
          price: parseFloat(order.price),
          avgPrice: parseFloat(order.avgPrice),
          executedQty: parseFloat(order.executedQty),
          origQty: parseFloat(order.origQty),
          updateTime: order.updateTime,
        })),
      };
    } catch (error: any) {
      this.logger.error('Error getting open orders:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Set leverage for a symbol
   */
  async setLeverage(symbol: string, leverage: number): Promise<any> {
    try {
      this.logger.log(`Setting leverage to ${leverage}x for ${symbol}`);

      const response = await this.apiService.post('/fapi/v1/leverage', {
        symbol,
        leverage,
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to set leverage');
      }

      return {
        success: true,
        data: {
          leverage: response.data.leverage,
          symbol: response.data.symbol,
          maxNotionalValue: response.data.maxNotionalValue,
        },
      };
    } catch (error: any) {
      this.logger.error('Error setting leverage:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Set margin type (ISOLATED or CROSS)
   */
  async setMarginType(symbol: string, marginType: 'ISOLATED' | 'CROSSED'): Promise<any> {
    try {
      this.logger.log(`Setting margin type to ${marginType} for ${symbol}`);

      const response = await this.apiService.post('/fapi/v1/marginType', {
        symbol,
        marginType,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to set margin type');
      }

      return {
        success: true,
        data: {
          code: 200,
          msg: 'success',
        },
      };
    } catch (error: any) {
      this.logger.error('Error setting margin type:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Quick long by USD value with required TP/SL/leverage
   */
  async quickLong(
    symbol: string,
    usdValue: number,
    stopLossPercent: number,
    takeProfitPercent: number,
    leverage: number,
  ): Promise<any> {
    try {
      // 1. Set leverage first
      this.logger.log(`Setting leverage ${leverage}x for ${symbol}`);
      await this.setLeverage(symbol, leverage);

      // 2. Get current price
      const priceData = await this.apiService.get('/fapi/v1/ticker/price', { symbol });
      if (!priceData.success || !priceData.data) {
        return {
          success: false,
          error: 'Failed to get current price',
          timestamp: Date.now(),
        };
      }

      const currentPrice = parseFloat(priceData.data.price);

      // 3. Calculate quantity
      const quantity = parseFloat(((usdValue * leverage) / currentPrice).toFixed(3));

      this.logger.log(`Opening long position: ${quantity} ${symbol} @ $${currentPrice}`);

      // 4. Place entry market order (without positionSide for One-Way mode)
      const mainOrder = await this.placeMarketOrder({
        symbol,
        side: OrderSide.BUY,
        quantity,
      });

      if (!mainOrder.success) {
        this.logger.error('Failed to place entry order:', mainOrder.error);
        return mainOrder;
      }

      this.logger.log(`Entry order placed successfully: ${JSON.stringify(mainOrder.data)}`);

      // 5. Calculate SL/TP prices (2 decimals for USD pairs)
      const stopLossPrice = parseFloat((currentPrice * (1 - stopLossPercent / 100)).toFixed(2));
      const takeProfitPrice = parseFloat((currentPrice * (1 + takeProfitPercent / 100)).toFixed(2));

      this.logger.log(`Placing TP @ ${takeProfitPrice} and SL @ ${stopLossPrice}`);

      // 6. Place Stop Loss order (STOP_MARKET)
      const stopLossOrder = await this.apiService.post('/fapi/v1/order', {
        symbol,
        side: OrderSide.SELL,
        type: 'STOP_MARKET',
        stopPrice: stopLossPrice.toString(),
        closePosition: 'true',
      });

      // 7. Place Take Profit order (TAKE_PROFIT_MARKET)
      const takeProfitOrder = await this.apiService.post('/fapi/v1/order', {
        symbol,
        side: OrderSide.SELL,
        type: 'TAKE_PROFIT_MARKET',
        stopPrice: takeProfitPrice.toString(),
        closePosition: 'true',
      });

      this.logger.log('Quick long completed successfully');

      return {
        success: true,
        data: {
          mainOrder,
          stopLoss: stopLossOrder,
          takeProfit: takeProfitOrder,
          quantity,
          entryPrice: currentPrice,
          stopLossPrice,
          takeProfitPrice,
        },
        timestamp: Date.now(),
        exchange: 'binance',
        tradingType: 'perpetual',
      };
    } catch (error: any) {
      this.logger.error('Error in quick long:', error);
      return {
        success: false,
        error: error.message || 'Failed to execute quick long',
        timestamp: Date.now(),
        exchange: 'binance',
        tradingType: 'perpetual',
      };
    }
  }

  /**
   * Quick short by USD value with required TP/SL/leverage
   */
  async quickShort(
    symbol: string,
    usdValue: number,
    stopLossPercent: number,
    takeProfitPercent: number,
    leverage: number,
  ): Promise<any> {
    try {
      // 1. Set leverage first
      this.logger.log(`Setting leverage ${leverage}x for ${symbol}`);
      await this.setLeverage(symbol, leverage);

      // 2. Get current price
      const priceData = await this.apiService.get('/fapi/v1/ticker/price', { symbol });
      if (!priceData.success || !priceData.data) {
        return {
          success: false,
          error: 'Failed to get current price',
          timestamp: Date.now(),
        };
      }

      const currentPrice = parseFloat(priceData.data.price);

      // 3. Calculate quantity
      const quantity = parseFloat(((usdValue * leverage) / currentPrice).toFixed(3));

      this.logger.log(`Opening short position: ${quantity} ${symbol} @ $${currentPrice}`);

      // 4. Place entry market order (without positionSide for One-Way mode)
      const mainOrder = await this.placeMarketOrder({
        symbol,
        side: OrderSide.SELL,
        quantity,
      });

      if (!mainOrder.success) {
        this.logger.error('Failed to place entry order:', mainOrder.error);
        return mainOrder;
      }

      this.logger.log(`Entry order placed successfully: ${JSON.stringify(mainOrder.data)}`);

      // 5. Calculate SL/TP prices (SHORT: SL higher, TP lower)
      const stopLossPrice = parseFloat((currentPrice * (1 + stopLossPercent / 100)).toFixed(2));
      const takeProfitPrice = parseFloat((currentPrice * (1 - takeProfitPercent / 100)).toFixed(2));

      this.logger.log(`Placing TP @ ${takeProfitPrice} and SL @ ${stopLossPrice}`);

      // 6. Place Stop Loss order (STOP_MARKET) - SHORT: buy back to close
      const stopLossOrder = await this.apiService.post('/fapi/v1/order', {
        symbol,
        side: OrderSide.BUY,
        type: 'STOP_MARKET',
        stopPrice: stopLossPrice.toString(),
        closePosition: 'true',
      });

      // 7. Place Take Profit order (TAKE_PROFIT_MARKET)
      const takeProfitOrder = await this.apiService.post('/fapi/v1/order', {
        symbol,
        side: OrderSide.BUY,
        type: 'TAKE_PROFIT_MARKET',
        stopPrice: takeProfitPrice.toString(),
        closePosition: 'true',
      });

      this.logger.log('Quick short completed successfully');

      return {
        success: true,
        data: {
          mainOrder,
          stopLoss: stopLossOrder,
          takeProfit: takeProfitOrder,
          quantity,
          entryPrice: currentPrice,
          stopLossPrice,
          takeProfitPrice,
        },
        timestamp: Date.now(),
        exchange: 'binance',
        tradingType: 'perpetual',
      };
    } catch (error: any) {
      this.logger.error('Error in quick short:', error);
      return {
        success: false,
        error: error.message || 'Failed to execute quick short',
        timestamp: Date.now(),
        exchange: 'binance',
        tradingType: 'perpetual',
      };
    }
  }
}
