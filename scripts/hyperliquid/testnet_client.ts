#!/usr/bin/env ts-node
/**
 * Hyperliquid Testnet Client Script
 * 
 * This script tests Hyperliquid testnet connectivity and trading operations
 * Run with: pnpm hyperliquid:testnet
 */

import 'reflect-metadata';
import { config as dotenvConfig } from 'dotenv';
import { ConfigService } from '@nestjs/config';
import { HyperliquidApiService } from '../../src/hyperliquid/services/hyperliquid-api.service';
import { SigningService } from '../../src/hyperliquid/services/signing.service';

// Load .env file
dotenvConfig();

// Create a minimal ConfigService implementation
class MockConfigService {
	private config: any;

	constructor() {
		const isTestnet = process.env.HYPERLIQUID_TESTNET === 'true';
		this.config = {
			hyperliquid: {
				restUrl: process.env.HYPERLIQUID_REST_URL || (isTestnet ? 'https://api.hyperliquid-testnet.xyz' : 'https://api.hyperliquid.xyz'),
				wsUrl: process.env.HYPERLIQUID_WS_URL || (isTestnet ? 'wss://api.hyperliquid-testnet.xyz/ws' : 'wss://api.hyperliquid.xyz/ws'),
				userAddress: process.env.HYPERLIQUID_USER_ADDRESS || '',
				apiWallet: process.env.HYPERLIQUID_API_WALLET || '',
				apiPrivateKey: process.env.HYPERLIQUID_API_PRIVATE_KEY || '',
				isTestnet,
			},
		};
	}

	get(key: string): any {
		return this.config[key];
	}
}

async function main() {
	console.log('🚀 Hyperliquid Testnet Client\n');

	// Initialize services
	const configService = new MockConfigService() as unknown as ConfigService;

	let apiService: HyperliquidApiService;
	try {
		const signingService = new SigningService(configService);
		apiService = new HyperliquidApiService(configService, signingService);
	} catch (error: any) {
		console.error('❌ Failed to initialize services:', error.message);
		console.error('Please check your environment variables in .env file');
		process.exit(1);
	}

	// Log configuration
	console.log('📋 Configuration:');
	const debugInfo = apiService.debugCredentials();
	console.log(debugInfo);
	console.log('');

	if (!debugInfo.userAddress || !debugInfo.apiWallet || !debugInfo.hasPrivateKey) {
		console.warn('⚠️  Warning: Incomplete credentials. Only read-only operations will work.\n');
	}

	try {
		// Test 1: Get meta information (public endpoint)
		console.log('Test 1: Fetching meta information...');
		const metaResponse = await apiService.getMeta();

		if (metaResponse.success && metaResponse.data) {
			const universe = metaResponse.data.universe || [];
			console.log(`✅ Meta fetched successfully. Found ${universe.length} assets`);
			if (universe.length > 0) {
				console.log('Sample assets:', universe.slice(0, 5).map((a: any) => a.name).join(', '));
			}
		} else {
			console.log('❌ Meta fetch failed:', metaResponse.error);
		}
		console.log('');

		// Test 2: Get all mids (public endpoint)
		console.log('Test 2: Fetching all mids (current prices)...');
		const midsResponse = await apiService.getAllMids();

		if (midsResponse.success && midsResponse.data) {
			const mids = midsResponse.data;
			const entries = Object.entries(mids).slice(0, 5);
			console.log('✅ Mids fetched successfully');
			if (entries.length > 0) {
				console.log('Sample prices:');
				entries.forEach(([coin, price]) => {
					console.log(`  ${coin}: ${price}`);
				});
			}
		} else {
			console.log('❌ Mids fetch failed:', midsResponse.error);
		}
		console.log('');

		// Test 3: Get user state (requires user address)
		if (debugInfo.userAddress) {
			console.log('Test 3: Fetching user state...');
			const userStateResponse = await apiService.getUserState();

			if (userStateResponse.success && userStateResponse.data) {
				console.log('✅ User state fetched successfully');

				const state = userStateResponse.data;
				if (state.marginSummary) {
					console.log('Account Summary:');
					console.log(`  Account Value: ${state.marginSummary.accountValue || 'N/A'}`);
					console.log(`  Total Margin Used: ${state.marginSummary.totalMarginUsed || 'N/A'}`);
					console.log(`  Withdrawable: ${state.withdrawable || 'N/A'}`);
				}

				if (state.assetPositions && state.assetPositions.length > 0) {
					console.log(`\nPositions (${state.assetPositions.length}):`);
					state.assetPositions.forEach((pos: any) => {
						console.log(`  ${pos.position.coin}: ${pos.position.szi} @ ${pos.position.entryPx}`);
					});
				} else {
					console.log('  No open positions');
				}
			} else {
				console.log('❌ User state fetch failed:', userStateResponse.error);
			}
			console.log('');

			// Test 4: Get open orders
			console.log('Test 4: Fetching open orders...');
			const ordersResponse = await apiService.getOpenOrders();

			if (ordersResponse.success) {
				const orders = ordersResponse.data || [];
				console.log(`✅ Open orders fetched: ${orders.length} orders`);
				if (orders.length > 0) {
					orders.forEach((order: any) => {
						console.log(`  ${order.coin} ${order.side === 'B' ? 'BUY' : 'SELL'} ${order.sz} @ ${order.limitPx}`);
					});
				}
			} else {
				console.log('❌ Open orders fetch failed:', ordersResponse.error);
			}
			console.log('');
		} else {
			console.log('⚠️  Skipping authenticated tests (no user address configured)\n');
		}

	} catch (error: any) {
		console.error('❌ Error during tests:', error.message);
		if (error.stack) {
			console.error(error.stack);
		}
		process.exit(1);
	}

	console.log('✨ Tests completed successfully');
}

main()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error('Fatal error:', err);
		process.exit(1);
	});
