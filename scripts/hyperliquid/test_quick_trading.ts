import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { HyperliquidModule } from '../../src/hyperliquid/hyperliquid.module';
import { TradingService } from '../../src/hyperliquid/services/trading.service';
import { MarketDataService } from '../../src/hyperliquid/services/market-data.service';

async function testQuickTrading() {
	console.log('🚀 Testing Quick Long/Short with TP/SL and Close Position...\n');

	const app = await NestFactory.createApplicationContext(AppModule, {
		logger: ['error', 'warn', 'log'],
	});

	const tradingService = app.select(HyperliquidModule).get(TradingService, { strict: true });
	const marketDataService = app.select(HyperliquidModule).get(MarketDataService, { strict: true });

	try {
		// Step 1: Get current BTC price
		console.log('📊 Step 1: Getting current BTC price...');
		const priceData = await marketDataService.getCurrentPrice('BTC');
		const currentPrice = priceData.data?.price || 0;
		console.log(`   Current BTC price: $${currentPrice.toLocaleString()}\n`);

		// Step 2: Quick Long with TP/SL
		console.log('📈 Step 2: Testing Quick Long with TP/SL...');
		console.log('   Coin: BTC');
		console.log('   USD Value: $50');
		console.log('   Leverage: 1x');
		console.log('   Stop Loss: 1%');
		console.log('   Take Profit: 2%');

		const longResult = await tradingService.quickLong(
			'BTC',      // coin
			50,         // usdValue
			1,          // stopLossPercent
			2,          // takeProfitPercent
			1,          // leverage
		);

		console.log('📥 Long Result:', JSON.stringify(longResult, null, 2));

		if (longResult.success) {
			console.log('✅ Quick Long successful!');
			console.log(`   Entry Order ID: ${longResult.data?.entry?.oid || 'N/A'}`);
			console.log(`   Take Profit Order ID: ${longResult.data?.takeProfit?.oid || 'N/A'}`);
			console.log(`   Stop Loss Order ID: ${longResult.data?.stopLoss?.oid || 'N/A'}\n`);
		} else {
			console.log('❌ Quick Long failed:', longResult.error, '\n');
		}

		// Wait a bit
		await new Promise(resolve => setTimeout(resolve, 2000));

		// Step 3: Close the long position
		console.log('📉 Step 3: Closing BTC position...');
		const closeResult = await tradingService.closePosition({
			coin: 'BTC',
			slippage: 0.01, // 1% slippage
		});

		console.log('📥 Close Result:', JSON.stringify(closeResult, null, 2));

		if (closeResult.success) {
			console.log('✅ Position closed successfully!\n');
		} else {
			console.log('❌ Close position failed:', closeResult.error, '\n');
		}

		// Wait a bit
		await new Promise(resolve => setTimeout(resolve, 2000));

		// Step 4: Quick Short with TP/SL
		console.log('📉 Step 4: Testing Quick Short with TP/SL...');
		console.log('   Coin: BTC');
		console.log('   USD Value: $50');
		console.log('   Leverage: 1x');
		console.log('   Stop Loss: 1%');
		console.log('   Take Profit: 2%');

		const shortResult = await tradingService.quickShort(
			'BTC',      // coin
			50,         // usdValue
			1,          // stopLossPercent
			2,          // takeProfitPercent
			1,          // leverage
		);

		console.log('📥 Short Result:', JSON.stringify(shortResult, null, 2));

		if (shortResult.success) {
			console.log('✅ Quick Short successful!');
			console.log(`   Entry Order ID: ${shortResult.data?.entry?.oid || 'N/A'}`);
			console.log(`   Take Profit Order ID: ${shortResult.data?.takeProfit?.oid || 'N/A'}`);
			console.log(`   Stop Loss Order ID: ${shortResult.data?.stopLoss?.oid || 'N/A'}\n`);
		} else {
			console.log('❌ Quick Short failed:', shortResult.error, '\n');
		}

		// Wait a bit
		await new Promise(resolve => setTimeout(resolve, 2000));

		// Step 5: Close the short position
		console.log('📈 Step 5: Closing BTC short position...');
		const closeShortResult = await tradingService.closePosition({
			coin: 'BTC',
			slippage: 0.01,
		});

		console.log('📥 Close Result:', JSON.stringify(closeShortResult, null, 2));

		if (closeShortResult.success) {
			console.log('✅ Short position closed successfully!\n');
		} else {
			console.log('❌ Close short position failed:', closeShortResult.error, '\n');
		}

		// Step 6: Test close all positions
		console.log('🔄 Step 6: Testing Close All Positions...');
		const closeAllResult = await tradingService.closeAllPositions({
			slippage: 0.01,
		});

		console.log('📥 Close All Result:', JSON.stringify(closeAllResult, null, 2));

		if (closeAllResult.success) {
			console.log('✅ All positions closed successfully!\n');
		} else {
			console.log('❌ Close all positions failed:', closeAllResult.error, '\n');
		}

		console.log('\n🎉 All tests completed!');

	} catch (error) {
		console.error('❌ Test failed:', error);
	} finally {
		await app.close();
	}
}

testQuickTrading().catch(console.error);
