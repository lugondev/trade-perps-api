import { Injectable, Logger } from '@nestjs/common';
import {
  PlaceOrderParams,
  MarketOrderParams,
  LimitOrderParams,
} from '../../../../common/interfaces';
import {
  ApiResponse,
  Order,
  OrderSide,
  OrderType,
  OrderStatus,
  TimeInForce,
} from '../../../../common/types';
import { HyperliquidApiService } from '../../shared/hyperliquid-api.service';
import { formatSymbol } from './perp-market.utils';

@Injectable()
export class OrderPlacementService {
  private readonly logger = new Logger(OrderPlacementService.name);

  constructor(private readonly apiService: HyperliquidApiService) {}

  /**
   * Place a new order
   */
  async placeOrder(params: PlaceOrderParams): Promise<ApiResponse<Order>> {
    try {
      this.logger.debug(`Placing ${params.type} ${params.side} order for ${params.symbol}`);

      const coin = formatSymbol(params.symbol);
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
      } else if (
        params.type === OrderType.STOP_MARKET ||
        params.type === OrderType.TAKE_PROFIT_MARKET
      ) {
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
   * Format symbol from BTCUSDT to BTC
   */
  // formatSymbol moved to perp-market.utils
}
