import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import { BinanceConfig } from '../../../config/binance.config';
import { BinanceApiResponse } from '../types';

@Injectable()
export class BinanceApiService {
  private readonly logger = new Logger(BinanceApiService.name);
  private readonly httpClient: AxiosInstance;
  private readonly baseURL: string;
  private readonly binanceConfig: BinanceConfig;

  constructor(private configService: ConfigService) {
    this.binanceConfig = this.configService.get<BinanceConfig>('binance')!;
    this.baseURL = this.binanceConfig.useTestnet
      ? this.binanceConfig.testnetRestUrl
      : this.binanceConfig.restUrl;

    this.httpClient = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-MBX-APIKEY': this.binanceConfig.apiKey,
      },
    });

    this.validateCredentials();
    this.logger.log(`Binance Futures API Service initialized with base URL: ${this.baseURL}`);
  }

  /**
   * Validate API credentials on initialization
   */
  private validateCredentials(): void {
    const { apiKey, apiSecret } = this.binanceConfig;

    this.logger.log('🔍 Checking Binance credentials from .env...');
    this.logger.log(`BINANCE_API_KEY: ${apiKey ? apiKey.substring(0, 10) + '...' : 'NOT SET'}`);
    this.logger.log(
      `BINANCE_API_SECRET: ${apiSecret ? apiSecret.substring(0, 10) + '...' : 'NOT SET'}`,
    );

    if (!apiKey || !apiSecret) {
      this.logger.warn(
        '⚠️  Warning: Binance API credentials are not fully configured. Trading features disabled.',
      );
    } else {
      this.logger.log('✅ Binance credentials validated');
    }
  }

  /**
   * Generate HMAC SHA256 signature
   */
  private generateSignature(queryString: string): string {
    return crypto
      .createHmac('sha256', this.binanceConfig.apiSecret)
      .update(queryString)
      .digest('hex');
  }

  /**
   * Build query string with signature
   */
  private buildSignedQuery(params: Record<string, any>): string {
    const timestamp = Date.now();
    const allParams = { ...params, timestamp };
    const queryString = new URLSearchParams(allParams as any).toString();
    const signature = this.generateSignature(queryString);
    return `${queryString}&signature=${signature}`;
  }

  /**
   * Public GET request (no signature required)
   */
  async getPublic<T = any>(
    endpoint: string,
    params?: Record<string, any>,
  ): Promise<BinanceApiResponse<T>> {
    try {
      const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
      const url = `${endpoint}${queryString}`;

      this.logger.debug(`GET ${url}`);

      const response = await this.httpClient.get(url);

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Private GET request (with signature)
   */
  async get<T = any>(
    endpoint: string,
    params?: Record<string, any>,
  ): Promise<BinanceApiResponse<T>> {
    try {
      const queryString = this.buildSignedQuery(params || {});
      const url = `${endpoint}?${queryString}`;

      this.logger.debug(`GET ${url}`);

      const response = await this.httpClient.get(url);

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * POST request with signature
   */
  async post<T = any>(
    endpoint: string,
    params?: Record<string, any>,
  ): Promise<BinanceApiResponse<T>> {
    try {
      const queryString = this.buildSignedQuery(params || {});
      const url = `${endpoint}?${queryString}`;

      this.logger.debug(`POST ${url}`);

      const response = await this.httpClient.post(url);

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * DELETE request with signature
   */
  async delete<T = any>(
    endpoint: string,
    params?: Record<string, any>,
  ): Promise<BinanceApiResponse<T>> {
    try {
      const queryString = this.buildSignedQuery(params || {});
      const url = `${endpoint}?${queryString}`;

      this.logger.debug(`DELETE ${url}`);

      const response = await this.httpClient.delete(url);

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * PUT request with signature
   */
  async put<T = any>(
    endpoint: string,
    params?: Record<string, any>,
  ): Promise<BinanceApiResponse<T>> {
    try {
      const queryString = this.buildSignedQuery(params || {});
      const url = `${endpoint}?${queryString}`;

      this.logger.debug(`PUT ${url}`);

      const response = await this.httpClient.put(url);

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): BinanceApiResponse {
    if (error.response) {
      const { status, data } = error.response;
      this.logger.error(`Binance API Error [${status}]:`, data);

      return {
        success: false,
        error: data.msg || 'Unknown API error',
        code: data.code || status,
      };
    } else if (error.request) {
      this.logger.error('No response received from Binance API:', error.message);
      return {
        success: false,
        error: 'No response from server',
      };
    } else {
      this.logger.error('Error setting up request:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
