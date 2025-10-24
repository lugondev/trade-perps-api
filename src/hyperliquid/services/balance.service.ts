import { Injectable, Logger } from '@nestjs/common';
import { HyperliquidApiService } from './hyperliquid-api.service';
import { HyperliquidApiResponse } from '../types';

@Injectable()
export class BalanceService {
	private readonly logger = new Logger(BalanceService.name);

	constructor(private readonly hyperliquidApiService: HyperliquidApiService) { }

	/**
	 * Get account balances and positions
	 */
	async getBalance(user?: string): Promise<HyperliquidApiResponse> {
		try {
			this.logger.debug('Fetching account balance and positions');
			const response = await this.hyperliquidApiService.getUserState(user);

			if (response.success && response.data) {
				const state = response.data;
				this.logger.log(`Account value: ${state.marginSummary?.accountValue || 'N/A'}`);
			}

			return response;
		} catch (error) {
			this.logger.error('Error fetching balance:', error);
			return {
				success: false,
				error: error.message || 'Failed to fetch balance',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Get portfolio summary
	 */
	async getPortfolioSummary(user?: string): Promise<HyperliquidApiResponse> {
		try {
			this.logger.debug('Fetching portfolio summary');
			const balanceResponse = await this.getBalance(user);

			if (!balanceResponse.success || !balanceResponse.data) {
				return balanceResponse;
			}

			const state = balanceResponse.data;
			const summary = {
				accountValue: state.marginSummary?.accountValue || '0',
				totalPositionValue: state.marginSummary?.totalNtlPos || '0',
				withdrawable: state.crossMarginSummary?.withdrawable || '0',
				totalMarginUsed: state.marginSummary?.totalMarginUsed || '0',
				positions: state.assetPositions || [],
			};

			return {
				success: true,
				data: summary,
				timestamp: Date.now(),
			};
		} catch (error) {
			this.logger.error('Error fetching portfolio summary:', error);
			return {
				success: false,
				error: error.message || 'Failed to fetch portfolio summary',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Get positions only
	 */
	async getPositions(user?: string): Promise<HyperliquidApiResponse> {
		try {
			this.logger.debug('Fetching open positions');
			const response = await this.hyperliquidApiService.getUserState(user);

			if (!response.success || !response.data) {
				return response;
			}

			return {
				success: true,
				data: response.data.assetPositions || [],
				timestamp: Date.now(),
			};
		} catch (error) {
			this.logger.error('Error fetching positions:', error);
			return {
				success: false,
				error: error.message || 'Failed to fetch positions',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Get specific position by coin
	 */
	async getPosition(coin: string, user?: string): Promise<HyperliquidApiResponse> {
		try {
			this.logger.debug(`Fetching position for ${coin}`);
			const positionsResponse = await this.getPositions(user);

			if (!positionsResponse.success || !positionsResponse.data) {
				return positionsResponse;
			}

			// Position data structure: { type: 'oneWay', position: { coin, szi, ... } }
			const positionData = (positionsResponse.data as any[]).find(
				(p: any) => {
					const positionCoin = p.position?.coin || p.coin;
					const positionSize = parseFloat(p.position?.szi || p.szi || '0');
					return positionCoin === coin && positionSize !== 0;
				}
			);

			if (!positionData) {
				return {
					success: false,
					error: `No open position found for ${coin}`,
					timestamp: Date.now(),
				};
			}

			return {
				success: true,
				data: positionData.position || positionData,
				timestamp: Date.now(),
			};
		} catch (error) {
			this.logger.error(`Error fetching position for ${coin}:`, error);
			return {
				success: false,
				error: error.message || 'Failed to fetch position',
				timestamp: Date.now(),
			};
		}
	}
}
