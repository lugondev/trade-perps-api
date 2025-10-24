import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { HyperliquidApiService } from './services/hyperliquid-api.service';
import { SigningService } from './services/signing.service';
import { BalanceService } from './services/balance.service';
import { TradingService } from './services/trading.service';
import { MarketDataService } from './services/market-data.service';
import { HistoryService } from './services/history.service';
import { HyperliquidController } from './controllers/hyperliquid.controller';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@Module({
	providers: [
		SigningService,
		HyperliquidApiService,
		BalanceService,
		TradingService,
		MarketDataService,
		HistoryService,
		// Apply API Key Guard to all routes in this module
		{
			provide: APP_GUARD,
			useClass: ApiKeyGuard,
		},
	],
	controllers: [HyperliquidController],
	exports: [
		SigningService,
		HyperliquidApiService,
		BalanceService,
		TradingService,
		MarketDataService,
		HistoryService,
	],
})
export class HyperliquidModule { }
