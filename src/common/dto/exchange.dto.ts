import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ExchangeName, TradingType } from '../types/exchange.types';

/**
 * DTO for exchange routing parameters
 */
export class ExchangeQueryDto {
  @ApiProperty({
    description: 'Exchange name',
    enum: ['aster', 'hyperliquid', 'binance', 'okx', 'orderly'],
    example: 'hyperliquid',
    required: false,
    default: 'aster',
  })
  @IsOptional()
  @IsEnum(['aster', 'hyperliquid', 'binance', 'okx', 'orderly'])
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
