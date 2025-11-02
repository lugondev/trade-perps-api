import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Enable CORS
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Multi-Exchange Perpetual Futures Trading Bot API')
    .setDescription(
      'Unified API for trading perpetual futures across multiple exchanges:\n\n' +
        '**Supported Exchanges:**\n' +
        '- ✅ Aster DEX (Orderly Network)\n' +
        '- ✅ Hyperliquid\n' +
        '- ✅ Binance Futures\n' +
        '- ✅ OKX\n\n' +
        '**Features:**\n' +
        '- Unified API interface across all exchanges\n' +
        '- Market & Limit orders\n' +
        '- Position management\n' +
        '- Real-time market data\n' +
        '- Testnet/Simulated trading support\n\n' +
        '**Authentication:**\n' +
        '- API Key authentication via X-API-Key header\n' +
        '- Exchange-specific credentials configured via environment variables',
    )
    .setVersion('2.0')
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
    .addTag('Trading API', 'Order placement, position management, and trading operations')
    .addTag('Balance API', 'Account balance, positions, and PnL information')
    .addTag('Market API', 'Market data, prices, order books, and statistics')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Keep authorization after page refresh
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`📚 Swagger docs available at: http://localhost:${port}/api`);
  logger.log(`🔐 API Key authentication required for protected endpoints`);
  logger.log(`💱 Exchanges: Aster, Hyperliquid, Binance, OKX`);
}

bootstrap();
