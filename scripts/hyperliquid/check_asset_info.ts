import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { HyperliquidModule } from '../../src/hyperliquid/hyperliquid.module';
import { HyperliquidApiService } from '../../src/hyperliquid/services/hyperliquid-api.service';

async function checkAssetInfo() {
	console.log('📊 Checking Asset Info from Hyperliquid...\n');

	const app = await NestFactory.createApplicationContext(AppModule, {
		logger: ['error', 'warn'],
	});

	const apiService = app.select(HyperliquidModule).get(HyperliquidApiService, { strict: true });

	try {
		const metaResponse = await (apiService as any).getMeta();

		if (!metaResponse.success || !metaResponse.data?.universe) {
			console.error('Failed to get meta data');
			return;
		}

		const assets = ['BTC', 'ETH', 'SOL'];

		for (const coin of assets) {
			const assetInfo = metaResponse.data.universe.find((u: any) => u.name === coin);
			if (assetInfo) {
				console.log(`\n${coin}:`);
				console.log(`  Name: ${assetInfo.name}`);
				console.log(`  Size Decimals: ${assetInfo.szDecimals}`);
				console.log(`  Max Leverage: ${assetInfo.maxLeverage}`);
				console.log(`  Only Isolated: ${assetInfo.onlyIsolated}`);

				// Calculate minimum size based on szDecimals
				const minSize = Math.pow(10, -assetInfo.szDecimals);
				console.log(`  Min Size (calculated): ${minSize}`);
				console.log(`  Min Size Step: 1e-${assetInfo.szDecimals}`);
			}
		}

	} catch (error) {
		console.error('❌ Error:', error);
	} finally {
		await app.close();
	}
}

checkAssetInfo().catch(console.error);
