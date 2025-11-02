import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import { OkxConfig } from '../../../config/okx.config';
import { OkxApiResponse } from '../types';

@Injectable()
export class OkxApiService {
  private readonly logger = new Logger(OkxApiService.name);
  private readonly httpClient: AxiosInstance;
  private readonly baseURL: string;
  private readonly okxConfig: OkxConfig;

  constructor(private configService: ConfigService) {
    this.okxConfig = this.configService.get<OkxConfig>('okx')!;

    // OKX uses the same REST URL for both live and demo trading
    // The x-simulated-trading header determines the environment
    this.baseURL = this.okxConfig.restUrl;

    this.httpClient = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.validateCredentials();
    const mode = this.okxConfig.useSimulated ? '🧪 DEMO TRADING' : '💰 LIVE TRADING';
    this.logger.log(`OKX API Service initialized with base URL: ${this.baseURL} (${mode})`);
  }

  /**
   * Validate API credentials on initialization
   */
  private validateCredentials(): void {
    const { apiKey, apiSecret, passphrase } = this.okxConfig;

    this.logger.log('🔍 Checking OKX credentials from .env...');
    this.logger.log(`OKX_API_KEY: ${apiKey ? apiKey.substring(0, 10) + '...' : 'NOT SET'}`);
    this.logger.log(
      `OKX_API_SECRET: ${apiSecret ? apiSecret.substring(0, 10) + '...' : 'NOT SET'}`,
    );
    this.logger.log(`OKX_PASSPHRASE: ${passphrase ? '***' : 'NOT SET'}`);

    if (!apiKey || !apiSecret || !passphrase) {
      this.logger.warn(
        '⚠️  Warning: OKX API credentials are not fully configured. Trading features disabled.',
      );
    } else {
      this.logger.log('✅ OKX credentials validated');
    }
  }

  /**
   * Generate OKX signature
   */
  private generateSignature(timestamp: string, method: string, path: string, body: string): string {
    const message = timestamp + method + path + body;
    return crypto.createHmac('sha256', this.okxConfig.apiSecret).update(message).digest('base64');
  }

  /**
   * Build headers for OKX API request
   */
  private buildHeaders(method: string, path: string, body: string = ''): any {
    const timestamp = new Date().toISOString();
    const signature = this.generateSignature(timestamp, method, path, body);

    const headers: any = {
      'OK-ACCESS-KEY': this.okxConfig.apiKey,
      'OK-ACCESS-SIGN': signature,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': this.okxConfig.passphrase,
      'Content-Type': 'application/json',
    };

    // Add simulated trading header for demo trading
    if (this.okxConfig.useSimulated) {
      headers['x-simulated-trading'] = '1';
    }

    return headers;
  }

  /**
   * Public GET request (no signature required)
   */
  async getPublic<T = any>(
    endpoint: string,
    params?: Record<string, any>,
  ): Promise<OkxApiResponse<T>> {
    try {
      const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
      const url = `${endpoint}${queryString}`;

      this.logger.debug(`GET ${url}`);

      const response = await this.httpClient.get(url);

      if (response.data.code === '0') {
        return {
          success: true,
          data: response.data.data,
        };
      } else {
        return {
          success: false,
          error: response.data.msg,
          code: response.data.code,
        };
      }
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Private GET request (with signature)
   */
  async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<OkxApiResponse<T>> {
    try {
      const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
      const path = `${endpoint}${queryString}`;

      const headers = this.buildHeaders('GET', path);

      this.logger.debug(`GET ${path}`);

      const response = await this.httpClient.get(path, { headers });

      if (response.data.code === '0') {
        return {
          success: true,
          data: response.data.data,
        };
      } else {
        return {
          success: false,
          error: response.data.msg,
          code: response.data.code,
        };
      }
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * POST request with signature
   */
  async post<T = any>(endpoint: string, data?: any): Promise<OkxApiResponse<T>> {
    try {
      const body = data ? JSON.stringify(data) : '';
      const headers = this.buildHeaders('POST', endpoint, body);

      this.logger.debug(`POST ${endpoint}:`, body);

      const response = await this.httpClient.post(endpoint, data || {}, { headers });

      if (response.data.code === '0') {
        return {
          success: true,
          data: response.data.data,
        };
      } else {
        this.logger.error(
          `OKX API returned error code ${response.data.code}: ${response.data.msg}`,
        );
        this.logger.error(`Response data:`, JSON.stringify(response.data, null, 2));
        return {
          success: false,
          error: response.data.msg,
          code: response.data.code,
        };
      }
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): OkxApiResponse {
    if (error.response) {
      const { status, data } = error.response;
      this.logger.error(`OKX API Error [${status}]:`, data);

      return {
        success: false,
        error: data.msg || 'Unknown API error',
        code: data.code || status.toString(),
      };
    } else if (error.request) {
      this.logger.error('No response received from OKX API:', error.message);
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
