import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AsterApiService } from './services/aster-api.service';
import { AsterWebSocketService } from './services/aster-websocket.service';
import { AsterController } from './controllers/aster.controller';
import { BalanceService } from './services/balance.service';
import { HistoryService } from './services/history.service';
import { TradingService } from './services/trading.service';
import { MarketDataService } from './services/market-data.service';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@Module({
	providers: [
		AsterApiService,
		AsterWebSocketService,
		BalanceService,
		HistoryService,
		TradingService,
		MarketDataService,
		// Apply API Key Guard to all routes in this module
		{
			provide: APP_GUARD,
			useClass: ApiKeyGuard,
		},
	],
	controllers: [AsterController],
	exports: [
		AsterApiService,
		AsterWebSocketService,
		BalanceService,
		HistoryService,
		TradingService,
		MarketDataService,
	],
})
export class AsterModule { }