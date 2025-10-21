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
	id: string;
	orderId: string;
	symbol: string;
	side: 'BUY' | 'SELL';
	quantity: string;
	price: string;
	fee: string;
	feeAsset: string;
	timestamp: number;
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