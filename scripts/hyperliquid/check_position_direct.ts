/**
 * Check position trực tiếp từ Hyperliquid API
 */

async function checkPosition() {
	const HYPERLIQUID_API = 'https://api.hyperliquid-testnet.xyz';
	const USER_ADDRESS = process.env.HYPERLIQUID_USER_ADDRESS;

	if (!USER_ADDRESS) {
		console.error('❌ HYPERLIQUID_USER_ADDRESS not found');
		return;
	}

	try {
		console.log(`🔍 Checking position for: ${USER_ADDRESS}\n`);

		const response = await fetch(`${HYPERLIQUID_API}/info`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				type: 'clearinghouseState',
				user: USER_ADDRESS,
			}),
		});

		const state = await response.json();

		if (state.assetPositions && state.assetPositions.length > 0) {
			console.log('📊 Active Positions:\n');
			state.assetPositions.forEach((pos: any) => {
				const position = pos.position;
				console.log(`Coin: ${position.coin}`);
				console.log(`Size: ${position.szi}`);
				console.log(`Entry Price: ${position.entryPx}`);
				console.log(`Position Value: ${position.positionValue}`);
				console.log(`Unrealized PNL: ${position.unrealizedPnl}`);
				console.log(`Liquidation Price: ${position.liquidationPx || 'N/A'}`);
				console.log(`Leverage: ${position.leverage?.value || 'N/A'}`);
				console.log('---');
			});
		} else {
			console.log('⚠️ No active positions');
		}

		// Check open orders
		const ordersResponse = await fetch(`${HYPERLIQUID_API}/info`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				type: 'openOrders',
				user: USER_ADDRESS,
			}),
		});

		const orders = await ordersResponse.json();
		console.log(`\n📝 Open Orders: ${orders.length}`);
		if (orders.length > 0) {
			orders.forEach((order: any, idx: number) => {
				console.log(`\n${idx + 1}. ${order.coin} ${order.side === 'A' ? 'SELL' : 'BUY'} ${order.sz} @ $${order.limitPx}`);
				console.log(`   Order ID: ${order.oid}`);
				console.log(`   Reduce Only: ${order.reduceOnly}`);
			});
		}
	} catch (error) {
		console.error('Error:', error);
	}
}

checkPosition();
