# Perps Vibe AI - Multi-Exchange Perpetual Futures Trading Platform

A sophisticated NestJS-based trading platform with **Unified API Architecture** supporting multiple perpetual futures exchanges including Aster DEX, Hyperliquid, Binance Futures, and OKX Perpetuals.

## 🎯 Architecture Highlights

- ✅ **Unified API**: Single set of endpoints serving all exchanges
- ✅ **Factory Pattern**: Dynamic service resolution at runtime via Exchange Factory
- ✅ **Interface-Driven**: Clean separation between interfaces and implementations
- ✅ **Type-Safe**: Full TypeScript with strict mode enabled
- ✅ **Modular Design**: Each exchange is a self-contained module
- ✅ **Plug & Play**: Add new exchanges by implementing standard interfaces

## 🏢 Supported Exchanges

- ✅ **Aster DEX**: Decentralized perpetual futures (with WebSocket support)
- ✅ **Hyperliquid**: On-chain perpetual futures (with WebSocket support)
- ✅ **Binance Futures**: Centralized perpetual futures
- ✅ **OKX Perpetuals**: Centralized perpetual futures

## 💡 Core Features

- ✅ **Trading Operations**: Market/limit orders, position management, leverage control
- ✅ **Risk Management**: Stop-loss, take-profit, margin management
- ✅ **Balance & Portfolio**: Real-time balance tracking, P&L calculation, portfolio value
- ✅ **Market Data**: Real-time prices, orderbook depth, historical candles, funding rates
- ✅ **Symbol Normalization**: Automatic symbol format conversion across exchanges

## 🔧 Technical Features

- ✅ **REST API**: Comprehensive Swagger documentation at `/api`
- ✅ **WebSocket Support**: Real-time market data and account updates
- ✅ **Authentication**: API Key guard for secure access
- ✅ **Error Handling**: Standardized error responses
- ✅ **Clean Architecture**: Modular, testable, maintainable codebase

## 📦 Quick Start

### 1. Installation

```bash
# Install dependencies
pnpm install
```

### 2. Configuration

Create a `.env` file in the root directory with your exchange API credentials:

```env
# Application Settings
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# API Access Control (REQUIRED!)
# This key protects all endpoints
API_KEY_ACCESS=your_secure_api_key_here

# Aster DEX Configuration
ASTER_API_KEY=your_aster_api_key
ASTER_API_SECRET=your_aster_api_secret
ASTER_USER_ADDRESS=your_wallet_address
ASTER_SIGNER_ADDRESS=your_signer_address
ASTER_PRIVATE_KEY=your_private_key
ASTER_REST_URL=https://fapi.asterdex.com
ASTER_WS_URL=wss://fstream.asterdex.com

# Hyperliquid Configuration
HYPERLIQUID_REST_URL=https://api.hyperliquid.xyz
HYPERLIQUID_WS_URL=wss://api.hyperliquid.xyz/ws
HYPERLIQUID_WALLET_ADDRESS=your_wallet_address
HYPERLIQUID_PRIVATE_KEY=your_private_key
HYPERLIQUID_TESTNET=false

# Binance Futures Configuration (Optional)
BINANCE_API_KEY=your_binance_api_key
BINANCE_API_SECRET=your_binance_api_secret
BINANCE_REST_URL=https://fapi.binance.com
BINANCE_TESTNET=false

# OKX Perpetuals Configuration (Optional)
OKX_API_KEY=your_okx_api_key
OKX_API_SECRET=your_okx_api_secret
OKX_PASSPHRASE=your_okx_passphrase
OKX_REST_URL=https://www.okx.com
OKX_TESTNET=false
```

**Security Note:** The `API_KEY_ACCESS` is required in the `X-API-Key` header for all requests to protected endpoints.

### 3. Start the Application

```bash
# Development mode with hot reload
pnpm start:dev

# Production mode
pnpm build
pnpm start:prod
```

The application will be available at:

- **API**: <http://localhost:3000>
- **Swagger Documentation**: <http://localhost:3000/api>

## 🔐 API Authentication

