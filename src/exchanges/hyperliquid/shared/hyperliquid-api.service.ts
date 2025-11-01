import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { HyperliquidApiResponse } from '../types';
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
    this.logger.log(
      `HYPERLIQUID_API_PRIVATE_KEY: ${apiPrivateKey ? apiPrivateKey.substring(0, 10) + '...' : 'NOT SET'}`,
    );

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
  async postSigned<T = any>(
    endpoint: string,
    action: any,
    vaultAddress?: string,
  ): Promise<HyperliquidApiResponse<T>> {
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
   * Remove trailing zeros from a number string (matches Hyperliquid SDK requirement)
   * Hyperliquid API rejects price/size with trailing zeros
   * Examples: "12345.0" -> "12345", "0.123450" -> "0.12345"
   */
  private removeTrailingZeros(value: string): string {
    if (!value.includes('.')) return value;
    const normalized = value.replace(/\.?0+$/, '');
    if (normalized === '-0') return '0';
    return normalized;
  }

  /**
   * Convert number to wire format (string without trailing zeros)
   * Matches Hyperliquid SDK floatToWire implementation
   */
  private floatToWire(x: number): string {
    const rounded = x.toFixed(8);
    if (Math.abs(parseFloat(rounded) - x) >= 1e-12) {
      throw new Error(`floatToWire causes rounding: ${x}`);
    }
    return this.removeTrailingZeros(rounded);
  }

  /**
   * Convert order request to wire format (matches Python SDK)
   * Per Hyperliquid docs: p (price) and s (size) must be STRINGS without trailing zeros
   */
  private async orderRequestToWire(orderRequest: any): Promise<any> {
    const assetId = await this.getAssetId(orderRequest.coin);

    // Helper to remove trailing zeros from string
    const removeTrailingZeros = (val: string): string => {
      if (!val.includes('.')) return val;
      const normalized = val.replace(/\.?0+$/, '');
      return normalized === '-0' ? '0' : normalized;
    };

    // Helper to convert to string without trailing zeros
    const toWireString = (val: any, decimals: number = 8): string | undefined => {
      if (val === undefined || val === null) return undefined;
      const n = Number(val);
      if (Number.isNaN(n)) return undefined;
      return removeTrailingZeros(n.toFixed(decimals));
    };

    // Try to get asset info for size decimals
    let szDecimals = 8; // default
    try {
      const info = await this.getAssetInfo(orderRequest.coin);
      if (info?.szDecimals !== undefined) {
        szDecimals = info.szDecimals;
      }
    } catch (e) {
      this.logger.debug(
        `Could not load asset info for ${orderRequest.coin}, using default szDecimals=8`,
      );
    }

    // CRITICAL: Key order must match Python SDK for correct msgpack encoding
    // Order: a, b, p, s (optional for tpsl), r, t, c (if cloid exists)
    const wireOrder: any = {};
    wireOrder.a = assetId;
    wireOrder.b = orderRequest.is_buy;
    wireOrder.p = toWireString(orderRequest.limit_px, 8);

    // Always include size if provided
    if (orderRequest.sz !== undefined) {
      wireOrder.s = toWireString(orderRequest.sz, szDecimals);
    }

    wireOrder.r = orderRequest.reduce_only;

    // Clean up trigger order format - triggerPx must also have no trailing zeros
    let orderType = orderRequest.order_type;
    if (orderType?.trigger?.triggerPx) {
      orderType = {
        ...orderType,
        trigger: {
          ...orderType.trigger,
          triggerPx: toWireString(orderType.trigger.triggerPx, 8),
        },
      };
    }
    wireOrder.t = orderType;

    // Add cloid if present (must be last)
    if (orderRequest.cloid) {
      wireOrder.c = orderRequest.cloid;
    }

    this.logger.debug('Final wire order:', JSON.stringify(wireOrder, null, 2));
    return wireOrder;
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
  async getFundingHistory(
    coin: string,
    startTime?: number,
    endTime?: number,
  ): Promise<HyperliquidApiResponse> {
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

    // IMPORTANT: Key order matters for msgpack encoding!
    // Must match Python SDK order: type, orders, grouping
    const action: any = {};
    action.type = 'order';
    action.orders = [orderWire];
    action.grouping = 'na';

    this.logger.debug('Action being sent:', JSON.stringify(action, null, 2));

    return this.postSigned('/exchange', action);
  }

  /**
   * Cancel order
   */
  async cancelOrder(coin: string, oid: number): Promise<HyperliquidApiResponse> {
    // IMPORTANT: Key order matters for msgpack encoding!
    const action: any = {};
    action.type = 'cancel';
    action.cancels = [{ a: await this.getAssetId(coin), o: oid }];

    return this.postSigned('/exchange', action);
  }

  /**
   * Cancel all orders for a coin
   */
  async cancelAllOrders(coin?: string): Promise<HyperliquidApiResponse> {
    // IMPORTANT: Key order matters for msgpack encoding!
    const action: any = {};
    action.type = 'cancelByCloid';
    action.cancels = coin ? [{ asset: await this.getAssetId(coin) }] : [];

    return this.postSigned('/exchange', action);
  }

  /**
   * Update leverage for an asset
   */
  async updateLeverage(
    coin: string,
    isCross: boolean,
    leverage: number,
  ): Promise<HyperliquidApiResponse> {
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
  async updateIsolatedMargin(
    coin: string,
    isBuy: boolean,
    ntli: number,
  ): Promise<HyperliquidApiResponse> {
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
    // Log the raw data first for debugging
    this.logger.debug('Raw API response:', data);

    // If data is null or undefined, return error
    if (data === null || data === undefined) {
      this.logger.warn('Empty or null response from Hyperliquid');
      return {
        success: false,
        error: 'Empty or null response from Hyperliquid',
        timestamp: Date.now(),
      };
    }

    // Check if it's an error response (common Hyperliquid error formats)
    if (data?.status === 'err' || data?.error || data?.response === 'error') {
      this.logger.warn('Error response received from Hyperliquid:', data);
      return {
        success: false,
        error: data.error || data.msg || data.message || data.response || 'Unknown error',
        timestamp: Date.now(),
      };
    }

    // If data is a string, treat it as a plain message or error
    if (typeof data === 'string') {
      this.logger.debug('String response received from Hyperliquid:', data);
      // Could be a success message or error
      return {
        success: true,
        data: data as T,
        timestamp: Date.now(),
      };
    }

    // If data is an array, return it as is (might be a list of orders, fills, etc.)
    if (Array.isArray(data)) {
      this.logger.debug('Array response received from Hyperliquid');
      return {
        success: true,
        data: data as T,
        timestamp: Date.now(),
      };
    }

    // If data is an object, check common success indicators
    if (typeof data === 'object') {
      // Some Hyperliquid endpoints return different structures
      this.logger.debug('Object response received from Hyperliquid');
      return {
        success: true,
        data: data as T,
        timestamp: Date.now(),
      };
    }

    // Fallback: return the data as is
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
    // Log the raw error for debugging
    // Log the raw error and response body for debugging
    this.logger.error('Hyperliquid API Error:', error);
    const respBody = error?.response?.data;
    if (respBody) {
      try {
        this.logger.error('Hyperliquid response body:', JSON.stringify(respBody));
      } catch (e) {
        this.logger.error('Hyperliquid response body (raw):', respBody);
      }
    }

    // Check if it's a JSON parsing/serialization error
    if (
      error.name === 'SyntaxError' ||
      error.code === 'EBADJSON' ||
      error.message?.includes('deserialize')
    ) {
      const responseText = error.response?.data || 'No response body';
      this.logger.error('JSON parsing error. Raw response:', responseText);
      return {
        success: false,
        error: `Invalid JSON response from API: ${responseText}`,
        timestamp: Date.now(),
      };
    }

    // Check if response data exists
    const responseData = error.response?.data;
    if (!responseData) {
      // Network error or no response
      const status = error.response?.status;
      const statusText = error.response?.statusText;
      return {
        success: false,
        error: `Network error (${status || 'unknown'}): ${statusText || error.message}`,
        timestamp: Date.now(),
      };
    }

    // Try to extract error message from response
    const errorMessage =
      responseData.error ||
      responseData.msg ||
      responseData.message ||
      responseData.response ||
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
  async spotPerpTransfer(usdc: string, toPerp: boolean): Promise<HyperliquidApiResponse> {
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
  async withdraw(destination: string, amount: string): Promise<HyperliquidApiResponse> {
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
