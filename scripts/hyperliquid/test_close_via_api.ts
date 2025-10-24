/**
 * Test close position qua NestJS API
 */

async function testClosePosition() {
	const API_BASE = 'http://localhost:8080';
	const HYPERLIQUID_API = 'https://api.hyperliquid-testnet.xyz';
	const USER_ADDRESS = process.env.HYPERLIQUID_USER_ADDRESS;

	if (!USER_ADDRESS) {
		console.error('❌ Missing USER_ADDRESS');
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

		console.log('\n🚀 Step 2: Closing position via API...\n');

		// Call NestJS close position API
		const closeResponse = await fetch(`${API_BASE}/hyperliquid/close-position`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				coin: 'ETH',
			}),
		});

		const closeResult = await closeResponse.json();
		console.log('Close Position Response:');
		console.log(JSON.stringify(closeResult, null, 2));

		if (!closeResult.success) {
			console.error('\n❌ Failed to close position');
			return;
		}

		console.log('\n✅ Position close order placed');

		// Wait for execution
		console.log('\n⏳ Waiting 3 seconds for order execution...\n');
		await new Promise((resolve) => setTimeout(resolve, 3000));

		console.log('📊 Step 3: Verify position closed and orders canceled\n');

		// Check position after
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

		// Check open orders after
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

		// Summary
		console.log('\n' + '='.repeat(60));
		console.log('📋 TEST SUMMARY:');
		console.log('='.repeat(60));
		console.log(`✅ Initial position: ${position.szi} ETH @ $${position.entryPx}`);
		console.log(`✅ TP/SL orders before: ${ordersBefore.length}`);
		console.log(`✅ Close order: ${closeResult.data?.statuses?.[0]?.filled ? 'FILLED' : 'PENDING'}`);
		console.log(`✅ Position after: ${ethPositionAfter ? ethPositionAfter.position.szi : '0 (closed)'}`);
		console.log(`✅ TP/SL orders after: ${ordersAfter.length}`);
		console.log('='.repeat(60));
	} catch (error) {
		console.error('Error:', error);
	}
}

testClosePosition();
