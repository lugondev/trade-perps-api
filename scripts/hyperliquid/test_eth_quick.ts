import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { HyperliquidModule } from '../../src/hyperliquid/hyperliquid.module';
import { TradingService } from '../../src/hyperliquid/services/trading.service';
import { MarketDataService } from '../../src/hyperliquid/services/market-data.service';

async function testETHQuickTrading() {
	console.log('🚀 Testing ETH Quick Long/Short with TP/SL and Close Position...\n');

	const app = await NestFactory.createApplicationContext(AppModule, {
		logger: ['error', 'warn', 'log'],
	});

	const tradingService = app.select(HyperliquidModule).get(TradingService, { strict: true });
	const marketDataService = app.select(HyperliquidModule).get(MarketDataService, { strict: true });

	try {
		// Step 1: Get current ETH price
		console.log('📊 Step 1: Getting current ETH price...');
		const priceData = await marketDataService.getCurrentPrice('ETH');
		const currentPrice = priceData.data?.price || 0;
		console.log(`   Current ETH price: $${currentPrice.toLocaleString()}\n`);

		// Step 2: Quick Long ETH with TP/SL
		console.log('📈 Step 2: Testing Quick Long ETH with TP/SL...');
		console.log('   Coin: ETH');
		console.log('   USD Value: $100');
		console.log('   Leverage: 2x');
		console.log('   Stop Loss: 5% (wider to keep position open)');
		console.log('   Take Profit: 10% (wider to keep position open)');

		const longResult = await tradingService.quickLong(
			'ETH',      // coin
			100,        // usdValue
			5,          // stopLossPercent (increased from 2%)
			10,         // takeProfitPercent (increased from 5%)
			2,          // leverage
		);

		console.log('📥 Long Result:', JSON.stringify(longResult, null, 2));

		if (longResult.success) {
			console.log('✅ Quick Long successful!');
			const entryData = longResult.data?.entryOrder?.response?.data?.statuses?.[0];
			if (entryData && 'resting' in entryData) {
				console.log(`   Entry Order ID: ${entryData.resting.oid}`);
			} else if (entryData && 'filled' in entryData) {
				console.log(`   Entry Order: FILLED`);
			} else if (entryData && 'error' in entryData) {
				console.log(`   Entry Order ERROR: ${entryData.error}`);
			}
			console.log(`   Position Size: ${longResult.data?.size} ETH`);
			console.log(`   Entry Price: $${longResult.data?.currentPrice}`);
			console.log(`   Stop Loss Price: $${longResult.data?.stopLossPrice}`);
			console.log(`   Take Profit Price: $${longResult.data?.takeProfitPrice}\n`);
		} else {
			console.log('❌ Quick Long failed:', longResult.error, '\n');
		}

		// Wait for orders to process and check position
		console.log('⏳ Waiting 5 seconds for position to be established...');
		await new Promise(resolve => setTimeout(resolve, 5000));

		// Step 3: Close the long position
		console.log('📉 Step 3: Closing ETH position...');
		const closeResult = await tradingService.closePosition({
			coin: 'ETH',
			slippage: 0.02, // 2% slippage
		});

		console.log('📥 Close Result:', JSON.stringify(closeResult, null, 2));

		if (closeResult.success) {
			console.log('✅ Position closed successfully!\n');
		} else {
			console.log('❌ Close position failed:', closeResult.error, '\n');
		}

		// Wait a bit
		await new Promise(resolve => setTimeout(resolve, 3000));

		// Step 4: Quick Short ETH with TP/SL
		console.log('📉 Step 4: Testing Quick Short ETH with TP/SL...');
		console.log('   Coin: ETH');
		console.log('   USD Value: $100');
		console.log('   Leverage: 2x');
		console.log('   Stop Loss: 5% (wider to keep position open)');
		console.log('   Take Profit: 10% (wider to keep position open)');

		const shortResult = await tradingService.quickShort(
			'ETH',      // coin
			100,        // usdValue
			5,          // stopLossPercent (increased from 2%)
			10,         // takeProfitPercent (increased from 5%)
			2,          // leverage
		);

		console.log('📥 Short Result:', JSON.stringify(shortResult, null, 2));

		if (shortResult.success) {
			console.log('✅ Quick Short successful!');
			const entryData = shortResult.data?.entryOrder?.response?.data?.statuses?.[0];
			if (entryData && 'resting' in entryData) {
				console.log(`   Entry Order ID: ${entryData.resting.oid}`);
			} else if (entryData && 'filled' in entryData) {
				console.log(`   Entry Order: FILLED`);
			} else if (entryData && 'error' in entryData) {
				console.log(`   Entry Order ERROR: ${entryData.error}`);
			}
			console.log(`   Position Size: ${shortResult.data?.size} ETH`);
			console.log(`   Entry Price: $${shortResult.data?.currentPrice}`);
			console.log(`   Stop Loss Price: $${shortResult.data?.stopLossPrice}`);
			console.log(`   Take Profit Price: $${shortResult.data?.takeProfitPrice}\n`);
		} else {
			console.log('❌ Quick Short failed:', shortResult.error, '\n');
		}

		// Wait for orders to process
		console.log('⏳ Waiting 5 seconds for position to be established...');
		await new Promise(resolve => setTimeout(resolve, 5000));

		// Step 5: Close the short position
		console.log('📈 Step 5: Closing ETH short position...');
		const closeShortResult = await tradingService.closePosition({
			coin: 'ETH',
			slippage: 0.02,
		});

		console.log('📥 Close Result:', JSON.stringify(closeShortResult, null, 2));

		if (closeShortResult.success) {
			console.log('✅ Short position closed successfully!\n');
		} else {
			console.log('❌ Close short position failed:', closeShortResult.error, '\n');
		}

		console.log('\n🎉 All ETH tests completed!');

	} catch (error) {
		console.error('❌ Test failed:', error);
	} finally {
		await app.close();
	}
}

testETHQuickTrading().catch(console.error);
