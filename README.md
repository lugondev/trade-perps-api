# Aster DEX Trading Bot

A sophisticated NestJS-based trading bot for Aster DEX with comprehensive features for balance checking, trade history, and automated trading.

## Features

- ✅ **Balance Management**: Check account balances, portfolio value, and asset allocations
- ✅ **Trading Operations**: Place market/limit orders, manage positions, cancel orders
- ✅ **History & Analytics**: View trade history, P&L reports, and trading statistics
- ✅ **WebSocket Integration**: Real-time market data and order updates
- ✅ **REST API**: Full REST API with Swagger documentation
- ✅ **Type Safety**: Complete TypeScript implementation with proper types
- ✅ **Error Handling**: Comprehensive error handling and logging
- ✅ **Authentication**: Secure API key/secret authentication with HMAC signatures

## Quick Start

### 1. Installation

```bash
# Install dependencies
pnpm install

# Or using npm
npm install
```

### 2. Configuration

Update the `.env` file with your Aster DEX API credentials:

```env
# Aster DEX API Configuration
ASTER_API_KEY=your_api_key_here
ASTER_API_SECRET=your_api_secret_here

# API URLs (update with actual Aster endpoints)
ASTER_REST_URL=https://api.asterdex.com
ASTER_WS_URL=wss://ws.asterdex.com

# Application settings
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
```

### 3. Start the Application

```bash
# Development mode with hot reload
pnpm start:dev

# Production mode
pnpm build
pnpm start:prod
```

The application will be available at:
- **API**: http://localhost:3000
- **Swagger Documentation**: http://localhost:3000/api

## API Endpoints

### Balance Endpoints

- `GET /aster/balance` - Get all account balances
- `GET /aster/balance/:asset` - Get balance for specific asset
- `GET /aster/balance/non-zero` - Get non-zero balances only
- `GET /aster/portfolio/value` - Get total portfolio value

### Trading Endpoints

- `POST /aster/orders` - Place a new order
- `DELETE /aster/orders/:orderId` - Cancel an order
- `GET /aster/orders/:orderId` - Get order details
- `GET /aster/orders/open` - Get all open orders
- `DELETE /aster/orders` - Cancel all open orders

#### Quick Trading Endpoints

- `POST /aster/orders/market-buy` - Place market buy order
- `POST /aster/orders/market-sell` - Place market sell order
- `POST /aster/orders/limit-buy` - Place limit buy order
- `POST /aster/orders/limit-sell` - Place limit sell order

### History Endpoints

- `GET /aster/history/trades` - Get trade history with pagination
- `GET /aster/history/orders` - Get order history with pagination
- `GET /aster/history/trades/:symbol/recent` - Get recent trades for symbol
- `GET /aster/stats/:symbol` - Get trading statistics for symbol
- `GET /aster/pnl` - Get P&L report
- `GET /aster/export/trades` - Export trade history as CSV

### WebSocket Endpoints

- `POST /aster/websocket/connect` - Connect to WebSocket
- `POST /aster/websocket/disconnect` - Disconnect from WebSocket
- `POST /aster/websocket/subscribe/ticker/:symbol` - Subscribe to ticker updates
- `POST /aster/websocket/subscribe/orderbook/:symbol` - Subscribe to order book updates
- `GET /aster/websocket/status` - Get WebSocket connection status

## Usage Examples

### Check Account Balances

```bash
# Get all balances
curl http://localhost:3000/aster/balance

# Get BTC balance
curl http://localhost:3000/aster/balance/BTC

# Get non-zero balances
curl http://localhost:3000/aster/balance/non-zero
```

### Place Orders

```bash
# Market buy order
curl -X POST http://localhost:3000/aster/orders/market-buy \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCUSDT",
    "quantity": "0.001"
  }'

# Limit sell order
curl -X POST http://localhost:3000/aster/orders/limit-sell \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCUSDT",
    "quantity": "0.001",
    "price": "45000.00"
  }'
```

### Get Trading History

```bash
# Get trade history
curl "http://localhost:3000/aster/history/trades?symbol=BTCUSDT&limit=50"

# Get P&L report for last 30 days
curl "http://localhost:3000/aster/pnl?days=30"

# Get trading statistics
curl http://localhost:3000/aster/stats/BTCUSDT
```

### WebSocket Integration

```bash
# Connect to WebSocket
curl -X POST http://localhost:3000/aster/websocket/connect

# Subscribe to ticker updates
curl -X POST http://localhost:3000/aster/websocket/subscribe/ticker/BTCUSDT

# Subscribe to order book
curl -X POST http://localhost:3000/aster/websocket/subscribe/orderbook/BTCUSDT
```

## Project Structure

```
src/
├── aster/                  # Aster DEX integration module
│   ├── controllers/        # REST API controllers
│   ├── services/          # Business logic services
│   │   ├── aster-api.service.ts      # Core API client
│   │   ├── balance.service.ts        # Balance operations
│   │   ├── trading.service.ts        # Trading operations
│   │   ├── history.service.ts        # History & analytics
│   │   └── aster-websocket.service.ts # WebSocket client
│   ├── types/             # TypeScript type definitions
│   └── aster.module.ts    # Module configuration
├── app.module.ts          # Main application module
└── main.ts               # Application entry point
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ASTER_API_KEY` | Your Aster DEX API key | Required |
| `ASTER_API_SECRET` | Your Aster DEX API secret | Required |
| `ASTER_REST_URL` | Aster REST API base URL | `https://api.asterdex.com` |
| `ASTER_WS_URL` | Aster WebSocket URL | `wss://ws.asterdex.com` |
| `NODE_ENV` | Environment (development/production) | `development` |
| `PORT` | Application port | `3000` |
| `LOG_LEVEL` | Logging level | `debug` |

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

**⚠️ Important**: This is a trading bot that can place real orders and spend real money. Always test thoroughly in a development environment before using with real funds. Use at your own risk.