import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AsterModule } from './aster/aster.module';
import { HyperliquidModule } from './hyperliquid/hyperliquid.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { appConfig, asterConfig, hyperliquidConfig, tradingConfig } from './config';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: '.env',
			load: [appConfig, asterConfig, hyperliquidConfig, tradingConfig],
		}),
		ScheduleModule.forRoot(),
		AsterModule,
		HyperliquidModule,
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule { }