import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as WebSocket from 'ws';
import { Subject, Observable } from 'rxjs';
import { WebSocketMessage, TickerData, OrderBookData } from '../types';

@Injectable()
export class AsterWebSocketService implements OnModuleDestroy {
	private readonly logger = new Logger(AsterWebSocketService.name);
	private ws: WebSocket | null = null;
	private readonly wsUrl: string;
	private readonly messageSubject = new Subject<WebSocketMessage>();
	private readonly tickerSubject = new Subject<TickerData>();
	private readonly orderBookSubject = new Subject<OrderBookData>();
	private reconnectInterval: NodeJS.Timeout | null = null;
	private pingInterval: NodeJS.Timeout | null = null;
	private isConnected = false;
	private subscriptions: Set<string> = new Set();

	constructor(private configService: ConfigService) {
		this.wsUrl = this.configService.get<string>('ASTER_WS_URL') || 'wss://fstream.asterdex.com/ws/';
	}

	/**
	 * Connect to WebSocket
	 */
	async connect(): Promise<void> {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.logger.warn('WebSocket is already connected');
			return;
		}

		try {
			this.logger.log(`Connecting to WebSocket: ${this.wsUrl}`);

			this.ws = new WebSocket(this.wsUrl);

			this.ws.on('open', () => {
				this.logger.log('WebSocket connected successfully');
				this.isConnected = true;
				this.startPingInterval();
			});

			this.ws.on('message', (data: WebSocket.Data) => {
				this.handleMessage(data);
			});

			this.ws.on('close', (code: number, reason: string) => {
				this.logger.warn(`WebSocket closed: ${code} - ${reason}`);
				this.isConnected = false;
				this.cleanup();
				this.scheduleReconnect();
			});

			this.ws.on('error', (error: Error) => {
				this.logger.error('WebSocket error:', error);
				this.isConnected = false;
			});

			this.ws.on('pong', () => {
				this.logger.debug('Received pong from server');
			});

		} catch (error) {
			this.logger.error('Failed to connect to WebSocket:', error);
			this.scheduleReconnect();
		}
	}

	/**
	 * Disconnect from WebSocket
	 */
	disconnect(): void {
		this.logger.log('Disconnecting WebSocket');

		if (this.reconnectInterval) {
			clearTimeout(this.reconnectInterval);
			this.reconnectInterval = null;
		}

		this.cleanup();

		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}

		this.isConnected = false;
		this.subscriptions.clear();
	}

	/**
	 * Subscribe to ticker updates for a symbol
	 */
	subscribeTicker(symbol: string): void {
		const streamName = `${symbol.toLowerCase()}@ticker`;

		if (this.subscriptions.has(streamName)) {
			this.logger.debug(`Already subscribed to ticker for ${symbol}`);
			return;
		}

		this.subscribe([streamName]);
		this.subscriptions.add(streamName);
		this.logger.log(`Subscribed to ticker for ${symbol}`);
	}

	/**
	 * Subscribe to order book updates for a symbol
	 */
	subscribeOrderBook(symbol: string, depth: number = 20): void {
		const streamName = `${symbol.toLowerCase()}@depth${depth}`;

		if (this.subscriptions.has(streamName)) {
			this.logger.debug(`Already subscribed to order book for ${symbol}`);
			return;
		}

		this.subscribe([streamName]);
		this.subscriptions.add(streamName);
		this.logger.log(`Subscribed to order book for ${symbol} with depth ${depth}`);
	}

	/**
	 * Generic subscribe method for streams
	 */
	private subscribe(streams: string[]): void {
		if (!this.isWebSocketConnected()) {
			this.logger.warn('Cannot subscribe: WebSocket not connected');
			return;
		}

		this.sendMessage({
			method: 'SUBSCRIBE',
			params: streams,
			id: Date.now(),
		});
	}

	/**
	 * Get observable for all WebSocket messages
	 */
	getMessages(): Observable<WebSocketMessage> {
		return this.messageSubject.asObservable();
	}

	/**
	 * Get observable for ticker data
	 */
	getTickerData(): Observable<TickerData> {
		return this.tickerSubject.asObservable();
	}

	/**
	 * Get observable for order book data
	 */
	getOrderBookData(): Observable<OrderBookData> {
		return this.orderBookSubject.asObservable();
	}

	/**
	 * Check if WebSocket is connected
	 */
	isWebSocketConnected(): boolean {
		return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
	}

	/**
	 * Handle incoming WebSocket messages
	 */
	private handleMessage(data: WebSocket.Data): void {
		try {
			const message = JSON.parse(data.toString());

			// Emit raw message
			const wsMessage: WebSocketMessage = {
				event: message.e || message.event || 'unknown',
				data: message,
				timestamp: Date.now(),
			};

			this.messageSubject.next(wsMessage);

			// Handle specific message types
			if (message.e === '24hrTicker') {
				this.handleTickerMessage(message);
			} else if (message.e === 'depthUpdate') {
				this.handleOrderBookMessage(message);
			}

		} catch (error) {
			this.logger.error('Error parsing WebSocket message:', error);
		}
	}

	/**
	 * Handle ticker messages
	 */
	private handleTickerMessage(message: any): void {
		try {
			const tickerData: TickerData = {
				symbol: message.s,
				price: message.c,
				priceChange: message.p,
				priceChangePercent: message.P,
				high: message.h,
				low: message.l,
				volume: message.v,
				timestamp: message.E,
			};

			this.tickerSubject.next(tickerData);
			this.logger.debug('Processed ticker data:', tickerData.symbol);
		} catch (error) {
			this.logger.error('Error processing ticker message:', error);
		}
	}

	/**
	 * Handle order book messages
	 */
	private handleOrderBookMessage(message: any): void {
		try {
			const orderBookData: OrderBookData = {
				symbol: message.s,
				bids: message.b || [],
				asks: message.a || [],
				timestamp: message.E,
			};

			this.orderBookSubject.next(orderBookData);
			this.logger.debug('Processed order book data:', orderBookData.symbol);
		} catch (error) {
			this.logger.error('Error processing order book message:', error);
		}
	}

	/**
	 * Send message to WebSocket
	 */
	private sendMessage(message: any): void {
		if (!this.isWebSocketConnected()) {
			this.logger.warn('Cannot send message: WebSocket not connected');
			return;
		}

		try {
			this.ws!.send(JSON.stringify(message));
			this.logger.debug('Sent WebSocket message:', message);
		} catch (error) {
			this.logger.error('Error sending WebSocket message:', error);
		}
	}

	/**
	 * Start ping interval to keep connection alive
	 */
	private startPingInterval(): void {
		if (this.pingInterval) {
			clearInterval(this.pingInterval);
		}

		// Send ping every 5 minutes
		this.pingInterval = setInterval(() => {
			if (this.isWebSocketConnected()) {
				this.ws!.ping();
				this.logger.debug('Sent ping to server');
			}
		}, 5 * 60 * 1000);
	}

	/**
	 * Schedule reconnection
	 */
	private scheduleReconnect(): void {
		if (this.reconnectInterval) {
			return; // Already scheduled
		}

		this.reconnectInterval = setTimeout(() => {
			this.logger.log('Attempting to reconnect WebSocket...');
			this.reconnectInterval = null;
			this.connect();
		}, 5000); // Reconnect after 5 seconds
	}

	/**
	 * Cleanup resources
	 */
	private cleanup(): void {
		if (this.pingInterval) {
			clearInterval(this.pingInterval);
			this.pingInterval = null;
		}
	}

	/**
	 * Module cleanup
	 */
	onModuleDestroy(): void {
		this.disconnect();
	}
}