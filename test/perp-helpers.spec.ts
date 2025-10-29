import {
  mapOrder,
  mapTrade,
  mapPosition,
} from '../src/exchanges/hyperliquid/perp/services/perp-helpers';

describe('Perp helpers', () => {
  test('mapOrder maps raw order to Order', () => {
    const raw = {
      oid: 123,
      coin: 'BTC',
      side: 'B',
      limitPx: '30000',
      sz: '0.1',
      origSz: '0.1',
      timestamp: 1600000000,
    };

    const mapped = mapOrder(raw as any);

    expect(mapped.orderId).toBe('123');
    expect(mapped.symbol).toBe('BTCUSDT');
    expect(mapped.side).toBeDefined();
    expect(mapped.price).toBe('30000');
  });

  test('mapTrade maps raw trade to Trade', () => {
    const raw = {
      tid: 1,
      coin: 'BTC',
      side: 'S',
      px: '29900',
      sz: '0.05',
      time: 1600000100,
    };

    const mapped = mapTrade(raw as any, 'BTCUSDT');

    expect(mapped.id).toBe('1');
    expect(mapped.symbol).toBe('BTCUSDT');
    expect(mapped.price).toBe('29900');
  });

  test('mapPosition maps raw position to Position', () => {
    const raw = {
      coin: 'BTC',
      side: 'LONG',
      size: '0.2',
      entryPx: '28000',
      unrealizedPnl: '100',
      leverage: 10,
      marginType: 'cross',
    };

    const mapped = mapPosition(raw as any);

    expect(mapped.symbol).toBe('BTCUSDT');
    expect(mapped.entryPrice).toBe('28000');
    expect(mapped.unrealizedPnl).toBe('100');
  });
});
