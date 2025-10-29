import { Injectable, Logger } from '@nestjs/common';
import {
  IFuturesTradingService,
  PlaceOrderParams,
  MarketOrderParams,
  LimitOrderParams,
  CancelOrderParams,
  SetLeverageParams,
  SetMarginTypeParams,
  SetPositionModeParams,
  ModifyPositionMarginParams,
  SetStopLossParams,
  SetTakeProfitParams,
} from '../../../../common/interfaces';
import { ApiResponse, Order, OrderSide, PositionSide } from '../../../../common/types';
import { OrderPlacementService } from './order-placement.service';
import { OrderManagementService } from './order-management.service';
import { PositionService } from './position.service';
import { RiskManagementService } from './risk-management.service';
import { HyperliquidApiService } from '../../shared/hyperliquid-api.service';
import { formatSymbol } from './perp-market.utils';

@Injectable()
export class HyperliquidPerpTradingService implements IFuturesTradingService {
  private readonly logger = new Logger(HyperliquidPerpTradingService.name);

  constructor(
    private readonly orderPlacementService: OrderPlacementService,
    private readonly orderManagementService: OrderManagementService,
    private readonly positionService: PositionService,
    private readonly riskManagementService: RiskManagementService,
    private readonly apiService: HyperliquidApiService,
  ) {}

  /**
   * Place a new order - implements interface
   */
  async placeOrder(params: PlaceOrderParams): Promise<ApiResponse<Order>> {
    return this.orderPlacementService.placeOrder(params);
  }

  /**
   * Place market order
   */
  async placeMarketOrder(params: MarketOrderParams): Promise<ApiResponse<Order>> {
    return this.orderPlacementService.placeMarketOrder(params);
  }

  /**
   * Place limit order
   */
  async placeLimitOrder(params: LimitOrderParams): Promise<ApiResponse<Order>> {
    return this.orderPlacementService.placeLimitOrder(params);
  }

  /**
   * Cancel an order
   */
  async cancelOrder(params: CancelOrderParams): Promise<ApiResponse<any>> {
    return this.orderManagementService.cancelOrder(params);
  }

  /**
   * Cancel all orders
   */
  async cancelAllOrders(symbol?: string): Promise<ApiResponse<any>> {
    return this.orderManagementService.cancelAllOrders(symbol);
  }

  /**
   * Get open orders
   */
  async getOpenOrders(symbol?: string): Promise<ApiResponse<Order[]>> {
    return this.orderManagementService.getOpenOrders(symbol);
  }

  /**
   * Get order details
   */
  async getOrder(symbol: string, orderId: string): Promise<ApiResponse<Order>> {
    return this.orderManagementService.getOrder(symbol, orderId);
  }

  /**
   * Quick market buy
   */
  async marketBuy(symbol: string, quantity: string): Promise<ApiResponse<Order>> {
    return this.orderPlacementService.marketBuy(symbol, quantity);
  }

  /**
   * Quick market sell
   */
  async marketSell(symbol: string, quantity: string): Promise<ApiResponse<Order>> {
    return this.orderPlacementService.marketSell(symbol, quantity);
  }

  /**
   * Quick limit buy
   */
  async limitBuy(symbol: string, quantity: string, price: string): Promise<ApiResponse<Order>> {
    return this.orderPlacementService.limitBuy(symbol, quantity, price);
  }

  /**
   * Quick limit sell
   */
  async limitSell(symbol: string, quantity: string, price: string): Promise<ApiResponse<Order>> {
    return this.orderPlacementService.limitSell(symbol, quantity, price);
  }

  /**
   * Get current positions
   */
  async getPositions(symbol?: string): Promise<ApiResponse<any>> {
    return this.positionService.getPositions(symbol);
  }

  /**
   * Set leverage for symbol
   */
  async setLeverage(
    params: SetLeverageParams,
  ): Promise<ApiResponse<{ leverage: number; symbol: string }>> {
    return this.positionService.setLeverage(params);
  }

  /**
   * Get current leverage for symbol
   */
  async getLeverage(symbol: string): Promise<ApiResponse<number>> {
    return this.positionService.getLeverage(symbol);
  }

  /**
   * Set margin type (ISOLATED or CROSSED)
   */
  async setMarginType(params: SetMarginTypeParams): Promise<ApiResponse<any>> {
    return this.positionService.setMarginType(params);
  }

