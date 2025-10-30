import { IsString, IsEnum, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderSide, OrderType, TimeInForce, PositionSide } from '../types/exchange.types';

export class PlaceOrderDto {
  @ApiProperty({ example: 'BTCUSDT', description: 'Trading symbol' })
  @IsString()
  symbol: string;

  @ApiProperty({ enum: OrderSide, example: OrderSide.BUY, description: 'Order side' })
  @IsEnum(OrderSide)
  side: OrderSide;

  @ApiProperty({ enum: OrderType, example: OrderType.LIMIT, description: 'Order type' })
  @IsEnum(OrderType)
  type: OrderType;

  @ApiProperty({ example: '0.001', description: 'Order quantity' })
  @IsString()
  quantity: string;

  @ApiPropertyOptional({
    example: '50000.00',
    description: 'Order price (required for LIMIT orders)',
  })
  @IsOptional()
  @IsString()
  price?: string;

  @ApiPropertyOptional({
    enum: TimeInForce,
    example: TimeInForce.GTC,
    description: 'Time in force',
  })
  @IsOptional()
  @IsEnum(TimeInForce)
  timeInForce?: TimeInForce;

  @ApiPropertyOptional({ example: 'my-order-123', description: 'Client order ID' })
  @IsOptional()
  @IsString()
  clientOrderId?: string;

  @ApiPropertyOptional({ example: '48000.00', description: 'Stop price (for STOP orders)' })
  @IsOptional()
  @IsString()
  stopPrice?: string;

  @ApiPropertyOptional({ example: false, description: 'Reduce only flag' })
  @IsOptional()
  reduceOnly?: boolean;
}

export class MarketOrderDto {
  @ApiProperty({ example: 'BTCUSDT', description: 'Trading symbol' })
  @IsString()
  symbol: string;

  @ApiProperty({ enum: OrderSide, example: OrderSide.BUY, description: 'Order side' })
  @IsEnum(OrderSide)
  side: OrderSide;

  @ApiProperty({ example: '0.001', description: 'Order quantity' })
  @IsString()
  quantity: string;

  @ApiPropertyOptional({ example: 'my-order-123', description: 'Client order ID' })
  @IsOptional()
  @IsString()
  clientOrderId?: string;

  @ApiPropertyOptional({ example: false, description: 'Reduce only flag' })
  @IsOptional()
  reduceOnly?: boolean;
}

export class LimitOrderDto {
  @ApiProperty({ example: 'BTCUSDT', description: 'Trading symbol' })
  @IsString()
  symbol: string;

  @ApiProperty({ enum: OrderSide, example: OrderSide.BUY, description: 'Order side' })
  @IsEnum(OrderSide)
  side: OrderSide;

  @ApiProperty({ example: '0.001', description: 'Order quantity' })
  @IsString()
  quantity: string;

  @ApiProperty({ example: '50000.00', description: 'Limit price' })
  @IsString()
  price: string;

  @ApiPropertyOptional({
    enum: TimeInForce,
    example: TimeInForce.GTC,
    description: 'Time in force',
  })
  @IsOptional()
  @IsEnum(TimeInForce)
  timeInForce?: TimeInForce;

  @ApiPropertyOptional({ example: 'my-order-123', description: 'Client order ID' })
  @IsOptional()
  @IsString()
  clientOrderId?: string;

  @ApiPropertyOptional({ example: false, description: 'Reduce only flag' })
  @IsOptional()
  reduceOnly?: boolean;
}

export class CancelOrderDto {
  @ApiProperty({ example: 'BTCUSDT', description: 'Trading symbol' })
  @IsString()
  symbol: string;

  @ApiPropertyOptional({ example: '123456789', description: 'Order ID' })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({ example: 'my-order-123', description: 'Client order ID' })
  @IsOptional()
  @IsString()
  clientOrderId?: string;
}

export class QuickTradeDto {
  @ApiProperty({ example: 'BTCUSDT', description: 'Trading symbol' })
  @IsString()
  symbol: string;

  @ApiProperty({ example: '0.001', description: 'Order quantity' })
  @IsString()
  quantity: string;

