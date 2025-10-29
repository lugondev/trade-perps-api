import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { appConfig, asterConfig, hyperliquidConfig, tradingConfig } from './config';

// New architecture modules
import { CommonModule } from './common/common.module';
import { ExchangesModule } from './exchanges/exchanges.module';
import { ApiModule } from './api/api.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [appConfig, asterConfig, hyperliquidConfig, tradingConfig],
    }),
    ScheduleModule.forRoot(),

    // New architecture
    CommonModule,
    ExchangesModule,
    ApiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
