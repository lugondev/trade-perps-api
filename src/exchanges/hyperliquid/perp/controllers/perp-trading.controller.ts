import { Controller, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiKeyAuth } from '../../../../common/decorators/api-key.decorator';
import { BaseFuturesTradingController } from '../../../../common/controllers';
import { HyperliquidPerpTradingService } from '../services/perp-trading.service';

@ApiTags('hyperliquid-perpetual')
@ApiKeyAuth()
@Controller('hyperliquid/perp/trading')
export class HyperliquidPerpTradingController extends BaseFuturesTradingController {
	protected readonly logger = new Logger(HyperliquidPerpTradingController.name);
	protected readonly tradingService: HyperliquidPerpTradingService;

	constructor(tradingService: HyperliquidPerpTradingService) {
		super();
		this.tradingService = tradingService;
	}

	// Add Hyperliquid-specific trading methods here if needed
}