All trading endpoints require API key authentication using the `X-API-Key` header.

**Required Header:**

```http
X-API-Key: your_api_key_access_here
```

### Using Swagger UI

1. Open <http://localhost:3000/api>
2. Click the **"Authorize"** button (lock icon) at the top
3. Enter your `API_KEY_ACCESS` from `.env` file
4. Click **"Authorize"** and **"Close"**
5. Now you can test all endpoints directly in the browser

### Using curl

```bash
curl -H "X-API-Key: your_api_key_access_here" \
  http://localhost:3000/balance?exchange=aster
```

## 📡 Unified API Endpoints

All endpoints follow a unified pattern: `/{resource}?exchange={exchange_name}`

### Balance Endpoints

- `GET /balance?exchange={exchange}` - Get account balance and positions
- `GET /balance/portfolio?exchange={exchange}` - Get portfolio summary
- `GET /balance/positions?exchange={exchange}` - Get all open positions
- `GET /balance/position?exchange={exchange}&symbol={symbol}` - Get specific position

**Example:**

```bash
# Get Aster balance
curl -H "X-API-Key: your_key" \
  "http://localhost:3000/balance?exchange=aster"

# Get Hyperliquid positions
curl -H "X-API-Key: your_key" \
  "http://localhost:3000/balance/positions?exchange=hyperliquid"
```

### Market Data Endpoints

- `GET /market/symbols?exchange={exchange}` - Get all tradable symbols
- `GET /market/ticker?exchange={exchange}&symbol={symbol}` - Get 24hr ticker
- `GET /market/orderbook?exchange={exchange}&symbol={symbol}` - Get order book
- `GET /market/trades?exchange={exchange}&symbol={symbol}` - Get recent trades
- `GET /market/candles?exchange={exchange}&symbol={symbol}&interval={interval}` - Get klines/candles
- `GET /market/funding?exchange={exchange}&symbol={symbol}` - Get funding rate history

**Example:**

```bash
# Get BTC ticker from Binance
curl -H "X-API-Key: your_key" \
  "http://localhost:3000/market/ticker?exchange=binance&symbol=BTC-USDT"

# Get ETH orderbook from Hyperliquid
curl -H "X-API-Key: your_key" \
  "http://localhost:3000/market/orderbook?exchange=hyperliquid&symbol=ETH-USD"
```

### Trading Endpoints

- `POST /trading/order/market` - Place market order
- `POST /trading/order/limit` - Place limit order
- `POST /trading/order/cancel` - Cancel order
- `POST /trading/order/cancel-all` - Cancel all orders
- `GET /trading/orders?exchange={exchange}` - Get open orders
- `POST /trading/leverage` - Set leverage
- `POST /trading/position/close` - Close position

**Market Order Example:**

```bash
curl -X POST -H "X-API-Key: your_key" \
  -H "Content-Type: application/json" \
  "http://localhost:3000/trading/order/market" \
  -d '{
    "exchange": "aster",
    "symbol": "BTC-USDT",
    "side": "BUY",
    "quantity": 0.001
  }'
```

**Limit Order Example:**

```bash
curl -X POST -H "X-API-Key: your_key" \
  -H "Content-Type: application/json" \
  "http://localhost:3000/trading/order/limit" \
  -d '{
    "exchange": "hyperliquid",
    "symbol": "ETH-USD",
    "side": "SELL",
    "quantity": 0.1,
    "price": 3500
  }'
```

**Close Position Example:**

```bash
curl -X POST -H "X-API-Key: your_key" \
  -H "Content-Type: application/json" \
  "http://localhost:3000/trading/position/close" \
  -d '{
    "exchange": "binance",
    "symbol": "BTC-USDT"
  }'
```

## 🏗️ Project Structure

