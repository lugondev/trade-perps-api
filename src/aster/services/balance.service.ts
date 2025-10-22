import { Injectable, Logger } from '@nestjs/common';
import { AsterApiService } from './aster-api.service';
import {
	AccountInformation,
	PositionRisk,
	Balance,
	IncomeHistory,
	AsterApiResponse,
} from '../types';

@Injectable()
export class BalanceService {
	private readonly logger = new Logger(BalanceService.name);

	constructor(private readonly asterApi: AsterApiService) { }

	/**
	 * Get account information including balances and positions
	 * GET /fapi/v3/account
	 */
	async getAccountInfo(): Promise<AsterApiResponse<AccountInformation>> {
		try {
			const response = await this.asterApi.get<AccountInformation>(
				'/fapi/v3/account',
			);
			this.logger.log('Account info retrieved successfully');
			return response;
		} catch (error) {
			this.logger.error('Failed to get account info', error.stack);
			return {
				success: false,
				error: error.message || 'Failed to get account info',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Get account balance
	 * GET /fapi/v3/balance
	 */
	async getBalance(): Promise<AsterApiResponse<Balance[]>> {
		try {
			const response = await this.asterApi.get<Balance[]>('/fapi/v3/balance');
			this.logger.log('Balance retrieved successfully');
			return response;
		} catch (error) {
			this.logger.error('Failed to get balance', error.stack);
			return {
				success: false,
				error: error.message || 'Failed to get balance',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Get position risk information
	 * GET /fapi/v3/positionRisk
	 */
	async getPositionRisk(
		symbol?: string,
	): Promise<AsterApiResponse<PositionRisk[]>> {
		try {
			const params = symbol ? { symbol } : {};
			const response = await this.asterApi.get<PositionRisk[]>(
				'/fapi/v3/positionRisk',
				params,
			);
			this.logger.log(
				`Position risk retrieved successfully${symbol ? ` for ${symbol}` : ''}`,
			);
			return response;
		} catch (error) {
			this.logger.error('Failed to get position risk', error.stack);
			return {
				success: false,
				error: error.message || 'Failed to get position risk',
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Get income history
	 * GET /fapi/v1/income
	 */
	async getIncomeHistory(params?: {
		symbol?: string;
		incomeType?:
		| 'TRANSFER'
		| 'WELCOME_BONUS'
		| 'REALIZED_PNL'
		| 'FUNDING_FEE'
		| 'COMMISSION'
		| 'INSURANCE_CLEAR'
		| 'REFERRAL_KICKBACK'
		| 'COMMISSION_REBATE'
		| 'API_REBATE'
		| 'CONTEST_REWARD'
		| 'CROSS_COLLATERAL_TRANSFER'
		| 'OPTIONS_PREMIUM_FEE'
		| 'OPTIONS_SETTLE_PROFIT'
		| 'INTERNAL_TRANSFER'
		| 'AUTO_EXCHANGE'
		| 'DELIVERED_SETTELMENT'
		| 'COIN_SWAP_DEPOSIT'
		| 'COIN_SWAP_WITHDRAW'
		| 'POSITION_LIMIT_INCREASE_FEE';
		startTime?: number;
		endTime?: number;
		limit?: number;
	}): Promise<AsterApiResponse<IncomeHistory[]>> {
		try {
			const response = await this.asterApi.get<IncomeHistory[]>(
				'/fapi/v1/income',
				params,
			);
			this.logger.log('Income history retrieved successfully');
			return response;
		} catch (error) {
			this.logger.error('Failed to get income history', error.stack);
			return {
				success: false,
				error: error.message || 'Failed to get income history',
				timestamp: Date.now(),
			};
		}
	}
}
