import { Get, Query, Param, Logger } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { IFuturesBalanceService } from '../interfaces';

/**
 * Base Futures Balance Controller
 * All exchange-specific futures balance controllers should extend this
 */
export abstract class BaseFuturesBalanceController {
	protected abstract readonly logger: Logger;
	protected abstract readonly balanceService: IFuturesBalanceService;

	@Get()
	@ApiOperation({ summary: 'Get account balances' })
	@ApiResponse({ status: 200, description: 'Balances retrieved successfully' })
	async getBalance(@Query('asset') asset?: string) {
		return this.balanceService.getBalance(asset);
	}

	@Get('non-zero')
	@ApiOperation({ summary: 'Get non-zero balances' })
	@ApiResponse({ status: 200, description: 'Non-zero balances retrieved successfully' })
	async getNonZeroBalances() {
		return this.balanceService.getNonZeroBalances();
	}

	@Get('portfolio')
	@ApiOperation({ summary: 'Get portfolio value' })
	@ApiResponse({ status: 200, description: 'Portfolio value retrieved successfully' })
	async getPortfolioValue() {
		return this.balanceService.getPortfolioValue();
	}

	@Get('account')
	@ApiOperation({ summary: 'Get account information' })
	@ApiResponse({ status: 200, description: 'Account information retrieved successfully' })
	async getAccountInfo() {
		return this.balanceService.getAccountInfo();
	}

	@Get('positions')
	@ApiOperation({ summary: 'Get positions' })
	@ApiQuery({ name: 'symbol', required: false, description: 'Trading symbol' })
	@ApiResponse({ status: 200, description: 'Positions retrieved successfully' })
	async getPositions(@Query('symbol') symbol?: string) {
		return this.balanceService.getPositions(symbol);
	}

	@Get('positions/non-zero')
	@ApiOperation({ summary: 'Get non-zero positions' })
	@ApiResponse({ status: 200, description: 'Non-zero positions retrieved successfully' })
	async getNonZeroPositions() {
		return this.balanceService.getNonZeroPositions();
	}

	@Get('available')
	@ApiOperation({ summary: 'Get available balance' })
	@ApiResponse({ status: 200, description: 'Available balance retrieved successfully' })
	async getAvailableBalance() {
		return this.balanceService.getAvailableBalance();
	}

	@Get('wallet-balance')
	@ApiOperation({ summary: 'Get total wallet balance' })
	@ApiResponse({ status: 200, description: 'Wallet balance retrieved successfully' })
	async getTotalWalletBalance() {
		return this.balanceService.getTotalWalletBalance();
	}

	@Get('unrealized-pnl')
	@ApiOperation({ summary: 'Get total unrealized PnL' })
	@ApiResponse({ status: 200, description: 'Unrealized PnL retrieved successfully' })
	async getTotalUnrealizedPnl() {
		return this.balanceService.getTotalUnrealizedPnl();
	}

	@Get('income-history')
	@ApiOperation({ summary: 'Get income history' })
	@ApiQuery({ name: 'symbol', required: false })
	@ApiQuery({ name: 'incomeType', required: false })
	@ApiQuery({ name: 'startTime', required: false })
	@ApiQuery({ name: 'endTime', required: false })
	@ApiQuery({ name: 'limit', required: false })
	@ApiResponse({ status: 200, description: 'Income history retrieved successfully' })
	async getIncomeHistory(
		@Query('symbol') symbol?: string,
		@Query('incomeType') incomeType?: string,
		@Query('startTime') startTime?: string,
		@Query('endTime') endTime?: string,
		@Query('limit') limit?: string,
	) {
		const parsedStartTime = startTime ? parseInt(startTime) : undefined;
		const parsedEndTime = endTime ? parseInt(endTime) : undefined;
		const parsedLimit = limit ? parseInt(limit) : undefined;
		return this.balanceService.getIncomeHistory(symbol, incomeType, parsedStartTime, parsedEndTime, parsedLimit);
	}

	@Get('funding-fees')
	@ApiOperation({ summary: 'Get funding fee history' })
	@ApiQuery({ name: 'symbol', required: false })
	@ApiQuery({ name: 'startTime', required: false })
	@ApiQuery({ name: 'endTime', required: false })
	@ApiQuery({ name: 'limit', required: false })
	@ApiResponse({ status: 200, description: 'Funding fee history retrieved successfully' })
	async getFundingFeeHistory(
		@Query('symbol') symbol?: string,
		@Query('startTime') startTime?: string,
		@Query('endTime') endTime?: string,
		@Query('limit') limit?: string,
	) {
		const parsedStartTime = startTime ? parseInt(startTime) : undefined;
		const parsedEndTime = endTime ? parseInt(endTime) : undefined;
		const parsedLimit = limit ? parseInt(limit) : undefined;
		return this.balanceService.getFundingFeeHistory(symbol, parsedStartTime, parsedEndTime, parsedLimit);
	}

	@Get('transactions')
	@ApiOperation({ summary: 'Get transaction history' })
	@ApiQuery({ name: 'symbol', required: false })
	@ApiQuery({ name: 'startTime', required: false })
	@ApiQuery({ name: 'endTime', required: false })
	@ApiQuery({ name: 'limit', required: false })
	@ApiResponse({ status: 200, description: 'Transaction history retrieved successfully' })
	async getTransactionHistory(
		@Query('symbol') symbol?: string,
		@Query('startTime') startTime?: string,
		@Query('endTime') endTime?: string,
		@Query('limit') limit?: string,
	) {
		const parsedStartTime = startTime ? parseInt(startTime) : undefined;
		const parsedEndTime = endTime ? parseInt(endTime) : undefined;
		const parsedLimit = limit ? parseInt(limit) : undefined;
		return this.balanceService.getTransactionHistory(symbol, parsedStartTime, parsedEndTime, parsedLimit);
	}
}
