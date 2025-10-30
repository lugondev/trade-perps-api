import { Injectable, Logger } from '@nestjs/common';
import { formatSymbol } from './perp-market.utils';
import { mapPosition } from './perp-helpers';
import { SetLeverageParams, SetPositionModeParams } from '../../../../common/interfaces';
import { ApiResponse, Position, PositionSide } from '../../../../common/types';
import { HyperliquidApiService } from '../../shared/hyperliquid-api.service';

@Injectable()
export class PositionService {
  private readonly logger = new Logger(PositionService.name);

  constructor(private readonly apiService: HyperliquidApiService) {}

  /**
   * Get current positions
   */
  async getPositions(symbol?: string): Promise<ApiResponse<Position | Position[]>> {
    try {
      const result = await this.apiService.getUserState();

      if (!result.success || !result.data?.assetPositions) {
        return {
          success: false,
          error: 'Failed to get positions',
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      let positions = result.data.assetPositions;

      if (symbol) {
        const coin = formatSymbol(symbol);
        positions = positions.filter((p: any) => p.position.coin === coin);
      }

      const mappedPositions: Position[] = positions
        .filter((p: any) => parseFloat(p.position.szi) !== 0)
        .map((pos: any) => mapPosition(pos.position));

      if (symbol) {
        return {
          success: true,
          data: mappedPositions[0] || null,
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      return {
        success: true,
        data: mappedPositions,
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    } catch (error: any) {
      this.logger.error(`Error getting positions: ${error.message}`);
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
   * Set leverage for symbol
   */
  async setLeverage(
    params: SetLeverageParams,
  ): Promise<ApiResponse<{ leverage: number; symbol: string }>> {
    try {
      const coin = formatSymbol(params.symbol);

      // Margin removed — assume non-crossed (isolated-like) behavior when setting leverage
      const isCross = false;
      const result = await this.apiService.updateLeverage(coin, isCross, params.leverage);

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to set leverage',
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      return {
        success: true,
        data: {
          leverage: params.leverage,
          symbol: params.symbol,
        },
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    } catch (error: any) {
      this.logger.error(`Error setting leverage: ${error.message}`);
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
   * Get current leverage for symbol
   */
  async getLeverage(symbol: string): Promise<ApiResponse<number>> {
    try {
      const positionResponse = await this.getPositions(symbol);

      if (positionResponse.success && positionResponse.data) {
        const position = Array.isArray(positionResponse.data)
          ? positionResponse.data[0]
          : positionResponse.data;

        if (!position) {
          // No position, get max leverage from asset info
          const coin = formatSymbol(symbol);
          const assetInfo = await this.apiService.getAssetInfo(coin);

          return {
            success: true,
            data: assetInfo.maxLeverage,
            timestamp: Date.now(),
            exchange: 'hyperliquid',
            tradingType: 'perpetual',
          };
        }

        return {
          success: true,
          data: position.leverage || 1,
          timestamp: Date.now(),
          exchange: 'hyperliquid',
          tradingType: 'perpetual',
        };
      }

      return {
        success: false,
        error: 'Failed to get leverage',
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    } catch (error: any) {
      this.logger.error(`Error getting leverage: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
        exchange: 'hyperliquid',
        tradingType: 'perpetual',
      };
    }
  }

  // Margin-related methods removed (margin is not supported)

  /**
   * Set position mode (one-way or hedge mode)
   * Note: Hyperliquid only supports one-way mode
   */
  async setPositionMode(params: SetPositionModeParams): Promise<ApiResponse<any>> {
    if (params.dualSidePosition) {
      this.logger.warn('Hyperliquid does not support hedge mode, using one-way mode');
    }

    return {
      success: true,
      data: {
        dualSidePosition: false,
        message: 'Hyperliquid uses one-way position mode',
      },
      timestamp: Date.now(),
      exchange: 'hyperliquid',
      tradingType: 'perpetual',
    };
  }

  /**
   * Get current position mode
   */
  async getPositionMode(): Promise<ApiResponse<{ dualSidePosition: boolean }>> {
    return {
      success: true,
      data: {
        dualSidePosition: false,
      },
      timestamp: Date.now(),
      exchange: 'hyperliquid',
      tradingType: 'perpetual',
    };
  }

  // Margin-related methods removed (margin is not supported)

  // formatting helpers moved to perp-market.utils
}