```text
src/
├── api/                          # Unified API Layer
│   ├── controllers/              # REST API Controllers
│   │   ├── balance.controller.ts    # Balance & portfolio endpoints
│   │   ├── market.controller.ts     # Market data endpoints
│   │   └── trading.controller.ts    # Trading endpoints
│   └── api.module.ts             # API module configuration
│
├── common/                       # Shared Utilities
│   ├── decorators/               # Custom decorators
│   │   ├── api-key.decorator.ts     # API key extraction
│   │   └── public.decorator.ts      # Public endpoint marker
│   ├── dto/                      # Data Transfer Objects
│   │   ├── exchange.dto.ts          # Exchange selection DTOs
│   │   └── trading.dto.ts           # Trading operation DTOs
│   ├── factory/                  # Factory Pattern
│   │   └── exchange.factory.ts      # Dynamic service resolution
│   ├── guards/                   # Authentication Guards
│   │   └── api-key.guard.ts         # API key validation
│   ├── interfaces/               # Standard Interfaces
│   │   ├── balance.interface.ts     # Balance operations
│   │   ├── market.interface.ts      # Market data operations
│   │   └── trading.interface.ts     # Trading operations
│   ├── middleware/               # HTTP Middleware
│   │   └── symbol-normalizer.middleware.ts  # Symbol format conversion
│   ├── services/                 # Common Services
│   │   └── symbol-normalizer.service.ts     # Symbol normalization logic
│   └── types/                    # Type Definitions
│       └── exchange.types.ts        # Exchange enums and types
│
├── exchanges/                    # Exchange Integrations
│   ├── aster/                    # Aster DEX
│   │   ├── perpetual/
│   │   │   ├── services/
│   │   │   │   ├── perpetual-balance.service.ts
│   │   │   │   ├── perpetual-market.service.ts
│   │   │   │   └── perpetual-trading.service.ts
│   │   │   └── perpetual.module.ts
│   │   ├── shared/
│   │   │   ├── aster-api.service.ts      # REST API client
│   │   │   └── aster-websocket.service.ts # WebSocket client
│   │   ├── types/                         # Type definitions
│   │   └── aster.module.ts
│   │
│   ├── hyperliquid/              # Hyperliquid
│   │   ├── perp/
│   │   │   ├── services/
│   │   │   │   ├── balance.service.ts
│   │   │   │   ├── market-data.service.ts
│   │   │   │   ├── order-management.service.ts
│   │   │   │   └── order-placement.service.ts
│   │   │   └── perp.module.ts
│   │   ├── shared/
│   │   │   ├── hyperliquid-api.service.ts # REST API client
│   │   │   └── signing.service.ts         # Signature generation
│   │   ├── types/
│   │   └── hyperliquid.module.ts
│   │
│   ├── binance/                  # Binance Futures
│   │   ├── perpetual/
│   │   │   ├── services/
│   │   │   │   ├── perpetual-balance.service.ts
│   │   │   │   ├── perpetual-market.service.ts
│   │   │   │   └── perpetual-trading.service.ts
│   │   │   └── perpetual.module.ts
│   │   ├── shared/
│   │   │   └── binance-api.service.ts
│   │   ├── types/
│   │   └── binance.module.ts
│   │
│   ├── okx/                      # OKX Perpetuals
│   │   ├── perpetual/
│   │   │   ├── services/
│   │   │   │   ├── perpetual-balance.service.ts
│   │   │   │   ├── perpetual-market.service.ts
│   │   │   │   └── perpetual-trading.service.ts
│   │   │   └── perpetual.module.ts
│   │   ├── shared/
│   │   │   └── okx-api.service.ts
│   │   ├── types/
│   │   └── okx.module.ts
│   │
│   └── exchanges.module.ts       # Exchanges module aggregator
│
├── config/                       # Configuration Files
│   ├── app.config.ts             # App settings
│   ├── aster.config.ts           # Aster configuration
│   ├── binance.config.ts         # Binance configuration
│   ├── hyperliquid.config.ts     # Hyperliquid configuration
│   ├── okx.config.ts             # OKX configuration
│   └── trading.config.ts         # Trading settings
│
├── app.module.ts                 # Root module
└── main.ts                       # Application entry point
```

## 🔌 Architecture Overview

### Unified API Pattern

Instead of separate endpoints per exchange, we use a unified pattern:

