import { Injectable, Logger } from '@nestjs/common';
import { BinanceApiService } from '../../shared/binance-api.service';
import { BinanceAccountInfo, BinanceAsset } from '../../types';

@Injectable()
export class BinancePerpetualBalanceService {
  private readonly logger = new Logger(BinancePerpetualBalanceService.name);

  constructor(private readonly apiService: BinanceApiService) {}

  /**
   * Get account balance information
   */
  async getBalance(): Promise<any> {
    try {
      this.logger.log('Fetching Binance Futures account balance...');

      const response = await this.apiService.get<BinanceAccountInfo>('/fapi/v2/account');

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch balance');
      }

      const accountInfo = response.data;

      return {
        success: true,
        data: {
          totalBalance: parseFloat(accountInfo.totalWalletBalance),
          availableBalance: parseFloat(accountInfo.availableBalance),
          totalUnrealizedPnl: parseFloat(accountInfo.totalUnrealizedProfit),
          totalMarginBalance: parseFloat(accountInfo.totalMarginBalance),
          assets: accountInfo.assets.map((asset: BinanceAsset) => ({
            asset: asset.asset,
            walletBalance: parseFloat(asset.walletBalance),
            availableBalance: parseFloat(asset.availableBalance),
            unrealizedProfit: parseFloat(asset.unrealizedProfit),
            marginBalance: parseFloat(asset.marginBalance),
          })),
          positions: accountInfo.positions
            .filter(pos => parseFloat(pos.positionAmt) !== 0)
            .map(pos => ({
              symbol: pos.symbol,
              positionAmt: parseFloat(pos.positionAmt),
              entryPrice: parseFloat(pos.entryPrice),
              markPrice: parseFloat(pos.markPrice),
              unrealizedProfit: parseFloat(pos.unRealizedProfit),
              liquidationPrice: parseFloat(pos.liquidationPrice),
              leverage: parseInt(pos.leverage),
              positionSide: pos.positionSide,
            })),
        },
      };
    } catch (error: any) {
      this.logger.error('Error fetching balance:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get positions
   */
  async getPositions(symbol?: string): Promise<any> {
    try {
      this.logger.log('Fetching Binance Futures positions...');

      const params = symbol ? { symbol } : {};
      const response = await this.apiService.get('/fapi/v2/positionRisk', params);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch positions');
      }

      const positions = response.data
        .filter((pos: any) => parseFloat(pos.positionAmt) !== 0)
        .map((pos: any) => ({
          symbol: pos.symbol,
          positionAmt: parseFloat(pos.positionAmt),
          entryPrice: parseFloat(pos.entryPrice),
          markPrice: parseFloat(pos.markPrice),
          unrealizedProfit: parseFloat(pos.unRealizedProfit),
          liquidationPrice: parseFloat(pos.liquidationPrice),
          leverage: parseInt(pos.leverage),
          positionSide: pos.positionSide,
          marginType: pos.marginType,
          isolatedMargin: parseFloat(pos.isolatedMargin),
          isAutoAddMargin: pos.isAutoAddMargin === 'true',
        }));

      return {
        success: true,
        data: positions,
      };
    } catch (error: any) {
      this.logger.error('Error fetching positions:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
