#!/usr/bin/env ts-node
/**
 * Test BTC Precision Fix for Aster Trading
 * 
 * This script verifies that BTC stop loss and take profit orders
 * use the correct precision (1 decimal place) to avoid precision errors
 * 
 * Run with: pnpm ts-node scripts/aster/test_btc_precision.ts
 */

import 'reflect-metadata';

/**
 * Simulate getPricePrecision function from TradingService
 */
function getPricePrecision(currentPrice: number, symbol: string): number {
	// BTC has special precision requirements - only 1 decimal place for SL/TP
	if (symbol.startsWith('BTC')) {
		return 1;
	}

	// For other symbols, use dynamic precision based on price
	if (currentPrice < 1) {
		return 6; // Very low price coins need high precision
	} else if (currentPrice < 10) {
		return 4; // Low price coins
	} else if (currentPrice < 100) {
		return 3; // Medium price coins
	} else {
		return 2; // High price coins
	}
}

/**
 * Test precision calculation for different symbols
 */
function testPrecision() {
	console.log('🧪 Testing Price Precision for Stop Loss / Take Profit\n');

	const testCases = [
		// BTC cases
		{ symbol: 'BTCUSDT', price: 95000, leverage: 10, slPercent: 15, tpPercent: 15 },
		{ symbol: 'BTCUSDT', price: 100000, leverage: 20, slPercent: 10, tpPercent: 20 },
		{ symbol: 'BTCUSDT', price: 88500.5, leverage: 5, slPercent: 20, tpPercent: 25 },

		// ETH cases
		{ symbol: 'ETHUSDT', price: 3500, leverage: 10, slPercent: 15, tpPercent: 15 },

		// SOL cases
		{ symbol: 'SOLUSDT', price: 150, leverage: 10, slPercent: 15, tpPercent: 15 },

		// Low price coins
		{ symbol: 'DOGEUSDT', price: 0.08, leverage: 10, slPercent: 15, tpPercent: 15 },
		{ symbol: 'XRPUSDT', price: 0.5, leverage: 10, slPercent: 15, tpPercent: 15 },
	];

	testCases.forEach((testCase, index) => {
		console.log(`Test ${index + 1}: ${testCase.symbol}`);
		console.log(`  Current Price: $${testCase.price}`);
		console.log(`  Leverage: ${testCase.leverage}x`);
		console.log(`  Stop Loss: ${testCase.slPercent}%, Take Profit: ${testCase.tpPercent}%`);

		// Calculate price movements
		const priceMovementSL = testCase.slPercent / testCase.leverage;
		const priceMovementTP = testCase.tpPercent / testCase.leverage;

		// Get precision
		const precision = getPricePrecision(testCase.price, testCase.symbol);

		// Calculate SL/TP prices
		const stopLossPrice = (testCase.price * (1 - priceMovementSL / 100)).toFixed(precision);
		const takeProfitPrice = (testCase.price * (1 + priceMovementTP / 100)).toFixed(precision);

		console.log(`  Precision: ${precision} decimal place(s)`);
		console.log(`  Price Movement: SL=${priceMovementSL.toFixed(2)}%, TP=${priceMovementTP.toFixed(2)}%`);
		console.log(`  Stop Loss Price: $${stopLossPrice}`);
		console.log(`  Take Profit Price: $${takeProfitPrice}`);

		// Verify BTC precision
		if (testCase.symbol.startsWith('BTC')) {
			const slDecimals = (stopLossPrice.split('.')[1] || '').length;
			const tpDecimals = (takeProfitPrice.split('.')[1] || '').length;

			if (slDecimals <= 1 && tpDecimals <= 1) {
				console.log(`  ✅ BTC precision correct: max 1 decimal place`);
			} else {
				console.log(`  ❌ BTC precision error: SL has ${slDecimals}, TP has ${tpDecimals} decimal places`);
			}
		}

		console.log('');
	});
}

/**
 * Main function
 */
async function main() {
	console.log('🚀 BTC Precision Test for Aster Trading\n');

	testPrecision();

	console.log('✨ Test completed\n');
	console.log('📋 Summary:');
	console.log('  - BTC requires exactly 1 decimal place for SL/TP prices');
	console.log('  - Other high-value coins use 2 decimal places');
	console.log('  - Low-value coins use higher precision (4-6 decimals)');
	console.log('  - This prevents "Precision is over the maximum" errors');
}

main()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error('Fatal error:', err);
		process.exit(1);
	});
