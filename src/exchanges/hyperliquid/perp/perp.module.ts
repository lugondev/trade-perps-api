import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Controllers
import { HyperliquidPerpTradingController } from './controllers/perp-trading.controller';
import { HyperliquidPerpBalanceController } from './controllers/perp-balance.controller';
import { HyperliquidPerpMarketController } from './controllers/perp-market.controller';

// Services
import { HyperliquidPerpTradingService } from './services/perp-trading.service';
import { HyperliquidPerpBalanceService } from './services/perp-balance.service';
import { HyperliquidPerpMarketService } from './services/perp-market.service';

// Shared services
import { HyperliquidApiService } from '../shared/hyperliquid-api.service';
import { SigningService } from '../shared/signing.service';

@Module({
	imports: [ConfigModule],
	controllers: [
		HyperliquidPerpTradingController,
		HyperliquidPerpBalanceController,
		HyperliquidPerpMarketController,
	],
	providers: [
		HyperliquidPerpTradingService,
		HyperliquidPerpBalanceService,
		HyperliquidPerpMarketService,
		HyperliquidApiService,
		SigningService,
	],
	exports: [
		HyperliquidPerpTradingService,
		HyperliquidPerpBalanceService,
		HyperliquidPerpMarketService,
	],
})
export class HyperliquidPerpModule { }
