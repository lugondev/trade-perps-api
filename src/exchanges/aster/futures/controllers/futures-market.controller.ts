import { Controller, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiKeyAuth } from '../../../../common/decorators/api-key.decorator';
import { BaseFuturesMarketController } from '../../../../common/controllers';
import { AsterFuturesMarketService } from '../services/futures-market.service';

@ApiTags('aster-futures')
@ApiKeyAuth()
@Controller('aster/futures/market')
export class AsterFuturesMarketController extends BaseFuturesMarketController {
  protected readonly logger = new Logger(AsterFuturesMarketController.name);
  protected readonly marketService: AsterFuturesMarketService;

  constructor(marketService: AsterFuturesMarketService) {
    super();
    this.marketService = marketService;
  }

  // All standard endpoints are inherited from BaseFuturesMarketController
  // Add Aster-specific endpoints here if needed
}
