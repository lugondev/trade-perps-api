import {
  Order,
  OrderSide,
  OrderType,
  OrderStatus,
  Trade,
  Position,
  PositionSide,
} from '../../../../common/types/exchange.types';
import { formatSymbolResponse } from './perp-market.utils';

export function mapOrder(order: any): Order {
  return {
    orderId: order.oid?.toString() || order.id?.toString() || '',
    symbol: formatSymbolResponse(order.coin),
    side: order.side === 'B' ? OrderSide.BUY : OrderSide.SELL,
    type: OrderType.LIMIT,
    status: OrderStatus.NEW,
    price: order.limitPx ?? order.price ?? '0',
    quantity: order.sz ?? order.quantity ?? '0',
    executedQuantity: (
      parseFloat(order.origSz ?? order.sz ?? '0') - parseFloat(order.sz ?? '0')
    ).toString(),
    timestamp: order.timestamp ?? Date.now(),
  } as Order;
}

export function mapTrade(trade: any, symbol?: string): Trade {
  return {
    id: trade.tid?.toString() || trade.hash || '',
    orderId: trade.oid?.toString() || trade.orderId?.toString() || '',
    symbol: symbol ?? formatSymbolResponse(trade.coin),
    side: trade.side === 'B' ? OrderSide.BUY : OrderSide.SELL,
    price: trade.px ?? '0',
    quantity: trade.sz ?? trade.quantity ?? '0',
    fee: trade.fee ?? '0',
    feeAsset: trade.feeAsset ?? 'USDC',
    timestamp: trade.time ?? Date.now(),
  } as Trade;
}

export function mapPosition(position: any): Position {
  return {
    symbol: formatSymbolResponse(position.coin),
    side: position.side === 'LONG' ? PositionSide.LONG : PositionSide.SHORT,
    size: position.size ?? position.sz ?? '0',
    entryPrice: position.entryPrice ?? position.entryPx ?? '0',
    markPrice: position.markPrice ?? position.markPx,
    liquidationPrice: position.liquidationPrice ?? position.liqPx,
    unrealizedPnl: position.unrealizedPnl ?? '0',
    realizedPnl: position.realizedPnl,
    leverage: position.leverage,
    marginType: position.marginType,
  } as Position;
}
