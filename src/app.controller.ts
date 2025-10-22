import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';

@ApiTags('health')
@Controller()
@Public() // Make all routes in this controller public (no API key required)
export class AppController {
	constructor(private readonly appService: AppService) { }

	@Get()
	@ApiOperation({ summary: 'Health check endpoint' })
	@ApiResponse({ status: 200, description: 'Service is healthy' })
	getHello(): string {
		return this.appService.getHello();
	}

	@Get('status')
	@ApiOperation({ summary: 'Get application status' })
	@ApiResponse({ status: 200, description: 'Application status' })
	getStatus() {
		return {
			status: 'running',
			timestamp: new Date().toISOString(),
			version: '1.0.0',
			environment: process.env.NODE_ENV || 'development',
		};
	}
}