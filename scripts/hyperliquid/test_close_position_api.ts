/**
 * Test close position API và verify TP/SL orders canceled
 */

import { SigningService } from '../../src/hyperliquid/services/signing.service';
import { ConfigService } from '@nestjs/config';

async function testClosePosition() {
	const HYPERLIQUID_API = 'https://api.hyperliquid-testnet.xyz';
	const USER_ADDRESS = process.env.HYPERLIQUID_USER_ADDRESS;
	const API_PRIVATE_KEY = process.env.HYPERLIQUID_API_PRIVATE_KEY;

	if (!USER_ADDRESS || !API_PRIVATE_KEY) {
		console.error('❌ Missing credentials in .env');
		return;
	}

	try {
		console.log('📊 Step 1: Check current position\n');

		let response = await fetch(`${HYPERLIQUID_API}/info`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				type: 'clearinghouseState',
				user: USER_ADDRESS,
			}),
		});

		const state = await response.json();
		const ethPosition = state.assetPositions?.find((p: any) => p.position.coin === 'ETH');

		if (!ethPosition) {
			console.log('⚠️ No ETH position found');
			return;
		}

		const position = ethPosition.position;
		console.log('Current ETH Position:');
		console.log(`  Size: ${position.szi}`);
		console.log(`  Entry: $${position.entryPx}`);
		console.log(`  Value: $${position.positionValue}`);
		console.log(`  PNL: $${position.unrealizedPnl}`);

		// Check open orders before close
		response = await fetch(`${HYPERLIQUID_API}/info`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				type: 'openOrders',
				user: USER_ADDRESS,
			}),
		});

		const ordersBefore = await response.json();
		console.log(`\n📝 Open Orders Before: ${ordersBefore.length}`);
		ordersBefore.forEach((o: any) => {
			console.log(`  - ${o.coin} ${o.side === 'A' ? 'SELL' : 'BUY'} ${o.sz} @ $${o.limitPx} (OID: ${o.oid})`);
		});

		console.log('\n🚀 Step 2: Closing position...\n');

		// Get current price for market order
		response = await fetch(`${HYPERLIQUID_API}/info`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				type: 'allMids',
			}),
		});

		const allMids = await response.json();
		const ethPrice = parseFloat(allMids.ETH);
		console.log(`Current ETH Price: $${ethPrice}`);

		// Close position with market order
		const positionSize = Math.abs(parseFloat(position.szi));
		const isBuy = parseFloat(position.szi) < 0; // If short, buy to close
		const slippage = 0.01;
		const limitPrice = isBuy
			? ethPrice * (1 + slippage)
			: ethPrice * (1 - slippage);

		// Format with proper decimals (ETH = 4 decimals)
		const formattedSize = positionSize.toFixed(4).replace(/\.?0+$/, '');
		const formattedPrice = (Math.round(limitPrice * 10) / 10).toString();

		console.log(`Closing: ${isBuy ? 'BUY' : 'SELL'} ${formattedSize} @ $${formattedPrice}\n`);

		// Create signing service
		const configService = {
			get: (key: string) => {
				const config: Record<string, any> = {
					'hyperliquid.userAddress': USER_ADDRESS,
					'hyperliquid.apiWallet': process.env.HYPERLIQUID_API_WALLET,
					'hyperliquid.apiPrivateKey': API_PRIVATE_KEY,
					'hyperliquid.isTestnet': true,
				};
				return config[key];
			},
		} as ConfigService;

		const signingService = new SigningService(configService);

		// Build order action
		const action = {
			type: 'order',
			orders: [
				{
					a: 0, // ETH asset ID
					b: isBuy,
					p: formattedPrice,
					s: formattedSize,
					r: true, // reduce only
					t: { limit: { tif: 'Ioc' } },
				},
			],
			grouping: 'na' as const,
		};

		const timestamp = Date.now();
		const signature = await signingService.signL1Action(action, null, timestamp);

		// Send order
		response = await fetch(`${HYPERLIQUID_API}/exchange`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				action,
				nonce: timestamp,
				signature,
				vaultAddress: null,
			}),
		});

		const result = await response.json();
		console.log('Close Order Response:');
		console.log(JSON.stringify(result, null, 2));

		if (result.status === 'ok') {
			console.log('\n✅ Position close order placed');

			// Wait for execution
			console.log('\n⏳ Waiting 3 seconds for order execution...\n');
			await new Promise((resolve) => setTimeout(resolve, 3000));

			console.log('📊 Step 3: Verify position closed\n');

			// Check position
			response = await fetch(`${HYPERLIQUID_API}/info`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: 'clearinghouseState',
					user: USER_ADDRESS,
				}),
			});

			const stateAfter = await response.json();
			const ethPositionAfter = stateAfter.assetPositions?.find((p: any) => p.position.coin === 'ETH');

			if (!ethPositionAfter || parseFloat(ethPositionAfter.position.szi) === 0) {
				console.log('✅ Position successfully closed');
			} else {
				console.log(`⚠️ Position still open: ${ethPositionAfter.position.szi}`);
			}

			// Check open orders after close
			response = await fetch(`${HYPERLIQUID_API}/info`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: 'openOrders',
					user: USER_ADDRESS,
				}),
			});

			const ordersAfter = await response.json();
			console.log(`\n📝 Open Orders After: ${ordersAfter.length}`);

			if (ordersAfter.length === 0) {
				console.log('\n🎉 SUCCESS! All TP/SL orders automatically canceled when position closed!');
			} else {
				console.log('\n⚠️ Some orders still open:');
				ordersAfter.forEach((o: any) => {
					console.log(`  - ${o.coin} ${o.side === 'A' ? 'SELL' : 'BUY'} ${o.sz} @ $${o.limitPx} (OID: ${o.oid})`);
				});
			}
		} else {
			console.error('\n❌ Failed to close position:', result);
		}
	} catch (error) {
		console.error('Error:', error);
	}
}

testClosePosition();
