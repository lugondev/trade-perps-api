import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || 'your-api-key';

interface TestResult {
	test: string;
	success: boolean;
	data?: any;
	error?: string;
	duration?: number;
}

const results: TestResult[] = [];

// Helper function to make API calls
async function makeRequest(
	method: string,
	endpoint: string,
	data?: any,
): Promise<any> {
	const startTime = Date.now();
	try {
		const response = await axios({
			method,
			url: `${API_BASE_URL}${endpoint}`,
			data,
			headers: {
				'Content-Type': 'application/json',
				'X-API-Key': API_KEY,
			},
		});
		const duration = Date.now() - startTime;
		return { success: true, data: response.data, duration };
	} catch (error: any) {
		const duration = Date.now() - startTime;
		return {
			success: false,
			error: error.response?.data || error.message,
			duration,
		};
	}
}

// Sleep helper
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function testQuickLong() {
	console.log('\n🟢 Testing Quick Long with TP/SL...');

	const testData = {
		coin: 'BTC',
		usdValue: 10, // $10 position
		stopLossPercent: 5,
		takeProfitPercent: 10,
		leverage: 5,
	};

	const result = await makeRequest('POST', '/hyperliquid/quick-long', testData);

	results.push({
		test: 'Quick Long',
		success: result.success,
		data: result.data,
		error: result.error,
		duration: result.duration,
	});

	if (result.success) {
		console.log('✅ Quick Long executed successfully');
		console.log(`   Entry Price: $${result.data.data?.currentPrice}`);
		console.log(`   Size: ${result.data.data?.size}`);
		console.log(`   Stop Loss: $${result.data.data?.stopLossPrice?.toFixed(2)}`);
		console.log(`   Take Profit: $${result.data.data?.takeProfitPrice?.toFixed(2)}`);
		console.log(`   Duration: ${result.duration}ms`);
	} else {
		console.log('❌ Quick Long failed:', result.error);
	}

	return result;
}

async function testQuickShort() {
	console.log('\n🔴 Testing Quick Short with TP/SL...');

	const testData = {
		coin: 'ETH',
		usdValue: 10, // $10 position
		stopLossPercent: 5,
		takeProfitPercent: 10,
		leverage: 5,
	};

	const result = await makeRequest('POST', '/hyperliquid/quick-short', testData);

	results.push({
		test: 'Quick Short',
		success: result.success,
		data: result.data,
		error: result.error,
		duration: result.duration,
	});

	if (result.success) {
		console.log('✅ Quick Short executed successfully');
		console.log(`   Entry Price: $${result.data.data?.currentPrice}`);
		console.log(`   Size: ${result.data.data?.size}`);
		console.log(`   Stop Loss: $${result.data.data?.stopLossPrice?.toFixed(2)}`);
		console.log(`   Take Profit: $${result.data.data?.takeProfitPrice?.toFixed(2)}`);
		console.log(`   Duration: ${result.duration}ms`);
	} else {
		console.log('❌ Quick Short failed:', result.error);
	}

	return result;
}

async function testGetPositions() {
	console.log('\n📊 Getting current positions...');

	const result = await makeRequest('GET', '/hyperliquid/positions');

	results.push({
		test: 'Get Positions',
		success: result.success,
		data: result.data,
		error: result.error,
		duration: result.duration,
	});

	if (result.success && result.data.data) {
		console.log('✅ Positions retrieved successfully');
		const positions = result.data.data;
		positions.forEach((pos: any) => {
			const size = parseFloat(pos.szi);
			if (size !== 0) {
				console.log(`   ${pos.coin}: ${size > 0 ? 'LONG' : 'SHORT'} ${Math.abs(size)}`);
				console.log(`      Entry: $${pos.entryPx}, PnL: $${pos.unrealizedPnl}`);
			}
		});
	} else {
		console.log('❌ Failed to get positions:', result.error);
	}

	return result;
}

async function testClosePosition(coin: string) {
	console.log(`\n🔒 Testing Close Position for ${coin}...`);

	const result = await makeRequest('POST', '/hyperliquid/close-position', { coin });

	results.push({
		test: `Close Position - ${coin}`,
		success: result.success,
		data: result.data,
		error: result.error,
		duration: result.duration,
	});

	if (result.success) {
		console.log(`✅ Position closed successfully for ${coin}`);
		console.log(`   Duration: ${result.duration}ms`);
	} else {
		console.log(`❌ Failed to close position for ${coin}:`, result.error);
	}

	return result;
}

