# CryptoVIX

A monorepo implementation of a Bitcoin options implied volatility (IV) index, aggregating data from Deribit and OKX exchanges.

## Architecture

This is a **Turbo monorepo** with the following structure:

```
cryptovix/
├── packages/
│   ├── fetcher/   # Deribit + OKX API clients
│   ├── core/      # IV calculation & index builder
│   └── db/        # Drizzle ORM schema & queries
├── apps/
│   ├── cli/       # Commander.js CLI
│   ├── api/       # Express REST API
│   └── web/       # Next.js 14 dashboard
```

## Tech Stack

- **Package Manager**: npm workspaces (turbo monorepo)
- **Language**: TypeScript
- **Fetcher**: Axios
- **Core Calculation**: Pure TypeScript
- **Database**: Drizzle ORM + better-sqlite3 (SQLite)
- **CLI**: Commander.js + chalk + ora
- **API**: Express.js + CORS + rate limiting
- **Web**: Next.js 14 (App Router) + Recharts + Tailwind CSS

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   ```
   Update `.env` with your configuration:
   - `DATABASE_URL=file:./cryptovix.db`
   - `API_PORT=3001`
   - `API_HOST=0.0.0.0`

3. **Initialize database**:
   ```bash
   npm run db:migrate
   ```

## Usage

### CLI

**Fetch current index:**
```bash
npm run cli -- now
```

**Watch real-time updates (refresh every 30s):**
```bash
npm run cli -- watch
```

**Historical data:**
```bash
npm run cli -- history --days 7
```

### API Server

Start the REST API server:
```bash
npm run start:api
```

Server runs on `http://localhost:3001` by default.

**Endpoints:**

- `GET /api/v1/health` — Health check
- `GET /api/v1/index` — Current CryptoVIX value + 24h change
- `GET /api/v1/index/history?period=24h|7d|30d` — Historical readings

**Example response:**
```json
{
  "status": "ok",
  "data": {
    "value": 45.23,
    "timestamp": "2024-01-15T12:34:56Z",
    "change24h": 2.4,
    "changePercent24h": 5.6,
    "components": {
      "deribitIv": 44.8,
      "okxIv": 45.9,
      "weightedAvg": 45.23
    },
    "metadata": {
      "optionsCount": 142,
      "avgExpiry": 25.3,
      "btcPrice": 67432
    }
  }
}
```

### Web Dashboard

Start the Next.js development server:
```bash
npm run dev --filter=@cryptovix/web
```

Dashboard available at `http://localhost:3000`

Features:
- Real-time VIX gauge with color coding
- Historical chart (24h / 7d / 30d)
- Exchange breakdown (Deribit vs OKX)
- Key metrics (BTC price, options count, avg expiry)

## Core Algorithm

### Filtering
Options are filtered by:
- **Expiry**: 7–60 days from now
- **Moneyness**: Strike within ±20% of BTC price
- **Liquidity**: `markIv > 0` and (`openInterest > 0` or `volume24h > 0`)

### Weighting
For each option:
```
moneyness_score = 1 - |strike - btcPrice| / (0.20 * btcPrice)
oi_weight = openInterest / totalOI
vol_weight = volume24h / totalVol
weight = moneyness_score * (0.5 * oi_weight + 0.5 * vol_weight)
```

### Index Calculation
```
weightedIv = Σ(option.markIv × option.weight) / Σ(option.weight)
```

Values are in annualized IV percent (e.g., 45.2 = 45.2% annualized volatility).

## Development

### Build all packages
```bash
npm run build
```

### Run tests
```bash
npm run test
```

### Watch mode
```bash
npm run dev
```

This starts all dev servers (CLI watches don't apply, but API and web do).

## Database Schema

**`vix_readings` table:**
| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER | Primary key |
| `value` | REAL | Weighted IV % |
| `deribit_iv` | REAL | Deribit exchange IV |
| `okx_iv` | REAL | OKX exchange IV |
| `btc_price` | REAL | Underlying BTC price |
| `options_count` | INTEGER | Number of filtered options |
| `created_at` | TEXT | Timestamp (indexed) |

Old readings (>90 days) can be cleaned via `deleteOldReadings()` query.

## Notes

- **Graceful degradation**: If one exchange fails, the index is computed from the other.
- **Caching**: API responses are cached for 5 minutes to avoid excessive fetching.
- **Background job**: API updates the database every 5 minutes automatically.
- **VIX scale**: Raw markIv % (no additional transformation). Typical BTC IV ranges 30–80%.
- **Deribit instrument parsing**: `BTC-17MAY24-60000-C` → strike 60000, expiry May 17 2024, call
- **OKX instrument parsing**: `BTC-USD-240517-60000-C` → strike 60000, expiry May 17 2024, call

## Troubleshooting

**Database file not created:**
```bash
npm run db:migrate
```

**API won't start:**
- Check `API_PORT` is not in use
- Ensure `DATABASE_URL` is valid

**Charts not loading on web:**
- Verify API is running on the correct URL
- Check `NEXT_PUBLIC_API_URL` environment variable (defaults to `http://localhost:3001`)

**Options data is empty:**
- Verify network connectivity to Deribit and OKX public APIs
- Check instrument names parse correctly (see parsing logic in `fetcher` package)
