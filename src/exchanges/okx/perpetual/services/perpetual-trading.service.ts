import { Injectable, Logger } from '@nestjs/common';
import { OkxApiService } from '../../shared/okx-api.service';
import { OrderSide } from '../../../../common/types/exchange.types';

@Injectable()
export class OkxPerpetualTradingService {
  private readonly logger = new Logger(OkxPerpetualTradingService.name);

  constructor(private readonly apiService: OkxApiService) {}

  /**
   * Place a market order
   */
  async placeMarketOrder(params: {
    instId: string;
    side: OrderSide;
    sz: string;
    posSide?: string;
    tdMode?: string;
  }): Promise<any> {
    try {
      this.logger.log(`Placing market order: ${params.side} ${params.sz} ${params.instId}`);

      const orderData = {
        instId: params.instId,
        tdMode: params.tdMode || 'cross',
        side: params.side.toLowerCase(),
        ordType: 'market',
        sz: params.sz,
        ...(params.posSide && { posSide: params.posSide }),
      };

      const response = await this.apiService.post('/api/v5/trade/order', orderData);

      if (!response.success || !response.data || response.data.length === 0) {
        throw new Error(response.error || 'Failed to place market order');
      }

      const orderResult = response.data[0];

      // Check for order-level errors (sCode !== "0" means error)
      if (orderResult.sCode && orderResult.sCode !== '0') {
        this.logger.error(`Order failed with sCode ${orderResult.sCode}: ${orderResult.sMsg}`);
        throw new Error(`Order error: ${orderResult.sMsg} (code: ${orderResult.sCode})`);
      }

      return {
        success: true,
        data: {
          ordId: orderResult.ordId,
          clOrdId: orderResult.clOrdId,
          sCode: orderResult.sCode,
          sMsg: orderResult.sMsg,
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
    instId: string;
    side: OrderSide;
    sz: string;
    px: string;
    posSide?: string;
    tdMode?: string;
  }): Promise<any> {
    try {
      this.logger.log(
        `Placing limit order: ${params.side} ${params.sz} ${params.instId} @ ${params.px}`,
      );

      const orderData = {
        instId: params.instId,
        tdMode: params.tdMode || 'cross',
        side: params.side.toLowerCase(),
        ordType: 'limit',
        sz: params.sz,
        px: params.px,
        ...(params.posSide && { posSide: params.posSide }),
      };

      const response = await this.apiService.post('/api/v5/trade/order', orderData);

      if (!response.success || !response.data || response.data.length === 0) {
        throw new Error(response.error || 'Failed to place limit order');
      }

      const orderResult = response.data[0];

      return {
        success: true,
        data: {
          ordId: orderResult.ordId,
          clOrdId: orderResult.clOrdId,
          sCode: orderResult.sCode,
          sMsg: orderResult.sMsg,
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
  async cancelOrder(instId: string, ordId: string): Promise<any> {
    try {
      this.logger.log(`Canceling order ${ordId} for ${instId}`);

      const response = await this.apiService.post('/api/v5/trade/cancel-order', {
        instId,
        ordId,
      });

      if (!response.success || !response.data || response.data.length === 0) {
        throw new Error(response.error || 'Failed to cancel order');
      }

      const result = response.data[0];

      return {
        success: true,
        data: {
          ordId: result.ordId,
          clOrdId: result.clOrdId,
          sCode: result.sCode,
          sMsg: result.sMsg,
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
   * Get order details
   */
  async getOrderStatus(instId: string, ordId: string): Promise<any> {
    try {
      this.logger.log(`Getting order status for ${ordId}`);

      const response = await this.apiService.get('/api/v5/trade/order', {
        instId,
        ordId,
      });

      if (!response.success || !response.data || response.data.length === 0) {
        throw new Error(response.error || 'Failed to get order status');
      }

      const order = response.data[0];

      return {
        success: true,
        data: {
          ordId: order.ordId,
          clOrdId: order.clOrdId,
          instId: order.instId,
          state: order.state,
          side: order.side,
          ordType: order.ordType,
          px: parseFloat(order.px),
          sz: parseFloat(order.sz),
          fillPx: parseFloat(order.fillPx),
          fillSz: parseFloat(order.fillSz),
          accFillSz: parseFloat(order.accFillSz),
          avgPx: parseFloat(order.avgPx),
          lever: parseFloat(order.lever),
          uTime: order.uTime,
          cTime: order.cTime,
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
   * Close position by market order
   */
  async closePosition(symbol: string, size?: number): Promise<any> {
    try {
      const instId = symbol.includes('-') ? symbol : `${symbol}-USDT-SWAP`;
      this.logger.log(`Closing position for ${instId}...`);

      // Get current position to determine size and side
      const positionsResponse = await this.apiService.get('/api/v5/account/positions', {
        instId,
      });

      if (
        !positionsResponse.success ||
        !positionsResponse.data ||
        positionsResponse.data.length === 0
      ) {
        return {
          success: false,
          error: 'No position found',
        };
      }

      const position = positionsResponse.data[0];
      const currentPos = parseFloat(position.pos);

      if (currentPos === 0) {
        return {
          success: false,
          error: 'Position is already closed',
        };
      }

      // Determine close side: if pos > 0 (long), close with sell; if pos < 0 (short), close with buy
      const closeSide = currentPos > 0 ? OrderSide.SELL : OrderSide.BUY;
      const closeSize = size ? size.toString() : Math.abs(currentPos).toString();

      this.logger.log(`Closing ${closeSize} contracts with ${closeSide} order`);

      // Place market order to close position
      const response = await this.placeMarketOrder({
        instId,
        side: closeSide,
        sz: closeSize,
        tdMode: 'cross',
      });

      if (response.success) {
        this.logger.log('✅ Position closed successfully');
      }

      return response;
    } catch (error: any) {
      this.logger.error('Error closing position:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Set leverage
   */
  async setLeverage(symbol: string, leverage: number): Promise<any> {
    try {
      this.logger.log(`Setting leverage ${leverage}x for ${symbol}`);

      const response = await this.apiService.post('/api/v5/account/set-leverage', {
        instId: symbol,
        lever: leverage.toString(),
        mgnMode: 'cross', // Use cross margin to access full account balance
      });

      if (!response.success) {
        this.logger.error(`Failed to set leverage: ${response.error}`);
        throw new Error(`Failed to set leverage: ${response.error}`);
      }

      this.logger.log(`✅ Leverage set to ${leverage}x for ${symbol}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Error setting leverage:`, error);
      throw error;
    }
  }

  /**
   * Quick long by USD value with required TP/SL/leverage (OKX)
   */
  async quickLong(
    symbol: string,
    usdValue: number,
    stopLossPercent: number,
    takeProfitPercent: number,
    leverage: number,
  ): Promise<any> {
    try {
      // OKX uses instId format like BTC-USDT-SWAP
      const instId = symbol.includes('-') ? symbol : `${symbol}-USDT-SWAP`;

      // 1. Set leverage first
      this.logger.log(`Setting leverage ${leverage}x for ${instId}`);
      await this.setLeverage(instId, leverage);

      // 2. Get current price from ticker
      const tickerData = await this.apiService.get(`/api/v5/market/ticker?instId=${instId}`);
      if (!tickerData.success || !tickerData.data || tickerData.data.length === 0) {
        return {
          success: false,
          error: 'Failed to get current price',
          timestamp: Date.now(),
        };
      }

      const currentPrice = parseFloat(tickerData.data[0].last);

      // 3. Get instrument details to understand contract value
      const instrumentData = await this.apiService.get(
        `/api/v5/public/instruments?instType=SWAP&instId=${instId}`,
      );
      if (!instrumentData.success || !instrumentData.data || instrumentData.data.length === 0) {
        return {
          success: false,
          error: 'Failed to get instrument details',
          timestamp: Date.now(),
        };
      }

      const instrument = instrumentData.data[0];
      const ctVal = parseFloat(instrument.ctVal); // Contract value (e.g., 0.01 BTC per contract)
      const minSz = parseFloat(instrument.minSz); // Minimum order size in contracts

      // 4. Calculate number of contracts needed
      // For BTC-USDT-SWAP: ctVal = 0.01 BTC per contract
      // If we want $750 position with leverage 10x:
      // - Margin needed = $750
      // - Position size = $750 * 10 = $7500
      // - BTC amount = $7500 / currentPrice
      // - Contracts = BTC amount / ctVal
      const positionValueUSD = usdValue * leverage;
      const btcAmount = positionValueUSD / currentPrice;
      const contracts = Math.max(Math.floor(btcAmount / ctVal), minSz);

      this.logger.log(
        `Opening long position: ${contracts} contracts (${(contracts * ctVal).toFixed(4)} BTC = $${(contracts * ctVal * currentPrice).toFixed(2)}) ${instId} @ $${currentPrice}`,
      );
      this.logger.log(`Contract details: ctVal=${ctVal}, minSz=${minSz}`);

      // 5. Place entry market order with cross margin
      const mainOrder = await this.placeMarketOrder({
        instId,
        side: OrderSide.BUY,
        sz: contracts.toString(),
        tdMode: 'cross', // Use cross margin to access full balance
      });

      if (!mainOrder.success) {
        this.logger.error('Failed to place entry order:', mainOrder.error);
        return mainOrder;
      }

      this.logger.log(`Entry order placed successfully: ${JSON.stringify(mainOrder.data)}`);

      // 5. Calculate SL/TP prices
      const stopLossPrice = (currentPrice * (1 - stopLossPercent / 100)).toFixed(2);
      const takeProfitPrice = (currentPrice * (1 + takeProfitPercent / 100)).toFixed(2);

      this.logger.log(`Placing TP @ ${takeProfitPrice} and SL @ ${stopLossPrice}`);

      // 6. Place Stop Loss order (reduceOnly to close position)
      const stopLossOrder = await this.apiService.post('/api/v5/trade/order-algo', {
        instId,
        tdMode: 'cross',
        side: 'sell',
        ordType: 'conditional',
        sz: contracts.toString(),
        slTriggerPx: stopLossPrice,
        slOrdPx: '-1', // Market price
        reduceOnly: true, // This makes it close the position instead of opening new one
      });

      // 7. Place Take Profit order (reduceOnly to close position)
      const takeProfitOrder = await this.apiService.post('/api/v5/trade/order-algo', {
        instId,
        tdMode: 'cross',
        side: 'sell',
        ordType: 'conditional',
        sz: contracts.toString(),
        tpTriggerPx: takeProfitPrice,
        tpOrdPx: '-1', // Market price
        reduceOnly: true, // This makes it close the position instead of opening new one
      });

      this.logger.log('Quick long completed successfully');

      return {
        success: true,
        data: {
          mainOrder,
          stopLoss: stopLossOrder,
          takeProfit: takeProfitOrder,
          contracts,
          btcAmount: contracts * ctVal,
          entryPrice: currentPrice,
          stopLossPrice,
          takeProfitPrice,
        },
        timestamp: Date.now(),
        exchange: 'okx',
        tradingType: 'perpetual',
      };
    } catch (error: any) {
      this.logger.error('Error in quick long:', error);
      return {
        success: false,
        error: error.message || 'Failed to execute quick long',
        timestamp: Date.now(),
        exchange: 'okx',
        tradingType: 'perpetual',
      };
    }
  }

  /**
   * Quick short by USD value with required TP/SL/leverage (OKX)
   */
  async quickShort(
    symbol: string,
    usdValue: number,
    stopLossPercent: number,
    takeProfitPercent: number,
    leverage: number,
  ): Promise<any> {
    try {
      // OKX uses instId format like BTC-USDT-SWAP
      const instId = symbol.includes('-') ? symbol : `${symbol}-USDT-SWAP`;

      // 1. Set leverage first
      this.logger.log(`Setting leverage ${leverage}x for ${instId}`);
      await this.setLeverage(instId, leverage);

      // 2. Get current price from ticker
      const tickerData = await this.apiService.get(`/api/v5/market/ticker?instId=${instId}`);
      if (!tickerData.success || !tickerData.data || tickerData.data.length === 0) {
        return {
          success: false,
          error: 'Failed to get current price',
          timestamp: Date.now(),
        };
      }

      const currentPrice = parseFloat(tickerData.data[0].last);

      // 3. Get instrument details to understand contract value
      const instrumentData = await this.apiService.get(
        `/api/v5/public/instruments?instType=SWAP&instId=${instId}`,
      );
      if (!instrumentData.success || !instrumentData.data || instrumentData.data.length === 0) {
        return {
          success: false,
          error: 'Failed to get instrument details',
          timestamp: Date.now(),
        };
      }

      const instrument = instrumentData.data[0];
      const ctVal = parseFloat(instrument.ctVal); // Contract value
      const minSz = parseFloat(instrument.minSz); // Minimum order size

      // 4. Calculate number of contracts
      const positionValueUSD = usdValue * leverage;
      const btcAmount = positionValueUSD / currentPrice;
      const contracts = Math.max(Math.floor(btcAmount / ctVal), minSz);

      this.logger.log(
        `Opening short position: ${contracts} contracts (${(contracts * ctVal).toFixed(4)} BTC = $${(contracts * ctVal * currentPrice).toFixed(2)}) ${instId} @ $${currentPrice}`,
      );
      this.logger.log(`Contract details: ctVal=${ctVal}, minSz=${minSz}`);

      // 5. Place entry market order with cross margin
      const mainOrder = await this.placeMarketOrder({
        instId,
        side: OrderSide.SELL,
        sz: contracts.toString(),
        tdMode: 'cross',
      });

      if (!mainOrder.success) {
        this.logger.error('Failed to place entry order:', mainOrder.error);
        return mainOrder;
      }

      this.logger.log(`Entry order placed successfully: ${JSON.stringify(mainOrder.data)}`);

      // 5. Calculate SL/TP prices (SHORT: SL higher, TP lower)
      const stopLossPrice = (currentPrice * (1 + stopLossPercent / 100)).toFixed(2);
      const takeProfitPrice = (currentPrice * (1 - takeProfitPercent / 100)).toFixed(2);

      this.logger.log(`Placing TP @ ${takeProfitPrice} and SL @ ${stopLossPrice}`);

      // 6. Place Stop Loss order (reduceOnly to close position)
      const stopLossOrder = await this.apiService.post('/api/v5/trade/order-algo', {
        instId,
        tdMode: 'cross',
        side: 'buy',
        ordType: 'conditional',
        sz: contracts.toString(),
        slTriggerPx: stopLossPrice,
        slOrdPx: '-1', // Market price
        reduceOnly: true, // This makes it close the position instead of opening new one
      });

      // 7. Place Take Profit order (reduceOnly to close position)
      const takeProfitOrder = await this.apiService.post('/api/v5/trade/order-algo', {
        instId,
        tdMode: 'cross',
        side: 'buy',
        ordType: 'conditional',
        sz: contracts.toString(),
        tpTriggerPx: takeProfitPrice,
        tpOrdPx: '-1', // Market price
        reduceOnly: true, // This makes it close the position instead of opening new one
      });

      this.logger.log('Quick short completed successfully');

      return {
        success: true,
        data: {
          mainOrder,
          stopLoss: stopLossOrder,
          takeProfit: takeProfitOrder,
          contracts,
          btcAmount: contracts * ctVal,
          entryPrice: currentPrice,
          stopLossPrice,
          takeProfitPrice,
        },
        timestamp: Date.now(),
        exchange: 'okx',
        tradingType: 'perpetual',
      };
    } catch (error: any) {
      this.logger.error('Error in quick short:', error);
      return {
        success: false,
        error: error.message || 'Failed to execute quick short',
        timestamp: Date.now(),
        exchange: 'okx',
        tradingType: 'perpetual',
      };
    }
  }
}
