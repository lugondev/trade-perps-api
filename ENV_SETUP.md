# Environment Configuration Guide

## Environment Files

Project này sử dụng các file environment riêng biệt cho từng môi trường:

- `.env` - Development (local)
- `.env.staging` - Staging environment
- `.env.production` - Production environment
- `.env.example` - Template file (safe to commit)

## File Structure

```
.env              # Local development (git ignored)
.env.staging      # Staging config (git ignored)
.env.production   # Production config (git ignored)
.env.example      # Template (committed to git)
```

## Deployment

### Deploy to Staging

```bash
./scripts/deploy-cloudrun.sh staging
```

Sử dụng credentials từ `.env.staging`:

- Service name: `perps-vibe-ai-staging`
- Aster API Key: `2f5ae9e9...` (staging credentials)

### Deploy to Production

```bash
./scripts/deploy-cloudrun.sh production
```

Sử dụng credentials từ `.env.production`:

- Service name: `perps-vibe-ai-production`
- Aster API Key: `62ae999c...` (production credentials)

### Default Deployment

```bash
./scripts/deploy-cloudrun.sh
```

Mặc định deploy to production.

## Environment Variables

### App Configuration

- `NODE_ENV` - Environment mode (development/staging/production)
- `PORT` - Server port (default: 8080)
- `LOG_LEVEL` - Logging level (debug/info/warn/error)
- `API_KEY_ACCESS` - API key for endpoint protection

### Aster Exchange

- `ASTER_API_KEY` - API key from Aster DEX
- `ASTER_API_SECRET` - API secret from Aster DEX
- `ASTER_USER_ADDRESS` - User wallet address
- `ASTER_SIGNER_ADDRESS` - Signer wallet address
- `ASTER_PRIVATE_KEY` - Private key for signing
- `ASTER_REST_URL` - REST API endpoint (default: https://api.orderly.network)
- `ASTER_WS_URL` - WebSocket endpoint

### Hyperliquid Exchange

- `HYPERLIQUID_USER_ADDRESS` - User wallet address
- `HYPERLIQUID_API_WALLET` - API wallet address
- `HYPERLIQUID_API_PRIVATE_KEY` - Private key for signing
- `HYPERLIQUID_REST_URL` - REST API endpoint (default: https://api.hyperliquid.xyz)
- `HYPERLIQUID_WS_URL` - WebSocket endpoint

### Binance Exchange

- `BINANCE_API_KEY` - Binance Futures API key
- `BINANCE_API_SECRET` - Binance Futures API secret
- `BINANCE_REST_URL` - REST API endpoint (default: https://fapi.binance.com)
- `BINANCE_WS_URL` - WebSocket endpoint
- `BINANCE_USE_TESTNET` - Use testnet (true/false)

### OKX Exchange

- `OKX_API_KEY` - OKX API key
- `OKX_API_SECRET` - OKX API secret
- `OKX_PASSPHRASE` - OKX API passphrase
- `OKX_REST_URL` - REST API endpoint (default: https://www.okx.com)
- `OKX_WS_URL` - WebSocket endpoint
- `OKX_USE_SIMULATED` - Use simulated trading (true/false)

## Setup

1. Copy `.env.example` to `.env` for local development:

   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your development credentials

3. For staging/production, update `.env.staging` and `.env.production` files

## Security Notes

⚠️ **IMPORTANT**:

- Never commit `.env`, `.env.staging`, or `.env.production` to git
- These files are listed in `.gitignore`
- Only `.env.example` should be committed
- Rotate API keys regularly
- Use different keys for each environment

## Verification

Check which environment file will be used:

```bash
# For staging
ls -la .env.staging

# For production
ls -la .env.production
```

## Troubleshooting

### Error: Environment file not found

```bash
# Make sure the corresponding .env file exists
ls -la .env.staging
ls -la .env.production
```

### Wrong credentials being used

- Check that you're using the correct deployment command
- Verify the env file contains the expected credentials
- Check that there are no spaces around the `=` sign in env files
