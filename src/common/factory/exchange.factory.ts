import { Injectable, Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ExchangeName, TradingType } from '../types/exchange.types';
import { IBaseTradingService, IBaseBalanceService, IBaseMarketService } from '../interfaces';

/**
 * Exchange service registration metadata
 */
export interface ExchangeServiceMetadata {
  exchange: ExchangeName;
  tradingType: TradingType;
  tradingService: Type<IBaseTradingService>;
  balanceService: Type<IBaseBalanceService>;
  marketService: Type<IBaseMarketService>;
}

/**
 * Exchange Registry - Maintains list of available exchanges and their services
 */
@Injectable()
export class ExchangeRegistry {
  private readonly exchanges = new Map<string, ExchangeServiceMetadata>();

  /**
   * Register an exchange with its services
   */
  register(metadata: ExchangeServiceMetadata): void {
    const key = this.getKey(metadata.exchange, metadata.tradingType);
    this.exchanges.set(key, metadata);
  }

  /**
   * Get exchange metadata
   */
  get(exchange: ExchangeName, tradingType: TradingType): ExchangeServiceMetadata | undefined {
    const key = this.getKey(exchange, tradingType);
    return this.exchanges.get(key);
  }

  /**
   * Check if exchange is registered
   */
  has(exchange: ExchangeName, tradingType: TradingType): boolean {
    const key = this.getKey(exchange, tradingType);
    return this.exchanges.has(key);
  }

  /**
   * Get all registered exchanges
   */
  getAll(): ExchangeServiceMetadata[] {
    return Array.from(this.exchanges.values());
  }

  /**
   * Get exchanges by trading type
   */
  getByTradingType(tradingType: TradingType): ExchangeServiceMetadata[] {
    return this.getAll().filter(e => e.tradingType === tradingType);
  }

  /**
   * Get exchanges by name
   */
  getByExchange(exchange: ExchangeName): ExchangeServiceMetadata[] {
    return this.getAll().filter(e => e.exchange === exchange);
  }

  private getKey(exchange: ExchangeName, tradingType: TradingType): string {
    return `${exchange}:${tradingType}`;
  }
}

/**
 * Exchange Service Factory - Creates exchange service instances
 */
@Injectable()
export class ExchangeServiceFactory {
  constructor(
    private readonly registry: ExchangeRegistry,
    private readonly moduleRef: ModuleRef,
  ) {}

  /**
   * Get trading service for exchange
   */
  async getTradingService(
    exchange: ExchangeName,
    tradingType: TradingType,
  ): Promise<IBaseTradingService> {
    const metadata = this.registry.get(exchange, tradingType);
    if (!metadata) {
      throw new Error(`Exchange ${exchange} with trading type ${tradingType} not registered`);
    }
    return this.moduleRef.get(metadata.tradingService, { strict: false });
  }

  /**
   * Get balance service for exchange
   */
  async getBalanceService(
    exchange: ExchangeName,
    tradingType: TradingType,
  ): Promise<IBaseBalanceService> {
    const metadata = this.registry.get(exchange, tradingType);
    if (!metadata) {
      throw new Error(`Exchange ${exchange} with trading type ${tradingType} not registered`);
    }
    return this.moduleRef.get(metadata.balanceService, { strict: false });
  }

  /**
   * Get market service for exchange
   */
  async getMarketService(
    exchange: ExchangeName,
    tradingType: TradingType,
  ): Promise<IBaseMarketService> {
    const metadata = this.registry.get(exchange, tradingType);
    if (!metadata) {
      throw new Error(`Exchange ${exchange} with trading type ${tradingType} not registered`);
    }
    return this.moduleRef.get(metadata.marketService, { strict: false });
  }

  /**
   * Get all services for exchange
   */
  async getAllServices(
    exchange: ExchangeName,
    tradingType: TradingType,
  ): Promise<{
    trading: IBaseTradingService;
    balance: IBaseBalanceService;
    market: IBaseMarketService;
  }> {
    return {
      trading: await this.getTradingService(exchange, tradingType),
      balance: await this.getBalanceService(exchange, tradingType),
      market: await this.getMarketService(exchange, tradingType),
    };
  }

  /**
   * Check if exchange is available
   */
  isAvailable(exchange: ExchangeName, tradingType: TradingType): boolean {
    return this.registry.has(exchange, tradingType);
  }

  /**
   * Get list of available exchanges
   */
  getAvailableExchanges(): Array<{
    exchange: ExchangeName;
    tradingType: TradingType;
  }> {
    return this.registry.getAll().map(metadata => ({
      exchange: metadata.exchange,
      tradingType: metadata.tradingType,
    }));
  }
}
