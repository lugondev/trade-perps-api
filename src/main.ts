import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	// Enable validation
	app.useGlobalPipes(new ValidationPipe({
		transform: true,
		whitelist: true,
		forbidNonWhitelisted: true,
	}));

	// Enable CORS
	app.enableCors({
		origin: ['http://localhost:3000', 'http://localhost:3001'],
		credentials: true,
	});

	// Swagger documentation
	const config = new DocumentBuilder()
		.setTitle('Aster DEX Trading Bot API')
		.setDescription('NestJS API for Aster DEX trading operations')
		.setVersion('1.0')
		.addApiKey(
			{
				type: 'apiKey',
				name: 'X-API-Key',
				in: 'header',
				description: 'API Key for accessing protected endpoints',
			},
			'api-key',
		)
		.addBearerAuth()
		.build();

	const document = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup('api', app, document, {
		swaggerOptions: {
			persistAuthorization: true, // Keep authorization after page refresh
		},
	});

	const port = process.env.PORT || 3000;
	await app.listen(port);

	console.log(`🚀 Application is running on: http://localhost:${port}`);
	console.log(`📚 Swagger docs available at: http://localhost:${port}/api`);
	console.log(`🔐 API Key authentication required for /aster/* endpoints`);
}

bootstrap();