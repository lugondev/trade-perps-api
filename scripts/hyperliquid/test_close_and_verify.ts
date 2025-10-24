/**
 * Test close position và verify TP/SL orders bị cancel
 */

async function testClosePosition() {
	const API_BASE = 'http://localhost:8080';

	try {
		console.log('🔍 Step 1: Check current position...\n');

		const positionResponse = await fetch(`${API_BASE}/hyperliquid/position/ETH`);
		const position = await positionResponse.json();
		console.log('Current Position:');
		console.log(JSON.stringify(position, null, 2));

		if (!position.success || !position.data) {
			console.log('\n⚠️ No ETH position found');
			return;
		}

		console.log('\n🚀 Step 2: Closing position...\n');

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

		// Wait for orders to cancel
		console.log('\n⏳ Waiting 2 seconds for orders to cancel...\n');
		await new Promise((resolve) => setTimeout(resolve, 2000));

		console.log('🔍 Step 3: Check remaining open orders...\n');

		const HYPERLIQUID_API = 'https://api.hyperliquid-testnet.xyz';
		const USER_ADDRESS = process.env.HYPERLIQUID_USER_ADDRESS || '';

		const ordersResponse = await fetch(`${HYPERLIQUID_API}/info`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				type: 'openOrders',
				user: USER_ADDRESS,
			}),
		});

		const orders = await ordersResponse.json();
		console.log('Remaining Open Orders:');
		console.log(JSON.stringify(orders, null, 2));

		if (Array.isArray(orders) && orders.length === 0) {
			console.log('\n✅ SUCCESS: All TP/SL orders canceled when position closed!');
		} else {
			console.log(`\n⚠️ Still have ${orders.length} open orders`);
		}
	} catch (error) {
		console.error('Error:', error);
	}
}

testClosePosition();
