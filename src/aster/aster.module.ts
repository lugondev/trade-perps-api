import { Module } from '@nestjs/common';
import { AsterApiService } from './services/aster-api.service';
import { AsterWebSocketService } from './services/aster-websocket.service';
import { AsterController } from './controllers/aster.controller';
import { BalanceService } from './services/balance.service';
import { HistoryService } from './services/history.service';
import { TradingService } from './services/trading.service';
import { MarketDataService } from './services/market-data.service';

@Module({
	providers: [
		AsterApiService,
		AsterWebSocketService,
		BalanceService,
		HistoryService,
		TradingService,
		MarketDataService,
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