  /**
   * Get current margin type
   */
  async getMarginType(symbol: string): Promise<ApiResponse<'ISOLATED' | 'CROSSED'>> {
    return this.positionService.getMarginType(symbol);
  }

  /**
   * Set position mode (one-way or hedge mode)
   * Note: Hyperliquid only supports one-way mode
   */
  async setPositionMode(params: SetPositionModeParams): Promise<ApiResponse<any>> {
    return this.positionService.setPositionMode(params);
  }

  /**
   * Get current position mode
   */
  async getPositionMode(): Promise<ApiResponse<{ dualSidePosition: boolean }>> {
    return this.positionService.getPositionMode();
  }

  /**
   * Modify position margin (add or reduce)
   */
  async modifyPositionMargin(params: ModifyPositionMarginParams): Promise<ApiResponse<any>> {
    return this.positionService.modifyPositionMargin(params);
  }

  /**
   * Set stop loss for position
   */
  async setStopLoss(params: SetStopLossParams): Promise<ApiResponse<Order>> {
    return this.riskManagementService.setStopLoss(params);
  }

  /**
   * Set take profit for position
   */
  async setTakeProfit(params: SetTakeProfitParams): Promise<ApiResponse<Order>> {
    return this.riskManagementService.setTakeProfit(params);
  }

  /**
   * Cancel all conditional orders (stop loss / take profit)
   */
  async cancelAllConditionalOrders(symbol: string): Promise<ApiResponse<any>> {
    return this.riskManagementService.cancelAllConditionalOrders(symbol);
  }

