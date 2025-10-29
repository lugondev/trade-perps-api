import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ExchangeName, TradingType } from '../types/exchange.types';

/**
 * DTO for exchange routing parameters
 */
export class ExchangeQueryDto {
  @ApiProperty({
    description: 'Exchange name',
    enum: ['aster', 'hyperliquid', 'binance', 'orderly'],
    example: 'hyperliquid',
    required: false,
    default: 'aster',
  })
  @IsOptional()
  @IsEnum(['aster', 'hyperliquid', 'binance', 'orderly'])
  exchange?: ExchangeName;

  @ApiProperty({
    description: 'Trading type',
    enum: ['futures', 'perpetual'],
    example: 'perpetual',
    required: false,
    default: 'futures',
  })
  @IsOptional()
  @IsEnum(['futures', 'perpetual'])
  tradingType?: TradingType;
}
