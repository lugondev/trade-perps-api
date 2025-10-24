/**
 * Direct API test for TP/SL orders
 */

async function testTPSL() {
	const API_BASE = 'http://localhost:8080';

	try {
		console.log('🚀 Testing Quick Long with TP/SL...\n');

		// Quick Long ETH $100
		const response = await fetch(`${API_BASE}/hyperliquid/quick-long`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				coin: 'ETH',
				usdValue: 100,
				stopLossPercent: 5,
				takeProfitPercent: 10,
				leverage: 5,
			}),
		});

		const result = await response.json();
		console.log('Quick Long Response:');
		console.log(JSON.stringify(result, null, 2));

		if (!result.success) {
			console.error('\n❌ Quick Long failed');
			return;
		}

		// Check open orders
		console.log('\n🔍 Checking open orders...');
		const ordersResponse = await fetch(`${API_BASE}/hyperliquid/orders/open`);
		const orders = await ordersResponse.json();
		console.log('\nOpen Orders:');
		console.log(JSON.stringify(orders, null, 2));

		// Count TP/SL orders
		const tpslOrders = orders.data?.filter((o: any) =>
			o.orderType === 'Stop Market' || o.orderType === 'Take Profit Market'
		);
		console.log(`\n📊 Found ${tpslOrders?.length || 0} TP/SL orders`);

		if (tpslOrders && tpslOrders.length > 0) {
			console.log('\n✅ TP/SL orders visible!');
		} else {
			console.log('\n❌ TP/SL orders NOT visible');
		}
	} catch (error) {
		console.error('Error:', error);
	}
}

testTPSL();
