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

## Project Structure

```text
src/
├── aster/                    # Aster DEX integration
│   ├── controllers/          # REST API controllers
│   ├── services/             # Business logic services
│   │   ├── aster-api.service.ts
│   │   ├── balance.service.ts
│   │   ├── trading.service.ts
│   │   ├── history.service.ts
│   │   ├── market-data.service.ts
│   │   └── aster-websocket.service.ts
│   ├── types/                # TypeScript type definitions
│   └── aster.module.ts       # Module configuration
├── hyperliquid/              # Hyperliquid integration
│   ├── controllers/          # REST API controllers
│   ├── services/             # Business logic services
│   │   ├── hyperliquid-api.service.ts
│   │   ├── balance.service.ts
│   │   ├── trading.service.ts
│   │   ├── history.service.ts
│   │   └── market-data.service.ts
│   ├── types/                # TypeScript type definitions
│   └── hyperliquid.module.ts # Module configuration
├── common/                   # Shared utilities
│   ├── decorators/           # Custom decorators
│   └── guards/               # Authentication guards
├── config/                   # Configuration files
│   ├── app.config.ts
│   ├── aster.config.ts
│   ├── hyperliquid.config.ts
│   └── trading.config.ts
├── app.module.ts             # Main application module
└── main.ts                   # Application entry point
```

## Configuration

### Environment Variables

| Variable           | Description                          | Default                    |
| ------------------ | ------------------------------------ | -------------------------- |
| `ASTER_API_KEY`    | Your Aster DEX API key               | Required                   |
| `ASTER_API_SECRET` | Your Aster DEX API secret            | Required                   |
| `ASTER_REST_URL`   | Aster REST API base URL              | `https://api.asterdex.com` |
| `ASTER_WS_URL`     | Aster WebSocket URL                  | `wss://ws.asterdex.com`    |
| `NODE_ENV`         | Environment (development/production) | `development`              |
| `PORT`             | Application port                     | `3000`                     |
| `LOG_LEVEL`        | Logging level                        | `debug`                    |

### API Authentication

The bot uses HMAC SHA256 signature authentication:

1. Combines HTTP method, path, query string, body, and timestamp
2. Signs with your API secret using HMAC SHA256
3. Includes signature in `X-SIGNATURE` header

## Error Handling

The application includes comprehensive error handling:

- **Network Errors**: Automatic retry with exponential backoff
- **API Errors**: Structured error responses with error codes
- **Validation Errors**: Input validation with detailed error messages
- **WebSocket Errors**: Automatic reconnection with subscription restoration

## Security Features

- **Environment Variables**: Sensitive data stored in environment variables
- **HMAC Authentication**: Secure API authentication with signatures
- **Input Validation**: Comprehensive input validation and sanitization
- **Rate Limiting**: Built-in protection against API rate limits
- **Error Sanitization**: Sensitive information removed from error logs

## Development

### Scripts

```bash
# Development
pnpm start:dev          # Start with hot reload
pnpm build              # Build for production
pnpm start:prod         # Start production build

# Testing
pnpm test               # Run unit tests
pnpm test:watch         # Run tests in watch mode
pnpm test:cov           # Generate coverage report

# Code Quality
pnpm lint               # Run ESLint
pnpm format             # Format code with Prettier
```

### Adding New Features

1. Create new service in `src/aster/services/`
2. Add types to `src/aster/types/index.ts`
3. Update controller in `src/aster/controllers/`
4. Add to module exports in `src/aster/aster.module.ts`

## Monitoring & Logging

The application uses structured logging with different levels:

- **Error**: System errors and failures
- **Warn**: Non-critical issues and warnings
- **Info**: General application information
- **Debug**: Detailed debugging information

Logs include contextual information like request IDs, user sessions, and operation metadata.

## Troubleshooting

### Common Issues

1. **Connection Failed**: Check API credentials and network connectivity
2. **Invalid Signature**: Verify API secret and timestamp synchronization
3. **Rate Limited**: Implement exponential backoff and reduce request frequency
4. **WebSocket Disconnects**: Check network stability and firewall settings

### Debug Mode

Enable debug logging by setting `LOG_LEVEL=debug` in your `.env` file.

## Support

For issues and questions:

1. Check the [Swagger documentation](http://localhost:3000/api) for API details
2. Review logs for error messages and debugging information
3. Verify API credentials and network connectivity

## License

MIT License - see LICENSE file for details.

---

---

**⚠️ Important**: This is a trading bot that can place real orders and spend real money. Always test thoroughly in a development environment before using with real funds. Use at your own risk.
