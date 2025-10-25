// Hyperliquid API Types

export interface HyperliquidApiCredentials {
	walletAddress: string;
	privateKey: string;
	apiKey?: string;
	apiSecret?: string;
}

export interface HyperliquidApiResponse<T = any> {
	success: boolean;
	data?: T;
	error?: string;
	timestamp: number;
}

// Balance related types
export interface HyperliquidBalance {
	coin: string;
	hold: string;
	total: string;
	entryNtl: string;
	positionNtl: string;
}

export interface HyperliquidBalanceResponse {
	balances: HyperliquidBalance[];
	crossMaintenanceMarginUsed: string;
	withdrawable: string;
	totalNtlPos: string;
	totalRawUsd: string;
}

// Trading related types
export interface HyperliquidOrderRequest {
	coin: string; // Symbol without -PERP suffix (e.g., BTC, ETH)
	is_buy: boolean;
	sz: number; // Size/quantity
	limit_px: number; // Limit price
	order_type: {
		limit?: { tif: 'Gtc' | 'Ioc' | 'Alo' };
		trigger?: {
			isMarket: boolean;
			triggerPx: number;
			tpsl: 'tp' | 'sl';
		};
	};
	reduce_only?: boolean;
}

export interface HyperliquidOrder {
	coin: string;
	side: 'A' | 'B'; // A = Ask (sell), B = Bid (buy)
	limitPx: string;
	sz: string;
	oid: number;
	timestamp: number;
	origSz: string;
}

export interface HyperliquidPosition {
	coin: string;
	szi: string; // Size (negative for short)
	entryPx: string;
	positionValue: string;
	unrealizedPnl: string;
	returnOnEquity: string;
	leverage: {
		type: 'cross' | 'isolated';
		value: number;
	};
	liquidationPx: string | null;
	marginUsed: string;
}

export interface HyperliquidTrade {
	coin: string;
	side: 'A' | 'B';
	px: string; // Price
	sz: string; // Size
	time: number;
	hash: string;
	tid: number; // Trade ID
	fee: string;
	feeToken: string;
	closedPnl?: string;
}

// Market data types
export interface HyperliquidAssetInfo {
	name: string;
	szDecimals: number;
	maxLeverage: number;
	onlyIsolated: boolean;
}

export interface HyperliquidMeta {
	universe: HyperliquidAssetInfo[];
}

export interface HyperliquidL2Book {
	coin: string;
	time: number;
	levels: [
		[string, string][], // Bids: [price, size]
		[string, string][]  // Asks: [price, size]
	];
}

export interface HyperliquidCandle {
	t: number; // Timestamp
	T: number; // Close time
	o: string; // Open
	h: string; // High
	l: string; // Low
	c: string; // Close
	v: string; // Volume
	n: number; // Number of trades
}

// Account information types
export interface HyperliquidAccountInfo {
	assetPositions: HyperliquidPosition[];
	crossMarginSummary: {
		accountValue: string;
		totalNtlPos: string;
		totalRawUsd: string;
		withdrawable: string;
	};
	marginSummary: {
		accountValue: string;
		totalMarginUsed: string;
		totalNtlPos: string;
		totalRawUsd: string;
	};
}

// WebSocket related types
export interface HyperliquidWebSocketMessage {
	channel: string;
	data: any;
}

export interface HyperliquidSubscription {
	method: 'subscribe';
	subscription: {
		type: 'trades' | 'l2Book' | 'userEvents' | 'allMids';
		coin?: string;
		user?: string;
	};
}

// Close position types
export interface ClosePositionRequest {
	coin: string;
	size?: number; // Optional: partial close, if not provided closes entire position
	slippage?: number; // Slippage tolerance in percentage (default: 1%)
}

export interface CloseAllPositionRequest {
	slippage?: number; // Slippage tolerance in percentage (default: 1%)
}
