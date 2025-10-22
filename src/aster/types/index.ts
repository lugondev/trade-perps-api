// Aster DEX API Types

export interface AsterApiCredentials {
	apiKey: string;
	apiSecret: string;
	user?: string; // Main account wallet address
	signer?: string; // API wallet address
	privateKey?: string; // Private key for signing
}

export interface AsterSignatureParams {
	user: string;
	signer: string;
	nonce: number;
	signature: string;
	originalParams?: {
		timestamp: number;
		recvWindow: number;
	};
}

export interface AsterApiResponse<T = any> {
	success: boolean;
	data?: T;
	error?: string;
	timestamp: number;
}

// Balance related types
export interface Balance {
	asset: string;
	free: string;
	locked: string;
	total: string;
}

export interface BalanceResponse {
	balances: Balance[];
}

// Trading related types
export interface OrderRequest {
	symbol: string;
	side: 'BUY' | 'SELL';
	type: 'LIMIT' | 'MARKET' | 'STOP' | 'STOP_MARKET' | 'TAKE_PROFIT' | 'TAKE_PROFIT_MARKET' | 'TRAILING_STOP_MARKET';
	positionSide?: 'BOTH' | 'LONG' | 'SHORT';
	timeInForce?: 'GTC' | 'IOC' | 'FOK' | 'GTX';
	quantity?: string;
	reduceOnly?: string;
	price?: string;
	newClientOrderId?: string;
	stopPrice?: string;
	closePosition?: string;
	activationPrice?: string;
	callbackRate?: string;
	workingType?: 'MARK_PRICE' | 'CONTRACT_PRICE';
	priceProtect?: string;
	newOrderRespType?: 'ACK' | 'RESULT';
	recvWindow?: number;
	timestamp?: number;
}

export interface Order {
	clientOrderId: string;
	cumQty: string;
	cumQuote: string;
	executedQty: string;
	orderId: number;
	avgPrice: string;
	origQty: string;
	price: string;
	reduceOnly: boolean;
	side: 'BUY' | 'SELL';
	positionSide: 'BOTH' | 'LONG' | 'SHORT';
	status: 'NEW' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED' | 'REJECTED' | 'EXPIRED';
	stopPrice?: string;
	closePosition: boolean;
	symbol: string;
	timeInForce: 'GTC' | 'IOC' | 'FOK' | 'GTX';
	type: string;
	origType: string;
	activatePrice?: string;
	priceRate?: string;
	updateTime: number;
	workingType: 'MARK_PRICE' | 'CONTRACT_PRICE';
	priceProtect: boolean;
	time?: number;
}

export interface Trade {
	buyer: boolean;
	commission: string;
	commissionAsset: string;
	id: number;
	maker: boolean;
	orderId: number;
	price: string;
	qty: string;
	quoteQty: string;
	realizedPnl: string;
	side: 'BUY' | 'SELL';
	positionSide: 'BOTH' | 'LONG' | 'SHORT';
	symbol: string;
	time: number;
	// Keep old properties for backward compatibility
	quantity?: string;
	fee?: string;
	feeAsset?: string;
	timestamp?: number;
}

// History related types
export interface TradeHistory {
	trades: Trade[];
	total: number;
	page: number;
	limit: number;
}

export interface OrderHistory {
	orders: Order[];
	total: number;
	page: number;
	limit: number;
}

// WebSocket related types
export interface WebSocketMessage {
	event: string;
	data: any;
	timestamp: number;
}

export interface TickerData {
	symbol: string;
	price: string;
	priceChange: string;
	priceChangePercent: string;
	high: string;
	low: string;
	volume: string;
	timestamp: number;
}

export interface OrderBookData {
	symbol: string;
	bids: [string, string][];
	asks: [string, string][];
	timestamp: number;
}

// Market data types
export interface Symbol {
	symbol: string;
	baseAsset: string;
	quoteAsset: string;
	status: 'TRADING' | 'HALTED' | 'BREAK';
	minPrice: string;
	maxPrice: string;
	tickSize: string;
	minQty: string;
	maxQty: string;
	stepSize: string;
}

// Account information types
export interface AccountInformation {
	feeTier: number;
	canTrade: boolean;
	canDeposit: boolean;
	canWithdraw: boolean;
	updateTime: number;
	totalInitialMargin: string;
	totalMaintMargin: string;
	totalWalletBalance: string;
	totalUnrealizedProfit: string;
	totalMarginBalance: string;
	totalPositionInitialMargin: string;
	totalOpenOrderInitialMargin: string;
	totalCrossWalletBalance: string;
	totalCrossUnPnl: string;
	availableBalance: string;
	maxWithdrawAmount: string;
	assets: AccountAsset[];
	positions: AccountPosition[];
}

export interface AccountAsset {
	asset: string;
	walletBalance: string;
	unrealizedProfit: string;
	marginBalance: string;
	maintMargin: string;
	initialMargin: string;
	positionInitialMargin: string;
	openOrderInitialMargin: string;
	crossWalletBalance: string;
	crossUnPnl: string;
	availableBalance: string;
	maxWithdrawAmount: string;
	marginAvailable: boolean;
	updateTime: number;
}

export interface AccountPosition {
	symbol: string;
	initialMargin: string;
	maintMargin: string;
	unrealizedProfit: string;
	positionInitialMargin: string;
	openOrderInitialMargin: string;
	leverage: string;
	isolated: boolean;
	entryPrice: string;
	maxNotional: string;
	positionSide: 'BOTH' | 'LONG' | 'SHORT';
	positionAmt: string;
	notional: string;
	isolatedWallet: string;
	updateTime: number;
	bidNotional: string;
	askNotional: string;
}

export interface PositionRisk {
	entryPrice: string;
	marginType: 'isolated' | 'cross';
	isAutoAddMargin: string;
	isolatedMargin: string;
	leverage: string;
	liquidationPrice: string;
	markPrice: string;
	maxNotionalValue: string;
	positionAmt: string;
	notional: string;
	isolatedWallet: string;
	symbol: string;
	unRealizedProfit: string;
	positionSide: 'BOTH' | 'LONG' | 'SHORT';
	updateTime: number;
}

export interface IncomeHistory {
	symbol: string;
	incomeType: string;
	income: string;
	asset: string;
	info: string;
	time: number;
	tranId: string;
	tradeId: string;
}