  /**
   * Close all positions
   */
  async closeAllPositions(): Promise<ApiResponse<Order[]>> {
    try {
      const positionsResponse = await this.positionService.getPositions();

      if (!positionsResponse.success || !positionsResponse.data) {
        return {
          success: false,
          error: 'No positions to close',
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      const positions = Array.isArray(positionsResponse.data)
        ? positionsResponse.data
        : [positionsResponse.data];

      if (positions.length === 0) {
        return {
          success: true,
          data: [],
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      const results = await Promise.all(
        positions.map(async pos => {
          try {
            const side = pos.side === PositionSide.LONG ? OrderSide.SELL : OrderSide.BUY;

            const orderResponse = await this.orderPlacementService.placeMarketOrder({
              symbol: pos.symbol,
              side,
              quantity: pos.size,
              reduceOnly: true,
            });

            return orderResponse.data!;
          } catch (error: any) {
            this.logger.error(`Failed to close position for ${pos.symbol}: ${error.message}`);
            throw error;
          }
        }),
      );

      return {
        success: true,
        data: results,
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    } catch (error: any) {
      this.logger.error(`Error closing all positions: ${error.message}`);
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
   * Get funding rate
   */
  async getFundingRate(symbol?: string): Promise<ApiResponse<any>> {
    try {
      if (!symbol) {
        return {
          success: false,
          error: 'Symbol is required for Hyperliquid funding rate',
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      const coin = formatSymbol(symbol);
      const result = await this.apiService.getFundingHistory(coin);

      if (!result.success || !result.data || result.data.length === 0) {
        return {
          success: false,
          error: 'Failed to get funding rate',
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      const latestFunding = result.data[0];
      return {
        success: true,
        data: {
          symbol,
          fundingRate: latestFunding.fundingRate,
          nextFundingTime: latestFunding.nextFundingTime,
        },
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    } catch (error: any) {
      this.logger.error(`Error getting funding rate: ${error.message}`);
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
   * Get funding history
   */
  async getFundingHistory(
    symbol: string,
    startTime?: number,
    endTime?: number,
  ): Promise<ApiResponse<any[]>> {
    try {
      const coin = formatSymbol(symbol);
      const result = await this.apiService.getFundingHistory(coin, startTime, endTime);

      if (!result.success || !result.data) {
        return {
          success: false,
          error: 'Failed to get funding history',
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      return {
        success: true,
        data: result.data,
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    } catch (error: any) {
      this.logger.error(`Error getting funding history: ${error.message}`);
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
   * Close position (market order)
   */
  async closePosition(symbol: string, positionSide?: PositionSide): Promise<ApiResponse<Order>> {
    try {
      const positionsResponse = await this.positionService.getPositions(symbol);

      if (!positionsResponse.success || !positionsResponse.data) {
        return {
          success: false,
          error: 'No position found for symbol',
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      const positions = Array.isArray(positionsResponse.data)
        ? positionsResponse.data
        : [positionsResponse.data];

      const position = positions.find(p => p.symbol === symbol);
      if (!position) {
        return {
          success: false,
          error: 'No position found for symbol',
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      // If positionSide specified, check if it matches
      if (positionSide && position.side !== positionSide) {
        return {
          success: false,
          error: `Position side mismatch. Requested: ${positionSide}, Actual: ${position.side}`,
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      const side = position.side === PositionSide.LONG ? OrderSide.SELL : OrderSide.BUY;

      return this.orderPlacementService.placeMarketOrder({
        symbol,
        side,
        quantity: position.size,
        reduceOnly: true,
      });
    } catch (error: any) {
      this.logger.error(`Error closing position: ${error.message}`);
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
   * Get position risk (margin ratio, liquidation price, etc.)
   */
  async getPositionRisk(symbol?: string): Promise<ApiResponse<any>> {
    try {
      const positionsResponse = await this.positionService.getPositions(symbol);

      if (!positionsResponse.success || !positionsResponse.data) {
        return {
          success: false,
          error: 'No positions found',
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      const positions = Array.isArray(positionsResponse.data)
        ? positionsResponse.data
        : [positionsResponse.data];

      const riskData = positions.map(pos => ({
        symbol: pos.symbol,
        leverage: pos.leverage,
        liquidationPrice: pos.liquidationPrice,
        unrealizedPnL: pos.unrealizedPnl,
        entryPrice: pos.entryPrice,
        size: pos.size,
        side: pos.side,
      }));

      return {
        success: true,
        data: symbol ? riskData[0] : riskData,
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    } catch (error: any) {
      this.logger.error(`Error getting position risk: ${error.message}`);
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
   * Open long position with market order
   */
  async openLong(symbol: string, quantity: string): Promise<ApiResponse<Order>> {
    return this.orderPlacementService.marketBuy(symbol, quantity);
  }

  /**
   * Open short position with market order
   */
  async openShort(symbol: string, quantity: string): Promise<ApiResponse<Order>> {
    return this.orderPlacementService.marketSell(symbol, quantity);
  }

  /**
   * Close long position
   */
  async closeLong(symbol: string, quantity?: string): Promise<ApiResponse<Order>> {
    try {
      const positionsResponse = await this.positionService.getPositions(symbol);

      if (!positionsResponse.success || !positionsResponse.data) {
        return {
          success: false,
          error: 'No long position found for symbol',
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      const positions = Array.isArray(positionsResponse.data)
        ? positionsResponse.data
        : [positionsResponse.data];

      const position = positions.find(p => p.symbol === symbol && p.side === PositionSide.LONG);
      if (!position) {
        return {
          success: false,
          error: 'No long position found for symbol',
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      const closeQuantity = quantity || position.size;

      return this.orderPlacementService.placeMarketOrder({
        symbol,
        side: OrderSide.SELL,
        quantity: closeQuantity,
        reduceOnly: true,
      });
    } catch (error: any) {
      this.logger.error(`Error closing long position: ${error.message}`);
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
   * Close short position
   */
  async closeShort(symbol: string, quantity?: string): Promise<ApiResponse<Order>> {
    try {
      const positionsResponse = await this.positionService.getPositions(symbol);

      if (!positionsResponse.success || !positionsResponse.data) {
        return {
          success: false,
          error: 'No short position found for symbol',
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      const positions = Array.isArray(positionsResponse.data)
        ? positionsResponse.data
        : [positionsResponse.data];

      const position = positions.find(p => p.symbol === symbol && p.side === PositionSide.SHORT);
      if (!position) {
        return {
          success: false,
          error: 'No short position found for symbol',
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      const closeQuantity = quantity || position.size;

      return this.orderPlacementService.placeMarketOrder({
        symbol,
        side: OrderSide.BUY,
        quantity: closeQuantity,
        reduceOnly: true,
      });
    } catch (error: any) {
      this.logger.error(`Error closing short position: ${error.message}`);
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