```text
Traditional Approach (Bad):
- /aster/balance
- /hyperliquid/balance
- /binance/balance
- /okx/balance
→ 4 exchanges × 50 operations = 200 endpoints!

Unified Approach (Good):
- /balance?exchange=aster
- /balance?exchange=hyperliquid
- /balance?exchange=binance
- /balance?exchange=okx
→ 50 endpoints serving all exchanges
```

### Exchange Factory Pattern

The `ExchangeFactory` dynamically resolves the correct service based on the exchange parameter:

```typescript
// Client request
GET /balance?exchange=aster

// Factory resolves
ExchangeFactory → AsterPerpetualBalanceService → Execute

// Client request
GET /balance?exchange=hyperliquid

// Factory resolves
ExchangeFactory → HyperliquidBalanceService → Execute
```

### Interface-Driven Design

All exchange implementations follow standard interfaces:

- `IBalanceService`: Balance and portfolio operations
- `IMarketDataService`: Market data operations
- `ITradingService`: Trading operations

This ensures:

- **Consistency**: All exchanges work the same way
- **Testability**: Easy to mock and test
- **Maintainability**: Changes in one place affect all exchanges
- **Extensibility**: New exchanges just implement interfaces

### Symbol Normalization

Each exchange uses different symbol formats:

- Aster: `BTCUSDT`
- Hyperliquid: `BTC`
- Binance: `BTCUSDT`
- OKX: `BTC-USDT-SWAP`

The `SymbolNormalizerMiddleware` automatically converts symbols:

```text
Client → "BTC-USDT" → Middleware → "BTCUSDT" (Aster)
Client → "BTC-USDT" → Middleware → "BTC" (Hyperliquid)
Client → "BTC-USDT" → Middleware → "BTC-USDT-SWAP" (OKX)
```

## ⚙️ Configuration

### Environment Variables

| Variable         | Description                         | Required | Default       |
| ---------------- | ----------------------------------- | -------- | ------------- |
| `API_KEY_ACCESS` | API key for endpoint authentication | Yes      | -             |
| `PORT`           | Application port                    | No       | `3000`        |
| `NODE_ENV`       | Environment mode                    | No       | `development` |
| `LOG_LEVEL`      | Logging level                       | No       | `debug`       |

**Aster DEX:**

| Variable               | Description      | Required |
| ---------------------- | ---------------- | -------- |
| `ASTER_API_KEY`        | Aster API key    | Yes      |
| `ASTER_API_SECRET`     | Aster API secret | Yes      |
| `ASTER_USER_ADDRESS`   | Wallet address   | Yes      |
| `ASTER_SIGNER_ADDRESS` | Signer address   | Yes      |
| `ASTER_PRIVATE_KEY`    | Private key      | Yes      |
| `ASTER_REST_URL`       | REST API URL     | No       |
| `ASTER_WS_URL`         | WebSocket URL    | No       |

**Hyperliquid:**

| Variable                     | Description    | Required |
| ---------------------------- | -------------- | -------- |
| `HYPERLIQUID_WALLET_ADDRESS` | Wallet address | Yes      |
| `HYPERLIQUID_PRIVATE_KEY`    | Private key    | Yes      |
| `HYPERLIQUID_REST_URL`       | REST API URL   | No       |
| `HYPERLIQUID_WS_URL`         | WebSocket URL  | No       |
| `HYPERLIQUID_TESTNET`        | Use testnet    | No       |

**Binance Futures:**

| Variable             | Description        | Required |
| -------------------- | ------------------ | -------- |
| `BINANCE_API_KEY`    | Binance API key    | Yes      |
| `BINANCE_API_SECRET` | Binance API secret | Yes      |
| `BINANCE_REST_URL`   | REST API URL       | No       |
| `BINANCE_TESTNET`    | Use testnet        | No       |

**OKX Perpetuals:**

| Variable         | Description    | Required |
| ---------------- | -------------- | -------- |
| `OKX_API_KEY`    | OKX API key    | Yes      |
| `OKX_API_SECRET` | OKX API secret | Yes      |
| `OKX_PASSPHRASE` | OKX passphrase | Yes      |
| `OKX_REST_URL`   | REST API URL   | No       |
| `OKX_TESTNET`    | Use testnet    | No       |

