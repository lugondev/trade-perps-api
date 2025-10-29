import { Injectable, Logger } from '@nestjs/common';
import { formatSymbol } from './perp-market.utils';
import { mapOrder } from './perp-helpers';
import { CancelOrderParams } from '../../../../common/interfaces';
import { ApiResponse, Order } from '../../../../common/types';
import { HyperliquidApiService } from '../../shared/hyperliquid-api.service';

@Injectable()
export class OrderManagementService {
  private readonly logger = new Logger(OrderManagementService.name);

  constructor(private readonly apiService: HyperliquidApiService) {}

  /**
   * Cancel an order
   */
  async cancelOrder(params: CancelOrderParams): Promise<ApiResponse<any>> {
    try {
      const coin = formatSymbol(params.symbol);
      const result = await this.apiService.cancelOrder(coin, parseInt(params.orderId!));

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to cancel order',
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      return {
        success: true,
        data: {
          orderId: params.orderId,
          symbol: params.symbol,
          status: 'canceled',
        },
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    } catch (error: any) {
      this.logger.error(`Error canceling order: ${error.message}`);
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
   * Cancel all orders
   */
  async cancelAllOrders(symbol?: string): Promise<ApiResponse<any>> {
    try {
      const coin = symbol ? formatSymbol(symbol) : undefined;
      const result = await this.apiService.cancelAllOrders(coin);

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to cancel all orders',
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      return {
        success: true,
        data: {
          symbol: symbol || 'all',
          message: 'All orders canceled',
        },
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    } catch (error: any) {
      this.logger.error(`Error canceling all orders: ${error.message}`);
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
   * Get open orders
   */
  async getOpenOrders(symbol?: string): Promise<ApiResponse<Order[]>> {
    try {
      const result = await this.apiService.getOpenOrders();

      if (!result.success || !result.data) {
        return {
          success: false,
          error: 'Failed to get open orders',
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      let orders = result.data;

      if (symbol) {
        const coin = formatSymbol(symbol);
        orders = orders.filter((o: any) => o.coin === coin);
      }

      const mappedOrders: Order[] = orders.map((order: any) => mapOrder(order));

      return {
        success: true,
        data: mappedOrders,
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    } catch (error: any) {
      this.logger.error(`Error getting open orders: ${error.message}`);
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
   * Get order details
   */
  async getOrder(symbol: string, orderId: string): Promise<ApiResponse<Order>> {
    try {
      const openOrders = await this.getOpenOrders(symbol);

      if (!openOrders.success || !openOrders.data) {
        return {
          success: false,
          error: 'Failed to get order',
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      const order = openOrders.data.find(o => o.orderId === orderId);

      if (!order) {
        return {
          success: false,
          error: 'Order not found',
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      return {
        success: true,
        data: order,
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    } catch (error: any) {
      this.logger.error(`Error getting order: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    }
  }

  // use helpers from perp-market.utils
}
