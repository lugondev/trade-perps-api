import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
	HyperliquidApiResponse,
} from '../types';
import { HyperliquidConfig } from '../../../config/hyperliquid.config';
import { SigningService } from './signing.service';

@Injectable()
export class HyperliquidApiService {
	private readonly logger = new Logger(HyperliquidApiService.name);
	private readonly httpClient: AxiosInstance;
	private readonly baseURL: string;
	private readonly hyperliquidConfig: HyperliquidConfig;
	private assetMap: Map<string, number> = new Map(); // coin name -> asset ID
	private assetInfoMap: Map<string, any> = new Map(); // coin name -> full asset info

	constructor(
		private configService: ConfigService,
		private signingService: SigningService,
	) {
		this.hyperliquidConfig = this.configService.get<HyperliquidConfig>('hyperliquid')!;
		this.baseURL = this.hyperliquidConfig.restUrl;

		this.httpClient = axios.create({
			baseURL: this.baseURL,
			timeout: 30000,
			headers: {
				'Content-Type': 'application/json',
			},
		});

		this.validateCredentials();
		this.logger.log(`Hyperliquid API Service initialized with base URL: ${this.baseURL}`);
	}

	/**
	 * Validate API credentials on initialization
	 */
	private validateCredentials(): void {
		const { userAddress, apiWallet, apiPrivateKey } = this.hyperliquidConfig;

		this.logger.log('🔍 Checking Hyperliquid credentials from .env...');
		this.logger.log(`HYPERLIQUID_USER_ADDRESS: ${userAddress || 'NOT SET'}`);
		this.logger.log(`HYPERLIQUID_API_WALLET: ${apiWallet || 'NOT SET'}`);
		this.logger.log(`HYPERLIQUID_API_PRIVATE_KEY: ${apiPrivateKey ? apiPrivateKey.substring(0, 10) + '...' : 'NOT SET'}`);

		if (!userAddress || !apiWallet || !apiPrivateKey) {
			this.logger.warn(
				'⚠️  Warning: Hyperliquid wallet credentials are not fully configured. Trading features disabled.',
			);
		} else {
			this.logger.log('✅ Hyperliquid credentials validated');
			this.logger.log(`User Address: ${userAddress}`);
			this.logger.log(`API Wallet: ${apiWallet}`);
		}
	}

	/**
	 * POST request to Hyperliquid API
	 */
	async post<T = any>(endpoint: string, data: any): Promise<HyperliquidApiResponse<T>> {
		try {
			this.logger.debug(`POST ${endpoint}:`, JSON.stringify(data));

			const response = await this.httpClient.post(endpoint, data);

			return this.formatResponse(response.data);
		} catch (error) {
			return this.handleError(error);
		}
	}

	/**
	 * POST request with signature for trading actions
	 */
	async postSigned<T = any>(endpoint: string, action: any, vaultAddress?: string): Promise<HyperliquidApiResponse<T>> {
		try {
			const signedData = await this.signingService.signL1Action(action, vaultAddress);

			this.logger.debug(`POST ${endpoint} (signed):`, JSON.stringify(signedData));

			const response = await this.httpClient.post(endpoint, signedData);

			return this.formatResponse(response.data);
		} catch (error) {
			return this.handleError(error);
		}
	}

	/**
	 * Get meta information (asset info)
	 */
	async getMeta(): Promise<HyperliquidApiResponse> {
		return this.post('/info', { type: 'meta' });
	}

	/**
	 * Load asset map from meta (coin name -> asset ID)
	 */
	private async loadAssetMap(): Promise<void> {
		if (this.assetMap.size > 0) return; // Already loaded

		const response = await this.getMeta();
		if (response.success && response.data?.universe) {
			response.data.universe.forEach((asset: any, index: number) => {
				this.assetMap.set(asset.name, index);
				this.assetInfoMap.set(asset.name, asset); // Cache full asset info
			});
			this.logger.log(`✅ Loaded ${this.assetMap.size} assets`);
		}
	}

	/**
	 * Get asset ID from coin name
	 */
	private async getAssetId(coin: string): Promise<number> {
		await this.loadAssetMap();
		const assetId = this.assetMap.get(coin);
		if (assetId === undefined) {
			throw new Error(`Unknown coin: ${coin}`);
		}
		return assetId;
	}

	/**
	 * Get asset info (including szDecimals) from coin name
	 */
	async getAssetInfo(coin: string): Promise<any> {
		await this.loadAssetMap();
		const assetInfo = this.assetInfoMap.get(coin);
		if (!assetInfo) {
			throw new Error(`Unknown coin: ${coin}`);
		}
		return assetInfo;
	}

	/**
	 * Convert order request to wire format (matches Python SDK)
	 */
	private async orderRequestToWire(orderRequest: any): Promise<any> {
		const assetId = await this.getAssetId(orderRequest.coin);

		return {
			a: assetId,
			b: orderRequest.is_buy,
			p: orderRequest.limit_px, // Already formatted as string
			s: orderRequest.sz,         // Already formatted as string
			r: orderRequest.reduce_only,
			t: orderRequest.order_type,
		};
	}

	/**
	 * Get user state (balances, positions)
	 */
	async getUserState(user?: string): Promise<HyperliquidApiResponse> {
		const address = user || this.hyperliquidConfig.userAddress;
		return this.post('/info', { type: 'clearinghouseState', user: address });
	}

	/**
	 * Get open orders
	 */
	async getOpenOrders(user?: string): Promise<HyperliquidApiResponse> {
		const address = user || this.hyperliquidConfig.userAddress;
		return this.post('/info', { type: 'openOrders', user: address });
	}

