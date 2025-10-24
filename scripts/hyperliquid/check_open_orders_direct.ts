/**
 * Direct Hyperliquid API test - bypass NestJS to check open orders
 */

async function checkOpenOrders() {
	const HYPERLIQUID_API = 'https://api.hyperliquid-testnet.xyz';
	const USER_ADDRESS = process.env.HYPERLIQUID_USER_ADDRESS;

	if (!USER_ADDRESS) {
		console.error('❌ HYPERLIQUID_USER_ADDRESS not found in .env');
		return;
	}

	try {
		console.log(`🔍 Querying open orders for: ${USER_ADDRESS}\n`);

		const response = await fetch(`${HYPERLIQUID_API}/info`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				type: 'openOrders',
				user: USER_ADDRESS,
			}),
		});

		const orders = await response.json();

		console.log('Open Orders:');
		console.log(JSON.stringify(orders, null, 2));

		if (Array.isArray(orders) && orders.length > 0) {
			console.log(`\n✅ Found ${orders.length} open orders:`);
			orders.forEach((order: any, idx: number) => {
				console.log(`\n${idx + 1}. Order ID: ${order.oid}`);
				console.log(`   Coin: ${order.coin}`);
				console.log(`   Side: ${order.side}`);
				console.log(`   Size: ${order.sz}`);
				console.log(`   Price: ${order.limitPx}`);
				console.log(`   Order Type: ${order.orderType}`);
				console.log(`   Reduce Only: ${order.reduceOnly}`);
			});

			// Count TP/SL
			const tpslOrders = orders.filter((o: any) =>
				o.orderType === 'Stop Market' || o.orderType === 'Take Profit Market' || o.triggerPx
			);
			console.log(`\n📊 TP/SL Orders: ${tpslOrders.length}`);
		} else {
			console.log('\n⚠️ No open orders found');
		}
	} catch (error) {
		console.error('Error:', error);
	}
}

checkOpenOrders();
