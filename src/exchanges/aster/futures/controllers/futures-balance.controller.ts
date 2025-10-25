import { Controller, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiKeyAuth } from '../../../../common/decorators/api-key.decorator';
import { BaseFuturesBalanceController } from '../../../../common/controllers';
import { AsterFuturesBalanceService } from '../services/futures-balance.service';

@ApiTags('aster-futures')
@ApiKeyAuth()
@Controller('aster/futures/balance')
export class AsterFuturesBalanceController extends BaseFuturesBalanceController {
  protected readonly logger = new Logger(AsterFuturesBalanceController.name);
  protected readonly balanceService: AsterFuturesBalanceService;

  constructor(balanceService: AsterFuturesBalanceService) {
    super();
    this.balanceService = balanceService;
  }

  // All standard endpoints are inherited from BaseFuturesBalanceController
  // Add Aster-specific endpoints here if needed
}
