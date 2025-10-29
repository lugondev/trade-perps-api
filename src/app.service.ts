import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Aster DEX Trading Bot API is running!';
  }
}
