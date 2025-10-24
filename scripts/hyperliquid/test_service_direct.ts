import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { TradingService } from '../../src/hyperliquid/services/trading.service';
import { HyperliquidApiService } from '../../src/hyperliquid/services/hyperliquid-api.service';

async function testService() {
	console.log('🚀 Testing Hyperliquid Service directly...\n');

	// Create NestJS application context
	const app = await NestFactory.createApplicationContext(AppModule);

	// Get services
	const tradingService = app.get(TradingService);
	const apiService = app.get(HyperliquidApiService);

	try {
		console.log('📊 Step 1: Loading asset map...');
		await apiService['loadAssetMap']();
		console.log('✅ Asset map loaded\n');

		console.log('📈 Step 2: Placing a test limit order (BTC)...');
		console.log('   Coin: BTC');
		console.log('   Side: BUY');
		console.log('   Size: 0.001');
		console.log('   Price: $70,000\n');

		const result = await tradingService.placeLimitOrder(
			'BTC',      // coin
			true,       // is_buy
			0.001,      // size
			70000,      // limit_px
			'Gtc',      // timeInForce
			false       // reduce_only
		);

		console.log('📥 Response:', JSON.stringify(result, null, 2));

		if (result.success) {
			console.log('\n✅ SUCCESS! Order placed successfully!');
			console.log('🎉 The action hash fix is working!');
		} else {
			console.log('\n❌ Order failed:', result.error);
		}

	} catch (error) {
		console.error('\n❌ Error:', error.message);
		if (error.response) {
			console.error('Response data:', error.response.data);
		}
	} finally {
		await app.close();
	}
}

// Run the test
testService().catch(console.error);
