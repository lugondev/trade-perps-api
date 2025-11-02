import { Injectable, Logger } from '@nestjs/common';
import { OkxApiService } from '../../shared/okx-api.service';

@Injectable()
export class OkxPerpetualBalanceService {
  private readonly logger = new Logger(OkxPerpetualBalanceService.name);

  constructor(private readonly apiService: OkxApiService) {}

  /**
   * Get account configuration
   */
  async getAccountConfig(): Promise<any> {
    try {
      this.logger.log('Fetching OKX account configuration...');

      const response = await this.apiService.get('/api/v5/account/config');

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch account config');
      }

      const config = response.data[0];

      this.logger.log('Account Config:');
      this.logger.log(`- Account Level: ${config.acctLv}`);
      this.logger.log(`- Position Mode: ${config.posMode}`);
      this.logger.log(`- Auto Loan: ${config.autoLoan}`);
      this.logger.log(`- Greeks Type: ${config.greeksType}`);
      this.logger.log(`- Account Role: ${config.roleType}`);

      return {
        success: true,
        data: config,
      };
    } catch (error: any) {
      this.logger.error('Error fetching account config:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get account balance information
   */
  async getBalance(): Promise<any> {
    try {
      this.logger.log('Fetching OKX account balance...');

      const response = await this.apiService.get('/api/v5/account/balance');

      if (!response.success || !response.data || response.data.length === 0) {
        throw new Error(response.error || 'Failed to fetch balance');
      }

      const accountData = response.data[0];

      return {
        success: true,
        data: {
          totalEq: parseFloat(accountData.totalEq),
          isoEq: parseFloat(accountData.isoEq),
          adjEq: parseFloat(accountData.adjEq),
          upl: parseFloat(accountData.upl),
          details: accountData.details.map((detail: any) => ({
            ccy: detail.ccy,
            eq: parseFloat(detail.eq),
            availBal: parseFloat(detail.availBal),
            upl: parseFloat(detail.upl),
            frozenBal: parseFloat(detail.frozenBal),
          })),
        },
      };
    } catch (error: any) {
      this.logger.error('Error fetching balance:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get positions
   */
  async getPositions(instId?: string): Promise<any> {
    try {
      this.logger.log('Fetching OKX positions...');

      const params = instId ? { instId } : {};
      const response = await this.apiService.get('/api/v5/account/positions', params);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch positions');
      }

      const positions = response.data.map((pos: any) => ({
        instId: pos.instId,
        posId: pos.posId,
        posSide: pos.posSide,
        pos: parseFloat(pos.pos),
        availPos: parseFloat(pos.availPos),
        avgPx: parseFloat(pos.avgPx),
        upl: parseFloat(pos.upl),
        uplRatio: parseFloat(pos.uplRatio),
        lever: parseFloat(pos.lever),
        liqPx: parseFloat(pos.liqPx),
        markPx: parseFloat(pos.markPx),
        margin: parseFloat(pos.margin),
        mgnRatio: parseFloat(pos.mgnRatio),
        notionalUsd: parseFloat(pos.notionalUsd),
      }));

      return {
        success: true,
        data: positions,
      };
    } catch (error: any) {
      this.logger.error('Error fetching positions:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Transfer funds between accounts
   * @param ccy - Currency (e.g., 'USDT')
   * @param amt - Transfer amount
   * @param from - Source account ('6' for Funding)
   * @param to - Destination account ('18' for Trading)
   */
  async transferFunds(
    ccy: string,
    amt: number,
    from: string = '6',
    to: string = '18',
  ): Promise<any> {
    try {
      this.logger.log(`Transferring ${amt} ${ccy} from ${from} to ${to}...`);

      const response = await this.apiService.post('/api/v5/asset/transfer', {
        ccy,
        amt: amt.toString(),
        from,
        to,
        type: '0', // 0: transfer within account
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to transfer funds');
      }

      this.logger.log(`✅ Transfer successful: ${response.data[0]?.transId || 'OK'}`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      this.logger.error('Error transferring funds:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
