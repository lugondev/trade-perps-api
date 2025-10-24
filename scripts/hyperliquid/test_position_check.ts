import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { HyperliquidModule } from '../../src/hyperliquid/hyperliquid.module';
import { TradingService } from '../../src/hyperliquid/services/trading.service';
import { BalanceService } from '../../src/hyperliquid/services/balance.service';

async function testPositionCheck() {
	console.log('🔍 Testing Position Check after Quick Long...\n');

	const app = await NestFactory.createApplicationContext(AppModule, {
		logger: ['error', 'warn', 'log'],
	});

	const tradingService = app.select(HyperliquidModule).get(TradingService, { strict: true });
	const balanceService = app.select(HyperliquidModule).get(BalanceService, { strict: true });

	try {
		// Step 1: Place Quick Long
		console.log('📈 Step 1: Placing Quick Long ETH...');
		const longResult = await tradingService.quickLong('ETH', 100, 10, 20, 2);

		console.log('Result:', JSON.stringify(longResult, null, 2));

		if (!longResult.success) {
			console.log('❌ Failed to place long');
			return;
		}

		// Step 2: Check all positions immediately
		console.log('\n📊 Step 2: Checking all positions immediately...');
		const positions1 = await balanceService.getPositions();
		console.log('Positions (immediate):', JSON.stringify(positions1, null, 2));

		// Step 3: Wait and check again
		console.log('\n⏳ Waiting 3 seconds...');
		await new Promise(resolve => setTimeout(resolve, 3000));

		console.log('\n📊 Step 3: Checking positions after 3s...');
		const positions2 = await balanceService.getPositions();
		console.log('Positions (after 3s):', JSON.stringify(positions2, null, 2));

		// Step 4: Check specific ETH position
		console.log('\n📊 Step 4: Checking ETH position specifically...');
		const ethPosition = await balanceService.getPosition('ETH');
		console.log('ETH Position:', JSON.stringify(ethPosition, null, 2));

		// Step 5: Wait longer and check
		console.log('\n⏳ Waiting another 5 seconds...');
		await new Promise(resolve => setTimeout(resolve, 5000));

		console.log('\n📊 Step 5: Final position check...');
		const positions3 = await balanceService.getPositions();
		console.log('Positions (after 8s total):', JSON.stringify(positions3, null, 2));

		// Try to close if position exists
		if (positions3.success && positions3.data && Array.isArray(positions3.data)) {
			const ethPos = positions3.data.find((p: any) => p.coin === 'ETH');
			if (ethPos && parseFloat(ethPos.szi) !== 0) {
				console.log('\n📉 Step 6: Closing position...');
				const closeResult = await tradingService.closePosition({ coin: 'ETH', slippage: 0.02 });
				console.log('Close Result:', JSON.stringify(closeResult, null, 2));
			} else {
				console.log('\n⚠️  No open ETH position found to close');
			}
		}

	} catch (error) {
		console.error('❌ Error:', error);
	} finally {
		await app.close();
	}
}

testPositionCheck().catch(console.error);
