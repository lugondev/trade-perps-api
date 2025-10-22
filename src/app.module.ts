import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AsterModule } from './aster/aster.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { appConfig, asterConfig, tradingConfig } from './config';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: '.env',
			load: [appConfig, asterConfig, tradingConfig],
		}),
		ScheduleModule.forRoot(),
		AsterModule,
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule { }