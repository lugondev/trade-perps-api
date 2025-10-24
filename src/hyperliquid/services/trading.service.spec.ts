import { Test, TestingModule } from '@nestjs/testing';
import { TradingService } from './trading.service';
import { HyperliquidApiService } from './hyperliquid-api.service';
import { BalanceService } from './balance.service';
import { MarketDataService } from './market-data.service';

describe('TradingService', () => {
	let service: TradingService;
	let hyperliquidApiService: jest.Mocked<HyperliquidApiService>;
	let balanceService: jest.Mocked<BalanceService>;
	let marketDataService: jest.Mocked<MarketDataService>;

	const mockHyperliquidApiService = {
		placeOrder: jest.fn(),
		cancelOrder: jest.fn(),
		cancelAllOrders: jest.fn(),
		getOpenOrders: jest.fn(),
		updateLeverage: jest.fn(),
	};

	const mockBalanceService = {
		getBalance: jest.fn(),
		getPosition: jest.fn(),
		getPositions: jest.fn(),
	};

	const mockMarketDataService = {
		getCurrentPrice: jest.fn(),
		getAllMids: jest.fn(),
		getL2Book: jest.fn(),
		getRecentTrades: jest.fn(),
		getCandles: jest.fn(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				TradingService,
				{
					provide: HyperliquidApiService,
					useValue: mockHyperliquidApiService,
				},
				{
					provide: BalanceService,
					useValue: mockBalanceService,
				},
				{
					provide: MarketDataService,
					useValue: mockMarketDataService,
				},
			],
		}).compile();

		service = module.get<TradingService>(TradingService);
		hyperliquidApiService = module.get(HyperliquidApiService);
		balanceService = module.get(BalanceService);
		marketDataService = module.get(MarketDataService);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('Quick Long with TP/SL', () => {
		it('should successfully execute quick long with default TP/SL', async () => {
			const coin = 'BTC';
			const usdValue = 100;
			const leverage = 5;
			const currentPrice = 50000;

			// Mock responses
			mockHyperliquidApiService.updateLeverage.mockResolvedValue({
				success: true,
				data: { leverage },
				timestamp: Date.now(),
			});

			mockMarketDataService.getCurrentPrice.mockResolvedValue({
				success: true,
				data: currentPrice.toString(),
				timestamp: Date.now(),
			});

			mockHyperliquidApiService.placeOrder.mockResolvedValue({
				success: true,
				data: { orderId: '123', status: 'filled' },
				timestamp: Date.now(),
			});

			// Execute quick long
			const result = await service.quickLong(coin, usdValue, 5, 10, leverage);

			// Assertions
			expect(result.success).toBe(true);
			expect(result.data).toBeDefined();
			expect(result.data.currentPrice).toBe(currentPrice);

			// Verify leverage was set
			expect(mockHyperliquidApiService.updateLeverage).toHaveBeenCalledWith(
				coin,
				true,
				leverage,
			);

			// Verify orders were placed (entry + SL + TP = 3 calls)
			expect(mockHyperliquidApiService.placeOrder).toHaveBeenCalledTimes(3);

			// Calculate expected values
			const expectedSize = (usdValue * leverage) / currentPrice;
			const expectedSL = currentPrice * (1 - 5 / 100 / leverage);
			const expectedTP = currentPrice * (1 + 10 / 100 / leverage);

			expect(result.data.size).toBeCloseTo(expectedSize, 8);
			expect(result.data.stopLossPrice).toBeCloseTo(expectedSL, 2);
			expect(result.data.takeProfitPrice).toBeCloseTo(expectedTP, 2);
		});

		it('should execute quick long with custom TP/SL percentages', async () => {
			const coin = 'ETH';
			const usdValue = 200;
			const leverage = 10;
			const currentPrice = 3000;
			const stopLossPercent = 3;
			const takeProfitPercent = 15;

			mockHyperliquidApiService.updateLeverage.mockResolvedValue({
				success: true,
				data: { leverage },
				timestamp: Date.now(),
			});

			mockMarketDataService.getCurrentPrice.mockResolvedValue({
				success: true,
				data: currentPrice.toString(),
				timestamp: Date.now(),
			});

			mockHyperliquidApiService.placeOrder.mockResolvedValue({
				success: true,
				data: { orderId: '456', status: 'filled' },
				timestamp: Date.now(),
			});

			const result = await service.quickLong(
				coin,
				usdValue,
				stopLossPercent,
				takeProfitPercent,
				leverage,
			);

			expect(result.success).toBe(true);
			expect(result.data).toBeDefined();

			const expectedSize = (usdValue * leverage) / currentPrice;
			const expectedSL = currentPrice * (1 - stopLossPercent / 100 / leverage);
			const expectedTP = currentPrice * (1 + takeProfitPercent / 100 / leverage);

			expect(result.data.size).toBeCloseTo(expectedSize, 8);
			expect(result.data.stopLossPrice).toBeCloseTo(expectedSL, 2);
			expect(result.data.takeProfitPrice).toBeCloseTo(expectedTP, 2);
		});

		it('should handle failed price fetch in quick long', async () => {
			const coin = 'BTC';
			const usdValue = 100;

			mockHyperliquidApiService.updateLeverage.mockResolvedValue({
				success: true,
				data: { leverage: 5 },
				timestamp: Date.now(),
			});

			mockMarketDataService.getCurrentPrice.mockResolvedValue({
				success: false,
				error: 'Price fetch failed',
				timestamp: Date.now(),
			});

			const result = await service.quickLong(coin, usdValue);

			expect(result.success).toBe(false);
			expect(result.error).toBe('Failed to get current price');
		});

		it('should handle failed entry order in quick long', async () => {
			const coin = 'BTC';
			const usdValue = 100;
			const currentPrice = 50000;

			mockHyperliquidApiService.updateLeverage.mockResolvedValue({
				success: true,
				data: { leverage: 5 },
				timestamp: Date.now(),
			});

			mockMarketDataService.getCurrentPrice.mockResolvedValue({
				success: true,
				data: currentPrice.toString(),
				timestamp: Date.now(),
			});

			mockHyperliquidApiService.placeOrder.mockResolvedValue({
				success: false,
				error: 'Insufficient balance',
				timestamp: Date.now(),
			});

			const result = await service.quickLong(coin, usdValue);

			expect(result.success).toBe(false);
			expect(result.error).toBe('Insufficient balance');
		});
	});

	describe('Quick Short with TP/SL', () => {
		it('should successfully execute quick short with default TP/SL', async () => {
			const coin = 'BTC';
			const usdValue = 100;
			const leverage = 5;
			const currentPrice = 50000;

			mockHyperliquidApiService.updateLeverage.mockResolvedValue({
				success: true,
				data: { leverage },
				timestamp: Date.now(),
			});

			mockMarketDataService.getCurrentPrice.mockResolvedValue({
				success: true,
				data: currentPrice.toString(),
				timestamp: Date.now(),
			});

			mockHyperliquidApiService.placeOrder.mockResolvedValue({
				success: true,
				data: { orderId: '789', status: 'filled' },
				timestamp: Date.now(),
			});

			const result = await service.quickShort(coin, usdValue, 5, 10, leverage);

			expect(result.success).toBe(true);
			expect(result.data).toBeDefined();
			expect(result.data.currentPrice).toBe(currentPrice);

			// Verify leverage was set
			expect(mockHyperliquidApiService.updateLeverage).toHaveBeenCalledWith(
				coin,
				true,
				leverage,
			);

			// Verify orders were placed (entry + SL + TP = 3 calls)
			expect(mockHyperliquidApiService.placeOrder).toHaveBeenCalledTimes(3);

			// Calculate expected values for SHORT
			const expectedSize = (usdValue * leverage) / currentPrice;
			const expectedSL = currentPrice * (1 + 5 / 100 / leverage); // Higher for short
			const expectedTP = currentPrice * (1 - 10 / 100 / leverage); // Lower for short

			expect(result.data.size).toBeCloseTo(expectedSize, 8);
			expect(result.data.stopLossPrice).toBeCloseTo(expectedSL, 2);
			expect(result.data.takeProfitPrice).toBeCloseTo(expectedTP, 2);
		});

		it('should execute quick short with custom TP/SL percentages', async () => {
			const coin = 'ETH';
			const usdValue = 150;
			const leverage = 8;
			const currentPrice = 3000;
			const stopLossPercent = 4;
			const takeProfitPercent = 12;

			mockHyperliquidApiService.updateLeverage.mockResolvedValue({
				success: true,
				data: { leverage },
				timestamp: Date.now(),
			});

			mockMarketDataService.getCurrentPrice.mockResolvedValue({
				success: true,
				data: currentPrice.toString(),
				timestamp: Date.now(),
			});

			mockHyperliquidApiService.placeOrder.mockResolvedValue({
				success: true,
				data: { orderId: '321', status: 'filled' },
				timestamp: Date.now(),
			});

			const result = await service.quickShort(
				coin,
				usdValue,
				stopLossPercent,
				takeProfitPercent,
				leverage,
			);

			expect(result.success).toBe(true);
			expect(result.data).toBeDefined();

			const expectedSize = (usdValue * leverage) / currentPrice;
			const expectedSL = currentPrice * (1 + stopLossPercent / 100 / leverage);
			const expectedTP = currentPrice * (1 - takeProfitPercent / 100 / leverage);

			expect(result.data.size).toBeCloseTo(expectedSize, 8);
			expect(result.data.stopLossPrice).toBeCloseTo(expectedSL, 2);
			expect(result.data.takeProfitPrice).toBeCloseTo(expectedTP, 2);
		});

		it('should handle failed price fetch in quick short', async () => {
			const coin = 'ETH';
			const usdValue = 100;

			mockHyperliquidApiService.updateLeverage.mockResolvedValue({
				success: true,
				data: { leverage: 5 },
				timestamp: Date.now(),
			});

			mockMarketDataService.getCurrentPrice.mockResolvedValue({
				success: false,
				error: 'Connection timeout',
				timestamp: Date.now(),
			});

			const result = await service.quickShort(coin, usdValue);

			expect(result.success).toBe(false);
			expect(result.error).toBe('Failed to get current price');
		});
	});

	describe('Close Position', () => {
		it('should successfully close full long position', async () => {
			const coin = 'BTC';
			const positionSize = 0.01;
			const currentPrice = 50000;

			mockBalanceService.getPosition.mockResolvedValue({
				success: true,
				data: {
					coin,
					szi: positionSize.toString(), // Positive = long
					entryPx: '50000',
					unrealizedPnl: '10',
				},
				timestamp: Date.now(),
			});

			// Mock getCurrentPrice for placeMarketOrder
			mockMarketDataService.getCurrentPrice.mockResolvedValue({
				success: true,
				data: currentPrice.toString(),
				timestamp: Date.now(),
			});

			mockHyperliquidApiService.placeOrder.mockResolvedValue({
				success: true,
				data: { orderId: '999', status: 'filled' },
				timestamp: Date.now(),
			});

			const result = await service.closePosition({ coin });

			expect(result.success).toBe(true);
			expect(mockBalanceService.getPosition).toHaveBeenCalledWith(coin);

			// Verify market order was placed to close (sell for long position)
			expect(mockHyperliquidApiService.placeOrder).toHaveBeenCalledTimes(1);
			const orderCall = mockHyperliquidApiService.placeOrder.mock.calls[0][0];
			expect(orderCall.coin).toBe(coin);
			expect(orderCall.is_buy).toBe(false); // Sell to close long
			expect(orderCall.sz).toBe(positionSize);
			expect(orderCall.reduce_only).toBe(true);
		});

		it('should successfully close full short position', async () => {
			const coin = 'ETH';
			const positionSize = -0.05; // Negative = short
			const currentPrice = 3000;

			mockBalanceService.getPosition.mockResolvedValue({
				success: true,
				data: {
					coin,
					szi: positionSize.toString(),
					entryPx: '3000',
					unrealizedPnl: '5',
				},
				timestamp: Date.now(),
			});

			// Mock getCurrentPrice for placeMarketOrder
			mockMarketDataService.getCurrentPrice.mockResolvedValue({
				success: true,
				data: currentPrice.toString(),
				timestamp: Date.now(),
			});

			mockHyperliquidApiService.placeOrder.mockResolvedValue({
				success: true,
				data: { orderId: '888', status: 'filled' },
				timestamp: Date.now(),
			});

			const result = await service.closePosition({ coin });

			expect(result.success).toBe(true);

			// Verify market order was placed to close (buy for short position)
			const orderCall = mockHyperliquidApiService.placeOrder.mock.calls[0][0];
			expect(orderCall.coin).toBe(coin);
			expect(orderCall.is_buy).toBe(true); // Buy to close short
			expect(orderCall.sz).toBe(Math.abs(positionSize));
			expect(orderCall.reduce_only).toBe(true);
		});

		it('should successfully close partial position', async () => {
			const coin = 'BTC';
			const positionSize = 0.1;
			const closeSize = 0.05;
			const currentPrice = 50000;

			mockBalanceService.getPosition.mockResolvedValue({
				success: true,
				data: {
					coin,
					szi: positionSize.toString(),
					entryPx: '50000',
					unrealizedPnl: '50',
				},
				timestamp: Date.now(),
			});

			// Mock getCurrentPrice for placeMarketOrder
			mockMarketDataService.getCurrentPrice.mockResolvedValue({
				success: true,
				data: currentPrice.toString(),
				timestamp: Date.now(),
			});

			mockHyperliquidApiService.placeOrder.mockResolvedValue({
				success: true,
				data: { orderId: '777', status: 'filled' },
				timestamp: Date.now(),
			});

			const result = await service.closePosition({ coin, size: closeSize });

			expect(result.success).toBe(true);

			const orderCall = mockHyperliquidApiService.placeOrder.mock.calls[0][0];
			expect(orderCall.sz).toBe(closeSize);
		});

		it('should handle no position found error', async () => {
			const coin = 'BTC';

			mockBalanceService.getPosition.mockResolvedValue({
				success: false,
				error: 'Position not found',
				timestamp: Date.now(),
			});

			const result = await service.closePosition({ coin });

			expect(result.success).toBe(false);
			expect(result.error).toBe(`No position found for ${coin}`);
			expect(mockHyperliquidApiService.placeOrder).not.toHaveBeenCalled();
		});

		it('should handle close size exceeds position size error', async () => {
			const coin = 'ETH';
			const positionSize = 0.05;
			const closeSize = 0.1; // Larger than position

			mockBalanceService.getPosition.mockResolvedValue({
				success: true,
				data: {
					coin,
					szi: positionSize.toString(),
					entryPx: '3000',
					unrealizedPnl: '10',
				},
				timestamp: Date.now(),
			});

			const result = await service.closePosition({ coin, size: closeSize });

			expect(result.success).toBe(false);
			expect(result.error).toBe(`Close size ${closeSize} exceeds position size ${positionSize}`);
			expect(mockHyperliquidApiService.placeOrder).not.toHaveBeenCalled();
		});
	});

	describe('Close All Positions', () => {
		it('should successfully close all open positions', async () => {
			const positions = [
				{
					coin: 'BTC',
					szi: '0.01',
					entryPx: '50000',
					unrealizedPnl: '10',
				},
				{
					coin: 'ETH',
					szi: '-0.05',
					entryPx: '3000',
					unrealizedPnl: '5',
				},
				{
					coin: 'SOL',
					szi: '1.5',
					entryPx: '100',
					unrealizedPnl: '15',
				},
			];

			mockBalanceService.getPositions.mockResolvedValue({
				success: true,
				data: positions,
				timestamp: Date.now(),
			});

			// Mock getPosition for each coin
			positions.forEach((pos) => {
				mockBalanceService.getPosition.mockResolvedValueOnce({
					success: true,
					data: pos,
					timestamp: Date.now(),
				});

				// Mock getCurrentPrice for each placeMarketOrder
				mockMarketDataService.getCurrentPrice.mockResolvedValueOnce({
					success: true,
					data: pos.entryPx,
					timestamp: Date.now(),
				});
			});

			mockHyperliquidApiService.placeOrder.mockResolvedValue({
				success: true,
				data: { orderId: '111', status: 'filled' },
				timestamp: Date.now(),
			});

			const result = await service.closeAllPositions();

			expect(result.success).toBe(true);
			expect(result.data).toHaveLength(3);
			expect(mockBalanceService.getPosition).toHaveBeenCalledTimes(3);
			expect(mockHyperliquidApiService.placeOrder).toHaveBeenCalledTimes(3);
		});

		it('should handle no open positions', async () => {
			mockBalanceService.getPositions.mockResolvedValue({
				success: true,
				data: [
					{ coin: 'BTC', szi: '0', entryPx: '0', unrealizedPnl: '0' },
				],
				timestamp: Date.now(),
			});

			const result = await service.closeAllPositions();

			expect(result.success).toBe(true);
			expect(result.data).toEqual({ message: 'No open positions to close' });
			expect(mockHyperliquidApiService.placeOrder).not.toHaveBeenCalled();
		});

		it('should handle failed positions fetch', async () => {
			mockBalanceService.getPositions.mockResolvedValue({
				success: false,
				error: 'API error',
				timestamp: Date.now(),
			});

			const result = await service.closeAllPositions();

			expect(result.success).toBe(false);
			expect(result.error).toBe('Failed to fetch positions');
		});

		it('should continue closing positions even if one fails', async () => {
			const positions = [
				{ coin: 'BTC', szi: '0.01', entryPx: '50000', unrealizedPnl: '10' },
				{ coin: 'ETH', szi: '0.05', entryPx: '3000', unrealizedPnl: '5' },
			];

			mockBalanceService.getPositions.mockResolvedValue({
				success: true,
				data: positions,
				timestamp: Date.now(),
			});

			// First position succeeds
			mockBalanceService.getPosition.mockResolvedValueOnce({
				success: true,
				data: positions[0],
				timestamp: Date.now(),
			});

			// Mock getCurrentPrice for first position
			mockMarketDataService.getCurrentPrice.mockResolvedValueOnce({
				success: true,
				data: positions[0].entryPx,
				timestamp: Date.now(),
			});

			mockHyperliquidApiService.placeOrder.mockResolvedValueOnce({
				success: true,
				data: { orderId: '222', status: 'filled' },
				timestamp: Date.now(),
			});

			// Second position fails
			mockBalanceService.getPosition.mockResolvedValueOnce({
				success: false,
				error: 'Position not found',
				timestamp: Date.now(),
			});

			const result = await service.closeAllPositions();

			expect(result.success).toBe(true);
			expect(result.data).toHaveLength(2);
			// Verify first succeeded, second failed
			expect(result.data[0].result.success).toBe(true);
			expect(result.data[1].result.success).toBe(false);
		});
	});

	describe('Set Leverage', () => {
		it('should successfully set leverage', async () => {
			const coin = 'BTC';
			const leverage = 10;

			mockHyperliquidApiService.updateLeverage.mockResolvedValue({
				success: true,
				data: { leverage },
				timestamp: Date.now(),
			});

			const result = await service.setLeverage(coin, leverage);

			expect(result.success).toBe(true);
			expect(mockHyperliquidApiService.updateLeverage).toHaveBeenCalledWith(
				coin,
				true,
				leverage,
			);
		});

		it('should reject leverage below 1', async () => {
			const coin = 'ETH';
			const leverage = 0.5;

			const result = await service.setLeverage(coin, leverage);

			expect(result.success).toBe(false);
			expect(result.error).toBe('Leverage must be between 1 and 50');
			expect(mockHyperliquidApiService.updateLeverage).not.toHaveBeenCalled();
		});

		it('should reject leverage above 50', async () => {
			const coin = 'BTC';
			const leverage = 51;

			const result = await service.setLeverage(coin, leverage);

			expect(result.success).toBe(false);
			expect(result.error).toBe('Leverage must be between 1 and 50');
			expect(mockHyperliquidApiService.updateLeverage).not.toHaveBeenCalled();
		});

		it('should set isolated margin mode', async () => {
			const coin = 'SOL';
			const leverage = 5;
			const isCross = false;

			mockHyperliquidApiService.updateLeverage.mockResolvedValue({
				success: true,
				data: { leverage, isCross },
				timestamp: Date.now(),
			});

			const result = await service.setLeverage(coin, leverage, isCross);

			expect(result.success).toBe(true);
			expect(mockHyperliquidApiService.updateLeverage).toHaveBeenCalledWith(
				coin,
				isCross,
				leverage,
			);
		});
	});
});
