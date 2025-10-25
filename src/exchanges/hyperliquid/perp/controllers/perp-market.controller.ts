import { Controller, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BaseFuturesMarketController } from '../../../../common/controllers';
import { HyperliquidPerpMarketService } from '../services/perp-market.service';

@ApiTags('hyperliquid-perpetual')
@Controller('hyperliquid/perp/market')
export class HyperliquidPerpMarketController extends BaseFuturesMarketController {
	protected readonly logger = new Logger(HyperliquidPerpMarketController.name);
	protected readonly marketService: HyperliquidPerpMarketService;

	constructor(marketService: HyperliquidPerpMarketService) {
		super();
		this.marketService = marketService;
	}

	// Add Hyperliquid-specific market methods here if needed
}