## 🧪 Development

### Available Scripts

```bash
# Development
pnpm start:dev          # Start with hot reload
pnpm build              # Build for production
pnpm start:prod         # Start production build

# Testing
pnpm test               # Run unit tests
pnpm test:watch         # Run tests in watch mode
pnpm test:cov           # Generate coverage report
pnpm test:e2e           # Run end-to-end tests

# Code Quality
pnpm lint               # Run ESLint
pnpm format             # Format code with Prettier
```

### Adding a New Exchange

To add support for a new exchange:

1. **Create exchange module structure:**

   ```bash
   mkdir -p src/exchanges/newexchange/perpetual/services
   mkdir -p src/exchanges/newexchange/shared
   mkdir -p src/exchanges/newexchange/types
   ```

2. **Implement standard interfaces:**

   Create services implementing:
   - `IBalanceService` (balance operations)
   - `IMarketDataService` (market data)
   - `ITradingService` (trading operations)

3. **Create API service:**

   Implement REST API client in `shared/newexchange-api.service.ts`

4. **Define types:**

   Add exchange-specific types in `types/index.ts`

5. **Create configuration:**

   Add config in `src/config/newexchange.config.ts`

6. **Register in factory:**

   Add exchange to `ExchangeFactory` resolution logic

7. **Update exchange enum:**

   Add to `ExchangeName` enum in `common/types/exchange.types.ts`

8. **Test thoroughly:**

   Create unit tests for all services

## 🔒 Security Features

- **Environment Variables**: Sensitive data stored securely in `.env`
- **API Key Authentication**: All endpoints protected with API key guard
- **HMAC Signatures**: Secure API authentication for supported exchanges
- **Input Validation**: Comprehensive validation using class-validator
- **Rate Limiting**: Built-in protection against API rate limits
- **Error Sanitization**: Sensitive information removed from logs

## 📊 Monitoring & Logging

The application uses structured logging with contextual information:

- **Error**: System errors and critical failures
- **Warn**: Non-critical issues and warnings
- **Info**: General application information
- **Debug**: Detailed debugging information (set `LOG_LEVEL=debug`)

Logs include request IDs, exchange names, and operation metadata for easy troubleshooting.

## 🐛 Troubleshooting

### Common Issues

**Connection Failed:**

- Verify API credentials in `.env` file
- Check network connectivity
- Ensure exchange API is accessible

**Invalid Signature:**

- Verify API secret is correct
- Check system time synchronization
- Ensure timestamp is within acceptable range

**Rate Limited:**

- Reduce request frequency
- Implement exponential backoff
- Check exchange rate limit documentation

**Symbol Not Found:**

- Verify symbol format for the specific exchange
- Check if symbol is supported by the exchange
- Use `/market/symbols` endpoint to list available symbols

### Debug Mode

Enable detailed logging:

```bash
LOG_LEVEL=debug pnpm start:dev
```

## 📝 API Response Format

All API responses follow a standardized format:

**Success Response:**

```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Error Response:**

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "details": {}
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🚀 Deployment

### Docker Deployment

```bash
# Build image
docker build -t perps-vibe-ai .

# Run container
docker run -d \
  --name perps-vibe-ai \
  -p 3000:3000 \
  --env-file .env \
  perps-vibe-ai
```

### Cloud Run Deployment

```bash
# Deploy to Google Cloud Run
./scripts/deploy-cloudrun.sh
```

## 📚 Documentation

For detailed documentation, see the `.docs` folder:

- Architecture guides
- API authentication details
- Exchange-specific documentation
- Trading strategies
- WebSocket integration guides

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add tests for new features
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## ⚠️ Disclaimer

**Important:** This is a trading platform that can place real orders and spend real money. Always:

- Test thoroughly in testnet/sandbox environments
- Start with small amounts
- Implement proper risk management
- Monitor positions actively
- Use at your own risk

The developers are not responsible for any financial losses incurred while using this platform.
