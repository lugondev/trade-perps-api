import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ethers } from 'ethers';
import { AsterApiCredentials, AsterApiResponse, AsterSignatureParams } from '../types';

@Injectable()
export class AsterApiService {
	private readonly logger = new Logger(AsterApiService.name);
	private readonly httpClient: AxiosInstance;
	private readonly credentials: AsterApiCredentials;
	private readonly baseURL: string;

	constructor(private configService: ConfigService) {
		this.baseURL = this.configService.get<string>('ASTER_REST_URL') || 'https://fapi.asterdex.com';
		this.credentials = {
			apiKey: this.configService.get<string>('ASTER_API_KEY'),
			apiSecret: this.configService.get<string>('ASTER_API_SECRET'),
			user: this.configService.get<string>('ASTER_USER_ADDRESS'), // Main account wallet address
			signer: this.configService.get<string>('ASTER_SIGNER_ADDRESS'), // API wallet address
			privateKey: this.configService.get<string>('ASTER_PRIVATE_KEY'), // Private key for signing
		};

		this.httpClient = axios.create({
			baseURL: this.baseURL,
			timeout: 30000,
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'User-Agent': 'Aster-Trading-Bot/1.0',
			},
		});

		this.setupInterceptors();
		this.logger.log(`Aster API Service initialized with base URL: ${this.baseURL}`);
	}

	/**
	 * POST with Binance-style HMAC SHA256 signature.
	 * This bypasses the request interceptors because it uses the global axios instance
	 * and constructs the form-urlencoded body + signature manually.
	 */
	async hmacPost<T = any>(endpoint: string, params: Record<string, any>): Promise<AsterApiResponse<T>> {
		try {
			if (!this.credentials.apiKey || !this.credentials.apiSecret) {
				throw new Error('HMAC API credentials (apiKey/apiSecret) are required');
			}

			// Build URL-encoded query string preserving insertion order
			const qs = new URLSearchParams(params as any).toString();

			// Compute HMAC SHA256 signature
			const signature = require('crypto').createHmac('sha256', this.credentials.apiSecret as string)
				.update(qs)
				.digest('hex');

			const body = qs + `&signature=${signature}`;

			const url = this.baseURL + endpoint;

			const response = await axios.post(url, body, {
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'X-MBX-APIKEY': this.credentials.apiKey,
					'User-Agent': 'Aster-Trading-Bot/1.0',
				},
				timeout: 30000,
			});

			return this.formatResponse(response.data);
		} catch (error) {
			return this.handleError(error);
		}
	}

	private setupInterceptors(): void {
		// Request interceptor for authentication
		this.httpClient.interceptors.request.use(
			async (config) => {
				const endpoint = config.url || '';

				// For endpoints requiring signature
				if (this.requiresSignature(endpoint)) {
					// Check if endpoint uses HMAC (v1) or Wallet signature (v3)
					if (this.usesHMACSignature(endpoint)) {
						// HMAC SHA256 signature for /fapi/v1/* endpoints
						this.logger.debug('Using HMAC SHA256 signature for:', endpoint);

						// Get params (merge query params and body data)
						const allParams = {
							...(config.params || {}),
							...(config.data || {}),
						};

						// Add timestamp if not present
						if (!allParams.timestamp) {
							allParams.timestamp = Date.now();
						}
						if (!allParams.recvWindow) {
							allParams.recvWindow = 50000;
						}

						// Generate HMAC signature
						const queryString = new URLSearchParams(allParams).toString();
						const signature = require('crypto')
							.createHmac('sha256', this.credentials.apiSecret)
							.update(queryString)
							.digest('hex');

						this.logger.debug('HMAC Query String:', queryString);
						this.logger.debug('HMAC Signature:', signature);

						// Add signature and API key
						allParams.signature = signature;

						// Set API key header
						config.headers['X-MBX-APIKEY'] = this.credentials.apiKey;

						// Update config with signed params
						if (config.method?.toLowerCase() === 'post') {
							config.data = allParams;
						} else {
							config.params = allParams;
						}
					} else {
						// Ethereum wallet signature for /fapi/v3/* endpoints
						this.logger.debug('Using Ethereum wallet signature for:', endpoint);

						const signatureResult = await this.generateAsterSignature(config);

						// CRITICAL: Use the SAME timestamp and recvWindow that were used for signature generation
						const signatureParams = {
							...signatureResult.originalParams,
							user: signatureResult.user,
							signer: signatureResult.signer,
							nonce: signatureResult.nonce,
							signature: signatureResult.signature,
						};

						// MERGE with existing params
						if (config.method?.toLowerCase() === 'post') {
							config.data = { ...config.data, ...signatureParams };
						} else {
							config.params = { ...config.params, ...signatureParams };
						}
					}
				}

				this.logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
				return config;
			},
			(error) => {
				this.logger.error('Request interceptor error:', error);
				return Promise.reject(error);
			}
		);

		// Response interceptor for logging and error handling
		this.httpClient.interceptors.response.use(
			(response) => {
				this.logger.debug(`API Response: ${response.status} ${response.config.url}`);
				return response;
			},
			(error) => {
				const errorDetails = {
					status: error.response?.status,
					statusText: error.response?.statusText,
					url: error.config?.url,
					method: error.config?.method,
					headers: error.config?.headers,
					data: error.response?.data,
					message: error.message,
				};
				this.logger.error(`API Error: ${error.response?.status} ${error.message}`);
				this.logger.debug('Error details:', errorDetails);
				return Promise.reject(error);
			}
		);
	}

	private requiresSignature(endpoint: string): boolean {
		// Endpoints that require signature
		const signatureEndpoints = [
			'/fapi/v3/order',
			'/fapi/v3/balance',
			'/fapi/v3/account',
			'/fapi/v3/leverage',
			'/fapi/v1/order',
			'/fapi/v1/allOrders',
			'/fapi/v1/openOrders',
			'/fapi/v1/userTrades',
			'/fapi/v1/income',
			'/fapi/v1/positionRisk',
			'/fapi/v1/leverage',
			'/fapi/v1/marginType',
			'/fapi/v1/positionMargin',
			'/fapi/v1/listenKey',
		];

		return signatureEndpoints.some(sigEndpoint => endpoint.includes(sigEndpoint));
	}

	private usesHMACSignature(endpoint: string): boolean {
		// /fapi/v1/* endpoints use HMAC SHA256 with API key/secret
		// /fapi/v3/* endpoints use Ethereum wallet signature

		// Extract pathname from endpoint (handle full URL or relative path)
		try {
			// If endpoint is absolute URL, parse it
			if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
				const url = new URL(endpoint);
				return url.pathname.startsWith('/fapi/v1/');
			}

			// If relative path, remove query string and check
			const pathname = endpoint.split('?')[0];
			return pathname.startsWith('/fapi/v1/');
		} catch (error) {
			// Fallback to simple includes check if parsing fails
			this.logger.warn(`Failed to parse endpoint for HMAC check: ${endpoint}`, error);
			return endpoint.includes('/fapi/v1/');
		}
	}

	private async generateAsterSignature(config: AxiosRequestConfig): Promise<AsterSignatureParams> {
		try {
			if (!this.credentials.user || !this.credentials.signer || !this.credentials.privateKey) {
				throw new Error('Aster credentials (user, signer, privateKey) are required for signature generation');
			}

			// Generate nonce (microseconds) - EXACTLY as in successful script
			const nonce = Math.trunc(Date.now() * 1000);

			// Store original numeric values - CRITICAL for request to use SAME values
			const timestamp = Date.now();
			const recvWindow = 50000;

			// Get business parameters from config (params for GET, data for POST)
			const businessParams = config.method?.toLowerCase() === 'post'
				? (config.data || {})
				: (config.params || {});

			// Merge with timestamp and recvWindow - CONVERT ALL TO STRINGS for signature
			const allParams = {
				...businessParams,
				timestamp: String(timestamp),  // Convert to string for signature
				recvWindow: String(recvWindow) // Convert to string for signature
			};

			this.logger.debug('All parameters for signature (strings):', allParams);
			this.logger.debug('Original numeric values:', { timestamp, recvWindow });
			this.logger.debug('Nonce (microseconds):', nonce);

			// Generate signature with string values - EXACTLY as in script
			const sortedJson = JSON.stringify(allParams, Object.keys(allParams).sort())
				.replace(/\s/g, '')
				.replace(/'/g, '"');

			this.logger.debug('Sorted JSON:', sortedJson);

			const types = ['string', 'address', 'address', 'uint256'];
			const values = [sortedJson, this.credentials.user, this.credentials.signer, nonce];

			const abiCoder = ethers.AbiCoder.defaultAbiCoder();
			const encoded = abiCoder.encode(types, values);
			const hash = ethers.keccak256(encoded);

			const wallet = new ethers.Wallet(this.credentials.privateKey);
			const signature = await wallet.signMessage(ethers.getBytes(hash));

			this.logger.debug('Hash:', hash);
			this.logger.debug('Signature:', signature);

			return {
				user: this.credentials.user,
				signer: this.credentials.signer,
				nonce,
				signature,
				originalParams: {
					timestamp,    // Return original numeric value
					recvWindow    // Return original numeric value
				}
			};
		} catch (error) {
			this.logger.error('Error generating Aster signature:', error);
			throw error;
		}
	}

	async get<T = any>(endpoint: string, params?: any): Promise<AsterApiResponse<T>> {
		try {
			const response = await this.httpClient.get(endpoint, { params });
			return this.formatResponse(response.data);
		} catch (error) {
			return this.handleError(error);
		}
	}

	async post<T = any>(endpoint: string, data?: any): Promise<AsterApiResponse<T>> {
		try {
			const response = await this.httpClient.post(endpoint, data);
			return this.formatResponse(response.data);
		} catch (error) {
			return this.handleError(error);
		}
	}

	async put<T = any>(endpoint: string, data?: any): Promise<AsterApiResponse<T>> {
		try {
			const response = await this.httpClient.put(endpoint, data);
			return this.formatResponse(response.data);
		} catch (error) {
			return this.handleError(error);
		}
	}

	async delete<T = any>(endpoint: string, params?: any): Promise<AsterApiResponse<T>> {
		try {
			const response = await this.httpClient.delete(endpoint, { params });
			return this.formatResponse(response.data);
		} catch (error) {
			return this.handleError(error);
		}
	}

	private formatResponse<T>(data: any): AsterApiResponse<T> {
		return {
			success: true,
			data,
			timestamp: Date.now(),
		};
	}

	private handleError(error: any): AsterApiResponse {
		const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
		this.logger.error(`API Error: ${errorMessage}`);

		return {
			success: false,
			error: errorMessage,
			timestamp: Date.now(),
		};
	}

	// Health check method - Test Connectivity
	async ping(): Promise<AsterApiResponse> {
		try {
			const response = await this.httpClient.get('/fapi/v1/ping');
			return this.formatResponse(response.data);
		} catch (error) {
			return this.handleError(error);
		}
	}

	// Get server time - Check Server Time
	async getServerTime(): Promise<AsterApiResponse<{ serverTime: number }>> {
		try {
			const response = await this.httpClient.get('/fapi/v1/time');
			return this.formatResponse(response.data);
		} catch (error) {
			return this.handleError(error);
		}
	}

	// Exchange Information
	async getExchangeInfo(): Promise<AsterApiResponse> {
		try {
			const response = await this.httpClient.get('/fapi/v1/exchangeInfo');
			return this.formatResponse(response.data);
		} catch (error) {
			return this.handleError(error);
		}
	}

	// Order Book
	async getOrderBook(symbol: string, limit: number = 500): Promise<AsterApiResponse> {
		try {
			const response = await this.httpClient.get('/fapi/v1/depth', {
				params: { symbol, limit }
			});
			return this.formatResponse(response.data);
		} catch (error) {
			return this.handleError(error);
		}
	}

	// Recent Trades List
	async getRecentTrades(symbol: string, limit: number = 500): Promise<AsterApiResponse> {
		try {
			const response = await this.httpClient.get('/fapi/v1/trades', {
				params: { symbol, limit }
			});
			return this.formatResponse(response.data);
		} catch (error) {
			return this.handleError(error);
		}
	}

	// 24hr Ticker Price Change Statistics
	async get24hrTicker(symbol?: string): Promise<AsterApiResponse> {
		try {
			const params = symbol ? { symbol } : undefined;
			const response = await this.httpClient.get('/fapi/v1/ticker/24hr', { params });
			return this.formatResponse(response.data);
		} catch (error) {
			return this.handleError(error);
		}
	}

	// Symbol Price Ticker
	async getPriceTicker(symbol?: string): Promise<AsterApiResponse> {
		try {
			const params = symbol ? { symbol } : undefined;
			const response = await this.httpClient.get('/fapi/v1/ticker/price', { params });
			return this.formatResponse(response.data);
		} catch (error) {
			return this.handleError(error);
		}
	}

	// Symbol Order Book Ticker
	async getBookTicker(symbol?: string): Promise<AsterApiResponse> {
		try {
			const params = symbol ? { symbol } : undefined;
			const response = await this.httpClient.get('/fapi/v1/ticker/bookTicker', { params });
			return this.formatResponse(response.data);
		} catch (error) {
			return this.handleError(error);
		}
	}

	// Kline/Candlestick Data
	async getKlines(symbol: string, interval: string, startTime?: number, endTime?: number, limit: number = 500): Promise<AsterApiResponse> {
		try {
			const params: any = { symbol, interval, limit };
			if (startTime) params.startTime = startTime;
			if (endTime) params.endTime = endTime;

			const response = await this.httpClient.get('/fapi/v1/klines', { params });
			return this.formatResponse(response.data);
		} catch (error) {
			return this.handleError(error);
		}
	}

	// Mark Price
	async getMarkPrice(symbol?: string): Promise<AsterApiResponse> {
		try {
			const params = symbol ? { symbol } : undefined;
			const response = await this.httpClient.get('/fapi/v1/premiumIndex', { params });
			return this.formatResponse(response.data);
		} catch (error) {
			return this.handleError(error);
		}
	}

	// Get Funding Rate History
	async getFundingRate(symbol?: string, startTime?: number, endTime?: number, limit: number = 100): Promise<AsterApiResponse> {
		try {
			const params: any = { limit };
			if (symbol) params.symbol = symbol;
			if (startTime) params.startTime = startTime;
			if (endTime) params.endTime = endTime;

			const response = await this.httpClient.get('/fapi/v1/fundingRate', { params });
			return this.formatResponse(response.data);
		} catch (error) {
			return this.handleError(error);
		}
	}

	// Debug method to check credentials configuration
	debugCredentials(): any {
		return {
			baseURL: this.baseURL,
			hasApiKey: !!this.credentials.apiKey,
			hasApiSecret: !!this.credentials.apiSecret,
			hasUser: !!this.credentials.user,
			hasSigner: !!this.credentials.signer,
			hasPrivateKey: !!this.credentials.privateKey,
			userAddress: this.credentials.user,
			signerAddress: this.credentials.signer,
			// Never log actual keys/secrets for security
			apiKeyPrefix: this.credentials.apiKey ? this.credentials.apiKey.substring(0, 8) + '...' : 'NOT_SET',
		};
	}
}