async function testCloseAllPositions() {
	console.log('\n🔒 Testing Close All Positions...');

	const result = await makeRequest('POST', '/hyperliquid/close-all-positions');

	results.push({
		test: 'Close All Positions',
		success: result.success,
		data: result.data,
		error: result.error,
		duration: result.duration,
	});

	if (result.success) {
		console.log('✅ All positions closed successfully');
		if (result.data.data?.length > 0) {
			result.data.data.forEach((item: any) => {
				console.log(
					`   ${item.coin}: ${item.result.success ? '✅' : '❌'}`,
				);
			});
		}
		console.log(`   Duration: ${result.duration}ms`);
	} else {
		console.log('❌ Failed to close all positions:', result.error);
	}

	return result;
}

async function testGetOpenOrders() {
	console.log('\n📋 Getting open orders...');

	const result = await makeRequest('GET', '/hyperliquid/orders/open');

	if (result.success && result.data.data) {
		console.log('✅ Open orders retrieved successfully');
		console.log(`   Total orders: ${result.data.data.length}`);
	} else {
		console.log('❌ Failed to get open orders:', result.error);
	}

	return result;
}

async function testSetLeverage(coin: string, leverage: number) {
	console.log(`\n⚙️  Testing Set Leverage for ${coin} to ${leverage}x...`);

	const result = await makeRequest('POST', '/hyperliquid/leverage', {
		coin,
		leverage,
		isCross: true,
	});

	results.push({
		test: `Set Leverage - ${coin} ${leverage}x`,
		success: result.success,
		data: result.data,
		error: result.error,
		duration: result.duration,
	});

	if (result.success) {
		console.log(`✅ Leverage set to ${leverage}x for ${coin}`);
	} else {
		console.log(`❌ Failed to set leverage:`, result.error);
	}

	return result;
}

async function testGetBalance() {
	console.log('\n💰 Getting account balance...');

	const result = await makeRequest('GET', '/hyperliquid/balance');

	if (result.success && result.data.data) {
		console.log('✅ Balance retrieved successfully');
		console.log(`   Account Value: $${result.data.data.marginSummary?.accountValue}`);
		console.log(`   Total PnL: $${result.data.data.marginSummary?.totalRawUsd}`);
	}

	return result;
}

// Main test runner
async function runTests() {
	console.log('🚀 Starting Hyperliquid Trading Tests');
	console.log('=====================================');
	console.log(`API Base URL: ${API_BASE_URL}`);
	console.log(`Using API Key: ${API_KEY.substring(0, 10)}...`);

	try {
		// 1. Check balance first
		await testGetBalance();
		await sleep(1000);

		// 2. Test leverage setting
		await testSetLeverage('BTC', 5);
		await sleep(1000);

		await testSetLeverage('ETH', 5);
		await sleep(1000);

		// 3. Test Quick Long
		const longResult = await testQuickLong();
		await sleep(2000); // Wait for orders to process

		// 4. Test Quick Short
		const shortResult = await testQuickShort();
		await sleep(2000);

		// 5. Check positions
		await testGetPositions();
		await sleep(1000);

		// 6. Check open orders (TP/SL orders should be visible)
		await testGetOpenOrders();
		await sleep(1000);

		// 7. Close individual positions
		if (longResult.success) {
			await testClosePosition('BTC');
			await sleep(2000);
		}

		if (shortResult.success) {
			await testClosePosition('ETH');
			await sleep(2000);
		}

		// 8. Verify positions are closed
		await testGetPositions();
		await sleep(1000);

		// Optional: Test close all positions (only if there are still open positions)
		// await testCloseAllPositions();

		// Print summary
		console.log('\n\n📊 Test Summary');
		console.log('=====================================');
		const passed = results.filter((r) => r.success).length;
		const failed = results.filter((r) => !r.success).length;
		console.log(`✅ Passed: ${passed}`);
		console.log(`❌ Failed: ${failed}`);
		console.log(`📈 Total: ${results.length}`);

		if (failed > 0) {
			console.log('\n❌ Failed tests:');
			results
				.filter((r) => !r.success)
				.forEach((r) => {
					console.log(`   - ${r.test}: ${r.error}`);
				});
		}

		console.log('\n✨ Tests completed!');
	} catch (error) {
		console.error('\n💥 Test execution error:', error);
	}
}

// Run tests
runTests().catch(console.error);
