import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Services
import { HyperliquidPerpTradingService } from './services/perp-trading.service';
import { HyperliquidPerpBalanceService } from './services/perp-balance.service';
import { HyperliquidPerpMarketService } from './services/perp-market.service';

// Shared services
import { HyperliquidApiService } from '../shared/hyperliquid-api.service';
import { SigningService } from '../shared/signing.service';

@Module({
	imports: [ConfigModule],
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
