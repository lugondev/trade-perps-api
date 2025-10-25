import { Controller, Post, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiKeyAuth } from '../../../../common/decorators/api-key.decorator';
import { BaseFuturesTradingController } from '../../../../common/controllers';
import { QuickLongShortDto } from '../../../../common/dto';
import { AsterFuturesTradingService } from '../services/futures-trading.service';

@ApiTags('aster-futures')
@ApiKeyAuth()
@Controller('aster/futures/trading')
export class AsterFuturesTradingController extends BaseFuturesTradingController {
  protected readonly logger = new Logger(AsterFuturesTradingController.name);
  protected readonly tradingService: AsterFuturesTradingService;

  constructor(tradingService: AsterFuturesTradingService) {
    super();
    this.tradingService = tradingService;
  }

  // ==================== Aster-specific Quick Trading ====================
  // These methods use Aster's custom implementation with SL/TP automation

  @Post('quick-long')
  @ApiOperation({ summary: 'Quick LONG position with SL/TP (Aster-specific)' })
  @ApiResponse({ status: 201, description: 'Long position opened with SL/TP' })
  async quickLong(@Body() dto: QuickLongShortDto) {
    return this.tradingService.quickLong(
      dto.symbol,
      dto.usdValue,
      dto.stopLossPercent,
      dto.takeProfitPercent,
      dto.leverage,
    );
  }

  @Post('quick-short')
  @ApiOperation({ summary: 'Quick SHORT position with SL/TP (Aster-specific)' })
  @ApiResponse({ status: 201, description: 'Short position opened with SL/TP' })
  async quickShort(@Body() dto: QuickLongShortDto) {
    return this.tradingService.quickShort(
      dto.symbol,
      dto.usdValue,
      dto.stopLossPercent,
      dto.takeProfitPercent,
      dto.leverage,
    );
  }
}
