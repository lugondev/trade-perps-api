import { Injectable, Logger } from '@nestjs/common';
import { SetStopLossParams, SetTakeProfitParams } from '../../../../common/interfaces';
import {
  ApiResponse,
  Order,
  OrderSide,
  OrderType,
  OrderStatus,
  PositionSide,
} from '../../../../common/types';
import { HyperliquidApiService } from '../../shared/hyperliquid-api.service';
import { formatSymbol } from './perp-market.utils';
import { PositionService } from './position.service';

@Injectable()
export class RiskManagementService {
  private readonly logger = new Logger(RiskManagementService.name);

  constructor(
    private readonly apiService: HyperliquidApiService,
    private readonly positionService: PositionService,
  ) {}

  /**
   * Set stop loss for position
   */
  async setStopLoss(params: SetStopLossParams): Promise<ApiResponse<Order>> {
    try {
      const coin = formatSymbol(params.symbol);

      // Determine side based on current position or params
      let isBuy: boolean;
      if (params.side) {
        isBuy = params.side === 'BUY';
      } else {
        // Get position to determine side
        const positionsResponse = await this.positionService.getPositions(params.symbol);
        if (!positionsResponse.success || !positionsResponse.data) {
          return {
            success: false,
            error: 'No position found to set stop loss',
            timestamp: Date.now(),
            exchange: 'hyperliquid',
            tradingType: 'perpetual',
          };
        }

        const position = Array.isArray(positionsResponse.data)
          ? positionsResponse.data[0]
          : positionsResponse.data;

        // Stop loss is opposite of position: if long, stop loss is sell
        isBuy = position.side === PositionSide.SHORT;
      }

      const stopPrice = parseFloat(params.stopPrice);
      const quantity = params.quantity ? parseFloat(params.quantity) : undefined;

      const orderRequest: any = {
        coin,
        is_buy: isBuy,
        sz: quantity,
        limit_px: stopPrice.toFixed(2),
        order_type: {
          trigger: {
            isMarket: true,
            triggerPx: stopPrice,
            tpsl: 'sl',
          },
        },
        reduce_only: true,
      };

      const result = await this.apiService.placeOrder(orderRequest);

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to set stop loss',
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      const order: Order = {
        orderId: result.data?.response?.data?.statuses?.[0]?.resting?.oid?.toString() || 'unknown',
        symbol: params.symbol,
        side: isBuy ? OrderSide.BUY : OrderSide.SELL,
        type: OrderType.STOP_MARKET,
        status: OrderStatus.NEW,
        price: params.stopPrice,
        quantity: params.quantity || '0',
        executedQuantity: '0',
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
      this.logger.error(`Error setting stop loss: ${error.message}`);
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
   * Set take profit for position
   */
  async setTakeProfit(params: SetTakeProfitParams): Promise<ApiResponse<Order>> {
    try {
      const coin = formatSymbol(params.symbol);

      // Determine side based on current position or params
      let isBuy: boolean;
      if (params.side) {
        isBuy = params.side === 'BUY';
      } else {
        // Get position to determine side
        const positionsResponse = await this.positionService.getPositions(params.symbol);
        if (!positionsResponse.success || !positionsResponse.data) {
          return {
            success: false,
            error: 'No position found to set take profit',
            timestamp: Date.now(),
            exchange: 'hyperliquid',
            tradingType: 'perpetual',
          };
        }

        const position = Array.isArray(positionsResponse.data)
          ? positionsResponse.data[0]
          : positionsResponse.data;

        // Take profit is opposite of position: if long, take profit is sell
        isBuy = position.side === PositionSide.SHORT;
      }

      const takeProfitPrice = parseFloat(params.takeProfitPrice);
      const quantity = params.quantity ? parseFloat(params.quantity) : undefined;

      const orderRequest: any = {
        coin,
        is_buy: isBuy,
        sz: quantity,
        limit_px: takeProfitPrice.toFixed(2),
        order_type: {
          trigger: {
            isMarket: true,
            triggerPx: takeProfitPrice,
            tpsl: 'tp',
          },
        },
        reduce_only: true,
      };

      const result = await this.apiService.placeOrder(orderRequest);

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to set take profit',
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      const order: Order = {
        orderId: result.data?.response?.data?.statuses?.[0]?.resting?.oid?.toString() || 'unknown',
        symbol: params.symbol,
        side: isBuy ? OrderSide.BUY : OrderSide.SELL,
        type: OrderType.TAKE_PROFIT_MARKET,
        status: OrderStatus.NEW,
        price: params.takeProfitPrice,
        quantity: params.quantity || '0',
        executedQuantity: '0',
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
      this.logger.error(`Error setting take profit: ${error.message}`);
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
   * Cancel all conditional orders (stop loss / take profit)
   */
  async cancelAllConditionalOrders(symbol: string): Promise<ApiResponse<any>> {
    try {
      const coin = symbol ? formatSymbol(symbol) : undefined;
      const result = await this.apiService.cancelAllOrders(coin);

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to cancel all conditional orders',
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      return {
        success: true,
        data: {
          symbol: symbol || 'all',
          message: 'All conditional orders canceled',
        },
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    } catch (error: any) {
      this.logger.error(`Error canceling all conditional orders: ${error.message}`);
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
   * Format symbol from BTCUSDT to BTC
   */
  private formatSymbol(symbol: string): string {
    return symbol.replace(/USDT|USDC|-PERP/gi, '');
  }
}