	/**
	 * Get L2 order book
	 */
	async getL2Book(coin: string): Promise<HyperliquidApiResponse> {
		return this.post('/info', { type: 'l2Book', coin });
	}

	/**
	 * Get recent trades
	 */
	async getRecentTrades(coin: string, limit: number = 100): Promise<HyperliquidApiResponse> {
		return this.post('/info', { type: 'trades', coin, limit });
	}

	/**
	 * Get candles/klines
	 */
	async getCandles(
		coin: string,
		interval: string,
		startTime?: number,
		endTime?: number,
	): Promise<HyperliquidApiResponse> {
		return this.post('/info', {
			type: 'candleSnapshot',
			req: {
				coin,
				interval,
				startTime,
				endTime,
			},
		});
	}

	/**
	 * Get user fills (trade history)
	 */
	async getUserFills(user?: string): Promise<HyperliquidApiResponse> {
		const address = user || this.hyperliquidConfig.userAddress;
		return this.post('/info', { type: 'userFills', user: address });
	}

	/**
	 * Get funding history
	 */
	async getFundingHistory(coin: string, startTime?: number, endTime?: number): Promise<HyperliquidApiResponse> {
		return this.post('/info', {
			type: 'fundingHistory',
			coin,
			startTime,
			endTime,
		});
	}

	/**
	 * Get all mids (current prices for all assets)
	 */
	async getAllMids(): Promise<HyperliquidApiResponse> {
		return this.post('/info', { type: 'allMids' });
	}

	/**
	 * Place order
	 */
	async placeOrder(orderRequest: any): Promise<HyperliquidApiResponse> {
		// Log the exact order request being sent
		this.logger.debug('Order Request (before wire):', JSON.stringify(orderRequest, null, 2));

		// Convert to wire format
		const orderWire = await this.orderRequestToWire(orderRequest);
		this.logger.debug('Order Wire:', JSON.stringify(orderWire, null, 2));

		const action = {
			type: 'order',
			orders: [orderWire],
			grouping: 'na',
		};

		this.logger.debug('Action being sent:', JSON.stringify(action, null, 2));

		return this.postSigned('/exchange', action);
	}

	/**
	 * Cancel order
	 */
	async cancelOrder(coin: string, oid: number): Promise<HyperliquidApiResponse> {
		const action = {
			type: 'cancel',
			cancels: [{ coin, oid }],
		};

		return this.postSigned('/exchange', action);
	}

	/**
	 * Cancel all orders for a coin
	 */
	async cancelAllOrders(coin?: string): Promise<HyperliquidApiResponse> {
		const action = {
			type: 'cancelByCloid',
			cancels: coin ? [{ coin }] : [],
		};

		return this.postSigned('/exchange', action);
	}

	/**
	 * Update leverage for an asset
	 */
	async updateLeverage(coin: string, isCross: boolean, leverage: number): Promise<HyperliquidApiResponse> {
		const assetId = await this.getAssetId(coin);

		const action = {
			type: 'updateLeverage',
			asset: assetId,
			isCross,
			leverage,
		};

		return this.postSigned('/exchange', action);
	}

	/**
	 * Update isolated margin
	 */
	async updateIsolatedMargin(coin: string, isBuy: boolean, ntli: number): Promise<HyperliquidApiResponse> {
		const action = {
			type: 'updateIsolatedMargin',
			asset: coin,
			isBuy,
			ntli,
		};

		return this.postSigned('/exchange', action);
	}

	/**
	 * Format API response
	 */
	private formatResponse<T>(data: any): HyperliquidApiResponse<T> {
		// Hyperliquid returns different response formats
		// Check if it's an error response
		if (data?.status === 'err' || data?.error) {
			return {
				success: false,
				error: data.error || data.response || 'Unknown error',
				timestamp: Date.now(),
			};
		}

		return {
			success: true,
			data: data,
			timestamp: Date.now(),
		};
	}

	/**
	 * Handle API errors
	 */
	private handleError(error: any): HyperliquidApiResponse {
		this.logger.error('Hyperliquid API Error:', error.response?.data || error.message);

		const errorMessage =
			error.response?.data?.error ||
			error.response?.data?.msg ||
			error.response?.data?.message ||
			error.message ||
			'Unknown error occurred';

		return {
			success: false,
			error: errorMessage,
			timestamp: Date.now(),
		};
	}

	/**
	 * Transfer between spot and perp accounts
	 */
	async spotPerpTransfer(
		usdc: string,
		toPerp: boolean,
	): Promise<HyperliquidApiResponse> {
		const action = {
			type: 'spotUser',
			classTransfer: {
				usdc,
				toPerp,
			},
		};

		return this.postSigned('/exchange', action);
	}

	/**
	 * Withdraw USDC
	 */
	async withdraw(
		destination: string,
		amount: string,
	): Promise<HyperliquidApiResponse> {
		const action = {
			type: 'withdraw',
			destination,
			amount,
		};

		return this.postSigned('/exchange', action);
	}

	/**
	 * Schedule cancel (dead man's switch)
	 */
	async scheduleCancel(time?: number): Promise<HyperliquidApiResponse> {
		const action = {
			type: 'scheduleCancel',
			time,
		};

		return this.postSigned('/exchange', action);
	}

	/**
	 * Debug method to check credentials configuration
	 */
	debugCredentials(): any {
		return {
			baseURL: this.baseURL,
			userAddress: this.hyperliquidConfig.userAddress,
			apiWallet: this.hyperliquidConfig.apiWallet,
			hasPrivateKey: !!this.hyperliquidConfig.apiPrivateKey,
			isTestnet: this.hyperliquidConfig.isTestnet,
		};
	}
}
