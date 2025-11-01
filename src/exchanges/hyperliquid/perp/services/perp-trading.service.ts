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
import { ApiResponse, Order, OrderSide, PositionSide } from '../../../../common/types';
import { OrderPlacementService } from './order-placement.service';
import { OrderManagementService } from './order-management.service';
import { PositionService } from './position.service';
import { RiskManagementService } from './risk-management.service';
import { HyperliquidPerpMarketService } from './perp-market.service';
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
    private readonly marketService: HyperliquidPerpMarketService,
  ) {}

  /**
   * Wait for position to appear after market order
   * Retries up to maxRetries times with delay between attempts
   */
  private async waitForPosition(
    symbol: string,
    maxRetries: number = 10,
    delayMs: number = 800,
  ): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      const positionsResponse = await this.positionService.getPositions(symbol);

      if (positionsResponse.success && positionsResponse.data) {
        const position = Array.isArray(positionsResponse.data)
          ? positionsResponse.data[0]
          : positionsResponse.data;

        if (position && parseFloat(position.size) > 0) {
          this.logger.log(`Position found for ${symbol} after ${i + 1} attempts`);
          return true;
        }
      }

      if (i < maxRetries - 1) {
        this.logger.log(`Waiting for position ${symbol}... attempt ${i + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    this.logger.warn(`Position not found for ${symbol} after ${maxRetries} attempts`);
    return false;
  }

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

  // Margin-related methods removed (margin is not supported)

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

  // Margin-related methods removed (margin is not supported)

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

      // IMPORTANT: Cancel all conditional orders first before closing positions
      this.logger.log('Canceling all conditional orders before closing all positions');
      await this.riskManagementService.cancelAllConditionalOrders('');

      const results = await Promise.all(
        positions.map(async pos => {
          try {
            // Validate position size
            const parsedSize = parseFloat(pos.size || '0');
            if (!parsedSize || parsedSize <= 0) {
              this.logger.warn(
                `Skipping position with invalid size: ${pos.symbol} size=${pos.size}`,
              );
              throw new Error(`Invalid position size: ${pos.size}`);
            }

            const side = pos.side === PositionSide.LONG ? OrderSide.SELL : OrderSide.BUY;

            this.logger.log(`Closing ${pos.side} position: ${pos.size} ${pos.symbol}`);

            const orderResponse = await this.orderPlacementService.placeMarketOrder({
              symbol: pos.symbol,
              side,
              quantity: pos.size,
              reduceOnly: true,
            });

            if (!orderResponse.success) {
              this.logger.error(
                `Failed to close position for ${pos.symbol}: ${orderResponse.error}`,
              );
              throw new Error(orderResponse.error || 'Failed to place close order');
            }

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

      // Validate quantity
      const parsedQty = parseFloat(position.size || '0');
      if (!parsedQty || parsedQty <= 0) {
        this.logger.error(
          `Refusing to close position: invalid size=${position.size} for ${symbol}`,
        );
        return {
          success: false,
          error: `Invalid position size: ${position.size}`,
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      // IMPORTANT: Cancel all TP/SL orders before closing position
      this.logger.log(`Canceling all conditional orders for ${symbol} before closing position`);
      await this.riskManagementService.cancelAllConditionalOrders(symbol);

      const side = position.side === PositionSide.LONG ? OrderSide.SELL : OrderSide.BUY;

      this.logger.log(`Closing ${position.side} position: ${position.size} ${symbol}`);
      this.logger.debug(`Position being closed: ${JSON.stringify(position)}`);

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
   * Quick long by USD value with required TP/SL/leverage
   */
  async quickLong(
    symbol: string,
    usdValue: number,
    stopLossPercent: number,
    takeProfitPercent: number,
    leverage: number,
  ): Promise<ApiResponse<any>> {
    try {
      // Check balance first
      const userState = await this.apiService.getUserState();
      if (!userState.success || !userState.data) {
        return {
          success: false,
          error: 'Failed to get account state',
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      const accountValue = parseFloat(userState.data.crossMarginSummary?.accountValue || '0');
      const requiredMargin = usdValue; // Required margin for the position

      if (accountValue < requiredMargin) {
        return {
          success: false,
          error: `Insufficient balance. Required: $${requiredMargin}, Available: $${accountValue}`,
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      // 1. Set leverage first
      this.logger.log(`Setting leverage ${leverage}x for ${symbol}`);
      await this.positionService.setLeverage({ symbol, leverage });

      // 2. Get current price
      const priceResponse = await this.marketService.getCurrentPrice(symbol);
      if (!priceResponse.success || !priceResponse.data) {
        return priceResponse;
      }

      const currentPrice = parseFloat(priceResponse.data);
      const quantity = ((usdValue * leverage) / currentPrice).toFixed(8);

      this.logger.log(`Opening long position: ${quantity} ${symbol} @ $${currentPrice}`);

      // 3. Place entry order
      const mainOrder = await this.orderPlacementService.marketBuy(symbol, quantity);
      if (!mainOrder.success) {
        this.logger.error('Failed to place entry order:', mainOrder.error);
        return mainOrder;
      }

      this.logger.log(`Entry order placed successfully: ${JSON.stringify(mainOrder.data)}`);

      // 4. Compute SL/TP prices immediately (use 1 decimal for Hyperliquid)
      const stopLossPrice = (currentPrice * (1 - stopLossPercent / 100)).toFixed(1);
      const takeProfitPrice = (currentPrice * (1 + takeProfitPercent / 100)).toFixed(1);

      this.logger.log(
        `Placing TP @ ${takeProfitPrice} and SL @ ${stopLossPrice} with quantity ${quantity}`,
      );

      // 5. Place TP/SL orders immediately (with retry logic)
      // For LONG: SL is SELL, TP is SELL
      const stopLoss = await this.placeStopLossWithRetry(
        symbol,
        stopLossPrice,
        quantity,
        OrderSide.SELL,
        3,
      );
      const takeProfit = await this.placeTakeProfitWithRetry(
        symbol,
        takeProfitPrice,
        quantity,
        OrderSide.SELL,
        3,
      );

      this.logger.log('Quick long completed successfully');
      this.logger.log(`TP Order: ${stopLoss.success ? stopLoss.data?.orderId : 'FAILED'}`);
      this.logger.log(`SL Order: ${takeProfit.success ? takeProfit.data?.orderId : 'FAILED'}`);

      return {
        success: true,
        data: {
          mainOrder,
          stopLoss,
          takeProfit,
          quantity,
          entryPrice: currentPrice,
          stopLossPrice,
          takeProfitPrice,
        },
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    } catch (error: any) {
      this.logger.error('Error in quick long:', error);
      return {
        success: false,
        error: error.message || 'Failed to execute quick long',
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    }
  }

  /**
   * Open short position with market order
   */
  async openShort(symbol: string, quantity: string): Promise<ApiResponse<Order>> {
    return this.orderPlacementService.marketSell(symbol, quantity);
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
  ): Promise<ApiResponse<any>> {
    try {
      // 1. Set leverage first
      this.logger.log(`Setting leverage ${leverage}x for ${symbol}`);
      await this.positionService.setLeverage({ symbol, leverage });

      // 2. Get current price
      const priceResponse = await this.marketService.getCurrentPrice(symbol);
      if (!priceResponse.success || !priceResponse.data) {
        return priceResponse;
      }

      const currentPrice = parseFloat(priceResponse.data);
      const quantity = ((usdValue * leverage) / currentPrice).toFixed(8);

      this.logger.log(`Opening short position: ${quantity} ${symbol} @ $${currentPrice}`);

      // 3. Place entry order
      const mainOrder = await this.orderPlacementService.marketSell(symbol, quantity);
      if (!mainOrder.success) {
        this.logger.error('Failed to place entry order:', mainOrder.error);
        return mainOrder;
      }

      this.logger.log(`Entry order placed successfully: ${JSON.stringify(mainOrder.data)}`);

      // 4. Compute SL/TP prices immediately (use 1 decimal for Hyperliquid - SHORT: SL higher, TP lower)
      const stopLossPrice = (currentPrice * (1 + stopLossPercent / 100)).toFixed(1);
      const takeProfitPrice = (currentPrice * (1 - takeProfitPercent / 100)).toFixed(1);

      this.logger.log(
        `Placing TP @ ${takeProfitPrice} and SL @ ${stopLossPrice} with quantity ${quantity}`,
      );

      // 5. Place TP/SL orders immediately (with retry logic) - SHORT position closes with BUY orders
      const stopLoss = await this.placeStopLossWithRetry(
        symbol,
        stopLossPrice,
        quantity,
        OrderSide.BUY,
        3,
      );
      const takeProfit = await this.placeTakeProfitWithRetry(
        symbol,
        takeProfitPrice,
        quantity,
        OrderSide.BUY,
        3,
      );

      this.logger.log('Quick short completed successfully');
      this.logger.log(`TP Order: ${stopLoss.success ? stopLoss.data?.orderId : 'FAILED'}`);
      this.logger.log(`SL Order: ${takeProfit.success ? takeProfit.data?.orderId : 'FAILED'}`);

      return {
        success: true,
        data: {
          mainOrder,
          stopLoss,
          takeProfit,
          quantity,
          entryPrice: currentPrice,
          stopLossPrice,
          takeProfitPrice,
        },
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    } catch (error: any) {
      this.logger.error('Error in quick short:', error);
      return {
        success: false,
        error: error.message || 'Failed to execute quick short',
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    }
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

      // Validate quantity
      const parsedQty = parseFloat(closeQuantity || '0');
      if (!parsedQty || parsedQty <= 0) {
        this.logger.error(
          `Refusing to close long: invalid close quantity=${closeQuantity} for ${symbol}`,
        );
        return {
          success: false,
          error: `Invalid close quantity: ${closeQuantity}`,
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      // IMPORTANT: Cancel all TP/SL orders before closing position
      this.logger.log(`Canceling all conditional orders for ${symbol} before closing position`);
      await this.riskManagementService.cancelAllConditionalOrders(symbol);

      this.logger.log(`Closing long position: ${closeQuantity} ${symbol}`);
      this.logger.debug(`Position being closed: ${JSON.stringify(position)}`);

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

      // Validate quantity
      const parsedQty = parseFloat(closeQuantity || '0');
      if (!parsedQty || parsedQty <= 0) {
        this.logger.error(
          `Refusing to close short: invalid close quantity=${closeQuantity} for ${symbol}`,
        );
        return {
          success: false,
          error: `Invalid close quantity: ${closeQuantity}`,
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      // IMPORTANT: Cancel all TP/SL orders before closing position
      this.logger.log(`Canceling all conditional orders for ${symbol} before closing position`);
      await this.riskManagementService.cancelAllConditionalOrders(symbol);

      this.logger.log(`Closing short position: ${closeQuantity} ${symbol}`);
      this.logger.debug(`Position being closed: ${JSON.stringify(position)}`);

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
   * Place stop loss with retry logic
   */
  private async placeStopLossWithRetry(
    symbol: string,
    stopPrice: string,
    quantity: string,
    side: OrderSide,
    maxRetries: number = 3,
  ): Promise<ApiResponse<Order>> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(`Attempt ${attempt}/${maxRetries}: Placing stop loss @ ${stopPrice}`);

        const result = await this.riskManagementService.setStopLoss({
          symbol,
          stopPrice,
          quantity,
          side,
        });

        if (result.success) {
          this.logger.log(`✅ Stop loss placed successfully: Order ID ${result.data?.orderId}`);
          return result;
        }

        this.logger.warn(`❌ Stop loss attempt ${attempt} failed: ${result.error}`);

        if (attempt < maxRetries) {
          // Wait 1 second before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error: any) {
        this.logger.error(`Stop loss attempt ${attempt} error: ${error.message}`);
        if (attempt === maxRetries) {
          return {
            success: false,
            error: error.message,
            timestamp: Date.now(),
            exchange: 'hyperliquid',
            tradingType: 'perpetual',
          };
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return {
      success: false,
      error: 'Failed to place stop loss after retries',
      timestamp: Date.now(),
      exchange: 'hyperliquid',
      tradingType: 'perpetual',
    };
  }

  /**
   * Place take profit with retry logic
   */
  private async placeTakeProfitWithRetry(
    symbol: string,
    takeProfitPrice: string,
    quantity: string,
    side: OrderSide,
    maxRetries: number = 3,
  ): Promise<ApiResponse<Order>> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(
          `Attempt ${attempt}/${maxRetries}: Placing take profit @ ${takeProfitPrice}`,
        );

        const result = await this.riskManagementService.setTakeProfit({
          symbol,
          takeProfitPrice,
          quantity,
          side,
        });

        if (result.success) {
          this.logger.log(`✅ Take profit placed successfully: Order ID ${result.data?.orderId}`);
          return result;
        }

        this.logger.warn(`❌ Take profit attempt ${attempt} failed: ${result.error}`);

        if (attempt < maxRetries) {
          // Wait 1 second before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error: any) {
        this.logger.error(`Take profit attempt ${attempt} error: ${error.message}`);
        if (attempt === maxRetries) {
          return {
            success: false,
            error: error.message,
            timestamp: Date.now(),
            exchange: 'hyperliquid',
            tradingType: 'perpetual',
          };
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return {
      success: false,
      error: 'Failed to place take profit after retries',
      timestamp: Date.now(),
      exchange: 'hyperliquid',
      tradingType: 'perpetual',
    };
  }

  /**
   * Format symbol from BTCUSDT to BTC
   */
  private formatSymbol(symbol: string): string {
    return symbol.replace(/USDT|USDC|-PERP/gi, '');
  }
}
