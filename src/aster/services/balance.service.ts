import { Injectable, Logger } from '@nestjs/common';
import { AsterApiService } from './aster-api.service';
import { Balance, BalanceResponse, AsterApiResponse } from '../types';

@Injectable()
export class BalanceService {
	private readonly logger = new Logger(BalanceService.name);

	constructor(private readonly asterApiService: AsterApiService) { }

	/**
	 * Get account balances for all assets (Futures Account Balance v3)
	 */
	async getBalances(): Promise<AsterApiResponse<BalanceResponse>> {
		try {
			this.logger.debug('Fetching account balances');
			const response = await this.asterApiService.get<any[]>('/fapi/v3/balance');

			if (response.success && response.data) {
				// Convert Aster balance format to our format
				const balances: Balance[] = response.data.map(item => ({
					asset: item.asset,
					free: item.availableBalance || '0',
					locked: (parseFloat(item.balance || '0') - parseFloat(item.availableBalance || '0')).toString(),
					total: item.balance || '0',
				}));

				const balanceResponse: BalanceResponse = { balances };

				this.logger.log(`Successfully fetched ${balances.length} balances`);
				return {
					success: true,
					data: balanceResponse,
					timestamp: Date.now(),
				};
			}

			return {
				success: false,
				error: response.error || 'Failed to fetch balances',
				timestamp: Date.now(),
			};
		} catch (error) {
			this.logger.error('Error fetching balances:', error);
			return {
				success: false,
				error: error.message || 'Failed to fetch balances',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Get balance for a specific asset
	 */
	async getBalance(asset: string): Promise<AsterApiResponse<Balance | null>> {
		try {
			this.logger.debug(`Fetching balance for asset: ${asset}`);
			const balancesResponse = await this.getBalances();

			if (!balancesResponse.success || !balancesResponse.data) {
				return {
					success: false,
					error: balancesResponse.error || 'Failed to fetch balances',
					timestamp: Date.now(),
				};
			}

			const balance = balancesResponse.data.balances.find(b => b.asset === asset.toUpperCase());

			return {
				success: true,
				data: balance || null,
				timestamp: Date.now(),
			};
		} catch (error) {
			this.logger.error(`Error fetching balance for ${asset}:`, error);
			return {
				success: false,
				error: error.message || `Failed to fetch balance for ${asset}`,
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Get total portfolio value in USD (if supported by API)
	 */
	async getPortfolioValue(): Promise<AsterApiResponse<{ totalValue: string; currency: string }>> {
		try {
			this.logger.debug('Fetching portfolio value');
			// This endpoint might not exist - adjust based on actual Aster API
			const response = await this.asterApiService.get('/api/v1/account/portfolio');

			return response;
		} catch (error) {
			this.logger.error('Error fetching portfolio value:', error);
			return {
				success: false,
				error: error.message || 'Failed to fetch portfolio value',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Get balances with non-zero amounts only
	 */
	async getNonZeroBalances(): Promise<AsterApiResponse<Balance[]>> {
		try {
			const balancesResponse = await this.getBalances();

			if (!balancesResponse.success || !balancesResponse.data) {
				return {
					success: false,
					error: balancesResponse.error || 'Failed to fetch balances',
					timestamp: Date.now(),
				};
			}

			// Filter balances where total > 0 (handle string comparison)
			const nonZeroBalances = balancesResponse.data.balances.filter(balance => {
				const totalAmount = parseFloat(balance.total);
				return !isNaN(totalAmount) && totalAmount > 0;
			});

			this.logger.log(`Found ${nonZeroBalances.length} non-zero balances out of ${balancesResponse.data.balances.length} total`);

			return {
				success: true,
				data: nonZeroBalances,
				timestamp: Date.now(),
			};
		} catch (error) {
			this.logger.error('Error filtering non-zero balances:', error);
			return {
				success: false,
				error: error.message || 'Failed to process balances',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Format balance for display
	 */
	formatBalance(balance: Balance): string {
		const total = parseFloat(balance.total);
		const free = parseFloat(balance.free);
		const locked = parseFloat(balance.locked);

		return `${balance.asset}: ${total.toFixed(8)} (Free: ${free.toFixed(8)}, Locked: ${locked.toFixed(8)})`;
	}

	/**
	 * Check if account has sufficient balance for trading
	 */
	async hasSufficientBalance(asset: string, requiredAmount: string): Promise<boolean> {
		try {
			const balanceResponse = await this.getBalance(asset);

			if (!balanceResponse.success || !balanceResponse.data) {
				this.logger.warn(`Could not check balance for ${asset}`);
				return false;
			}

			const availableBalance = parseFloat(balanceResponse.data.free);
			const required = parseFloat(requiredAmount);

			return availableBalance >= required;
		} catch (error) {
			this.logger.error(`Error checking sufficient balance for ${asset}:`, error);
			return false;
		}
	}

	/**
	 * Get account information v3 (includes positions, assets, and margin info)
	 */
	async getAccountInfo(): Promise<AsterApiResponse<any>> {
		try {
			this.logger.debug('Fetching account information');
			const response = await this.asterApiService.get<any>('/fapi/v3/account');

			if (response.success) {
				this.logger.log('Successfully fetched account information');
			}

			return response;
		} catch (error) {
			this.logger.error('Error fetching account information:', error);
			return {
				success: false,
				error: error.message || 'Failed to fetch account information',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Get position information v3
	 */
	async getPositions(symbol?: string): Promise<AsterApiResponse<any>> {
		try {
			this.logger.debug('Fetching position information');
			const params: any = {};

			if (symbol) {
				params.symbol = symbol;
			}

			const response = await this.asterApiService.get<any>('/fapi/v3/positionRisk', params);

			if (response.success) {
				this.logger.log('Successfully fetched position information');
			}

			return response;
		} catch (error) {
			this.logger.error('Error fetching position information:', error);
			return {
				success: false,
				error: error.message || 'Failed to fetch position information',
				timestamp: Date.now(),
			};
		}
	}
}