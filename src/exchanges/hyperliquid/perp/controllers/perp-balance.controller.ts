import { Controller, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiKeyAuth } from '../../../../common/decorators/api-key.decorator';
import { BaseFuturesBalanceController } from '../../../../common/controllers';
import { HyperliquidPerpBalanceService } from '../services/perp-balance.service';

@ApiTags('hyperliquid-perpetual')
@ApiKeyAuth()
@Controller('hyperliquid/perp/balance')
export class HyperliquidPerpBalanceController extends BaseFuturesBalanceController {
	protected readonly logger = new Logger(HyperliquidPerpBalanceController.name);
	protected readonly balanceService: HyperliquidPerpBalanceService;

	constructor(balanceService: HyperliquidPerpBalanceService) {
		super();
		this.balanceService = balanceService;
	}

	// Add Hyperliquid-specific balance methods here if needed
}
