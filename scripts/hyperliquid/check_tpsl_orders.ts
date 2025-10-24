import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { HyperliquidModule } from '../../src/hyperliquid/hyperliquid.module';
import { TradingService } from '../../src/hyperliquid/services/trading.service';
import { HyperliquidApiService } from '../../src/hyperliquid/services/hyperliquid-api.service';

async function checkTPSL() {
	console.log('🔍 Checking TP/SL Orders...\n');

	const app = await NestFactory.createApplicationContext(AppModule, {
		logger: ['error', 'warn', 'log'],
	});

	const tradingService = app.select(HyperliquidModule).get(TradingService, { strict: true });
	const apiService = app.select(HyperliquidModule).get(HyperliquidApiService, { strict: true });

	try {
		// Step 1: Place Quick Long with TP/SL
		console.log('📈 Step 1: Placing Quick Long ETH with TP/SL...');
		const longResult = await tradingService.quickLong('ETH', 100, 10, 20, 2);

		console.log('Quick Long Result:');
		console.log(JSON.stringify(longResult, null, 2));

		// Step 2: Check open orders immediately
		console.log('\n📋 Step 2: Checking all open orders...');
		const ordersResponse = await (apiService as any).post('/info', {
			type: 'openOrders',
			user: (apiService as any).hyperliquidConfig.userAddress,
		});

		console.log('Open Orders:');
		console.log(JSON.stringify(ordersResponse, null, 2));

		// Step 3: Wait and check again
		console.log('\n⏳ Waiting 3 seconds...');
		await new Promise(resolve => setTimeout(resolve, 3000));

		console.log('\n📋 Step 3: Checking orders after 3s...');
		const ordersResponse2 = await (apiService as any).post('/info', {
			type: 'openOrders',
			user: (apiService as any).hyperliquidConfig.userAddress,
		});

		console.log('Open Orders (after 3s):');
		console.log(JSON.stringify(ordersResponse2, null, 2));

		// Step 4: Close position
		console.log('\n📉 Step 4: Closing position...');
		await new Promise(resolve => setTimeout(resolve, 2000));
		const closeResult = await tradingService.closePosition({ coin: 'ETH', slippage: 0.02 });
		console.log('Close Result:', JSON.stringify(closeResult, null, 2));

	} catch (error) {
		console.error('❌ Error:', error);
	} finally {
		await app.close();
	}
}

checkTPSL().catch(console.error);
