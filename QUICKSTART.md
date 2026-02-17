# CryptoVIX Quick Start

## Installation

```bash
npm install
```

This installs all workspace dependencies and sets up Turbo.

## Build Everything

```bash
npm run build
```

Compiles TypeScript in all packages and apps. Database is created automatically on first API run.

## Running the Project

### Fastest (2 terminals):

```bash
# Terminal 1: Start API (port 3001)
cd apps/api && npm run dev

# Terminal 2: Start Web (port 3000)
cd apps/web && npm run dev

# Open http://localhost:3000
```

The API will automatically fetch data every 5 minutes and store it in SQLite.

### With Separate Worker (3 terminals, recommended for production):

```bash
# Terminal 1: Worker (collects data from Deribit + Bybit)
cd apps/worker && npm run dev

# Terminal 2: API (serves cached data)
cd apps/api && npm run dev

# Terminal 3: Web UI
cd apps/web && npm run dev
```

### All Together with Turbo:

```bash
npm run dev
```

This starts API, Web, and watches all packages for changes.

## Testing the API

```bash
# Health check
curl http://localhost:3001/api/v1/health

# Current CryptoVIX with confidence
curl http://localhost:3001/api/v1/index

# Historical data (7d, 30d, 60d, 90d)
curl http://localhost:3001/api/v1/index/history?period=30d

# System diagnostics
curl http://localhost:3001/api/v1/diagnostics

# Methodology
curl http://localhost:3001/api/v1/index/methodology
```

## Web Dashboard

Open `http://localhost:3000` to see:
- **Big CryptoVIX number** with 24h change
- **Confidence score** (color-coded: green ≥90%, yellow 70-89%, red <70%)
- **Tenor switching**: 7d / 30d / 60d / 90d
- **Venue breakdown**: Deribit (60%) + Bybit (40%) individual IVs
- **Live chart** with history
- **Links**: Methodology and Status pages

## Understanding the Data

**CryptoVIX = (Deribit DVOL × 60%) + (Bybit IV × 40%)**

- **Deribit**: Primary source, uses their DVOL index from BTC option book
- **Bybit**: Secondary source, calculates IV from BTC option tickers
- **Update frequency**: Every 5 minutes (API automatic or Worker)
- **Confidence**: 0-100 score reflecting data quality

## Database

SQLite database (`cryptovix.db`) stores all readings:

```bash
# Check latest reading
sqlite3 cryptovix.db "SELECT * FROM vix_readings ORDER BY created_at DESC LIMIT 1;"

# Count readings
sqlite3 cryptovix.db "SELECT COUNT(*) FROM vix_readings;"

# Daily summary
sqlite3 cryptovix.db "
  SELECT
    DATE(created_at) as day,
    COUNT(*) as readings,
    ROUND(AVG(value), 2) as avg_vix
  FROM vix_readings
  GROUP BY day
  ORDER BY day DESC;
"
```

## Troubleshooting

### "No data available" on chart
- **Wait 5+ minutes** after starting API (first fetch on startup + 5 min interval)
- Check diagnostics: `curl http://localhost:3001/api/v1/diagnostics`
- Check DB: `sqlite3 cryptovix.db "SELECT COUNT(*) FROM vix_readings;"`
- Check period parameter is valid (7d, 30d, 60d, 90d - NOT 24h)

### Confidence score very low (< 50%)
- Open `/status` page to see which venue is failing
- Test Deribit: `curl https://www.deribit.com/api/v2/public/get_volatility_index_data?currency=BTC&resolution=3600`
- Test Bybit: `curl https://api.bybit.com/v5/market/tickers?category=option&baseCoin=BTC`

### Port already in use
```bash
API_PORT=3002 npm run build --workspace=@cryptovix/api
```

### Build failures
```bash
rm -rf node_modules dist .turbo
npm install
npm run build
```

### API not starting
- Check logs: look for error messages
- Verify database path in `.env`
- Ensure port 3001 is free: `lsof -i :3001`

## File Structure

```
cryptovix/
├── packages/
│   ├── fetcher/       → Deribit + Bybit API clients
│   ├── core/          → IV calculation logic
│   └── db/            → SQLite database layer
├── apps/
│   ├── worker/        → Data aggregator (optional)
│   ├── api/           → Express REST API
│   └── web/           → Next.js dashboard
└── IMPLEMENTATION_GUIDE.md  → Full documentation
```

## Environment Variables

Create `.env` files for each app:

**apps/api/.env:**
```
DATABASE_URL=file:./cryptovix.db
API_PORT=3001
API_HOST=0.0.0.0
```

**apps/web/.env.local:**
```
NEXT_PUBLIC_API_URL=http://localhost:3001
API_BASE_URL=http://localhost:3001
```

## Next: Production Setup

For production deployment, see `IMPLEMENTATION_GUIDE.md` for:
- Worker vs API-only architectures
- Monitoring and alerting thresholds
- Database persistence strategies
- Deployment checklist for Week 4