  @ApiPropertyOptional({ example: '50000.00', description: 'Price (for limit orders)' })
  @IsOptional()
  @IsString()
  price?: string;
}

export class QuickLongShortDto {
  @ApiProperty({ example: 'BTCUSDT', description: 'Trading symbol' })
  @IsString()
  symbol: string;

  @ApiProperty({ example: 100, description: 'USD value for position' })
  @IsNumber()
  @Min(1)
  usdValue: number;

  @ApiPropertyOptional({ example: 5, description: 'Stop loss percentage (default: 5%)' })
  @IsNumber()
  @Min(0)
  stopLossPercent: number;

  @ApiPropertyOptional({ example: 10, description: 'Take profit percentage (default: 10%)' })
  @IsNumber()
  @Min(0)
  takeProfitPercent: number;

  @ApiPropertyOptional({ example: 10, description: 'Leverage (default: 10x)' })
  @IsNumber()
  @Min(1)
  leverage: number;
}

export class SetLeverageDto {
  @ApiProperty({ example: 'BTCUSDT', description: 'Trading symbol' })
  @IsString()
  symbol: string;

  @ApiProperty({ example: 10, description: 'Leverage multiplier', minimum: 1, maximum: 125 })
  @IsNumber()
  @Min(1)
  leverage: number;
}

export class ClosePositionDto {
  @ApiProperty({ example: 'BTCUSDT', description: 'Trading symbol' })
  @IsString()
  symbol: string;

  @ApiPropertyOptional({
    example: '0.001',
    description: 'Quantity to close (optional, closes all if not provided)',
  })
  @IsOptional()
  @IsString()
  quantity?: string;

  @ApiPropertyOptional({ enum: PositionSide, description: 'Position side (for hedge mode)' })
  @IsOptional()
  @IsEnum(PositionSide)
  positionSide?: PositionSide;

  @ApiPropertyOptional({
    example: 1,
    description: 'Slippage tolerance in percentage (default: 1%)',
  })
  @IsOptional()
  @IsNumber()
  slippage?: number;
}

/**
 * Set margin type DTO
 */
// Margin-related DTO removed (margin is not supported)

/**
 * Set position mode DTO
 */
export class SetPositionModeDto {
  @ApiProperty({ example: false, description: 'Enable hedge mode (dual-side position)' })
  @IsBoolean()
  dualSidePosition: boolean;
}

/**
 * Modify position margin DTO
 */
// Margin-related DTO removed (margin is not supported)

/**
 * Set stop loss DTO
 */
export class SetStopLossDto {
  @ApiProperty({ example: 'BTCUSDT', description: 'Trading symbol' })
  @IsString()
  symbol: string;

  @ApiProperty({ example: '45000', description: 'Stop loss trigger price' })
  @IsString()
  stopPrice: string;

  @ApiPropertyOptional({
    example: '0.5',
    description: 'Quantity (leave empty for entire position)',
  })
  @IsOptional()
  @IsString()
  quantity?: string;

  @ApiPropertyOptional({ enum: ['BUY', 'SELL'], description: 'Order side' })
  @IsOptional()
  @IsEnum(['BUY', 'SELL'])
  side?: 'BUY' | 'SELL';
}

/**
 * Set take profit DTO
 */
export class SetTakeProfitDto {
  @ApiProperty({ example: 'BTCUSDT', description: 'Trading symbol' })
  @IsString()
  symbol: string;

  @ApiProperty({ example: '55000', description: 'Take profit trigger price' })
  @IsString()
  takeProfitPrice: string;

  @ApiPropertyOptional({
    example: '0.5',
    description: 'Quantity (leave empty for entire position)',
  })
  @IsOptional()
  @IsString()
  quantity?: string;

  @ApiPropertyOptional({ enum: ['BUY', 'SELL'], description: 'Order side' })
  @IsOptional()
  @IsEnum(['BUY', 'SELL'])
  side?: 'BUY' | 'SELL';
}

/**
 * Open position DTO
 */
export class OpenPositionDto {
  @ApiProperty({ example: 'BTCUSDT', description: 'Trading symbol' })
  @IsString()
  symbol: string;

  @ApiProperty({ example: '0.1', description: 'Position quantity' })
  @IsString()
  quantity: string;
}
