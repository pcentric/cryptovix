# CryptoVIX Implementation Guide

## Overview

This guide documents the complete implementation of CryptoVIX Phase 2, which replaces OKX with Bybit and adds production hardening, confidence metrics, and an enhanced Next.js UI.

## What Was Implemented

### 1. Bybit Integration (Replace OKX)
- **New File**: `packages/fetcher/src/bybit.ts`
  - Implements full Bybit option data fetching
  - Uses Bybit V5 API: `GET /v5/market/instruments-info` and `GET /v5/market/tickers`
  - 30-minute cache for instruments-info (symbol → expiry/strike mapping)
  - Robust fallback symbol parsing: `BTC-29MAR24-70000-C`
  - Public endpoints only (no API keys required)

- **Updated**: `packages/fetcher/src/index.ts`
  - Modified `fetchBybitIV()` to handle 1000+ options correctly
  - Fixed IV percentage conversion

- **Updated**: `packages/fetcher/src/types.ts`
  - Changed `exchange` type from `'deribit' | 'okx'` to `'deribit' | 'bybit'`

### 2. Worker App (Standalone Data Aggregation)
- **New App**: `apps/worker/`
  - `src/index.ts` - Main worker loop (5-minute snapshots)
  - `src/collectors.ts` - `SnapshotAggregator` class
  - `package.json` - Worker dependencies
  - `tsconfig.json` - TypeScript config

**SnapshotAggregator** features:
- `buildSnapshot(baseCoin)` - Combines Deribit + Bybit data
- Fetches:
  - Deribit: spot index (`/public/get_index_price`) + DVOL (`/public/get_volatility_index_data`) + option chain (`/public/get_book_summary_by_currency`)
  - Bybit: instruments-info (cached) + tickers
- Normalizes to canonical `OptionQuote` format
- Filters: mid > 0, staleness < 60s
- `calculateConfidence(snapshot)` - Scores 0-100 based on:
  - Venue health (if down: ×0.7 or ×0.8)
  - Options count (penalties below 50 or 10)
  - Data staleness (penalties after 60s and 5min thresholds)

**Metrics Output** (each tick):
```json
{
  "tenor": "30d",
  "value": 25.47,
  "confidence": 95,
  "optionsCountDeribit": 450,
  "optionsCountBybit": 380,
  "lastSuccessfulSnapshot": { "deribit": 1708194117000, "bybit": 1708194117000 }
}
```

### 3. API Enhancements
- **Updated**: `apps/api/src/routes.ts`

**New Routes**:
- `GET /v1/health` - Health check
- `GET /v1/index` - Live CryptoVIX (with confidence, venuesUsed)
- `GET /v1/index/history?period={7d|30d|60d|90d}` - Historical data
- `GET /v1/index/methodology` - Index methodology
- `GET /v1/diagnostics` - System diagnostics & metrics

**New Features**:
- API key logging via `x-api-key` header (masked, e.g., `...3fk4`)
- Confidence calculation based on data quality
- Metrics tracking: lastUpdate, confidence, venuesAvailable, requestCount
- venuesUsed array in `/v1/index` response

### 4. Next.js UI Overhaul
- **Updated**: `apps/web/app/page.tsx`
  - Tenor switching: 7d / 30d / 60d / 90d (replaces period buttons)
  - Confidence badge (color-coded: green ≥90%, yellow 70-89%, red <70%)
  - Venues used display with tags
  - Navigation to Methodology and Status pages

- **Updated Components**:
  - `components/VixChart.tsx` - Accepts `tenor` prop, removed period selector
  - `components/StatsBar.tsx` - Simplified to btcPrice + lastUpdated
  - `components/ComponentBreakdown.tsx` - Renamed to "Venue Breakdown", shows weights (60%/40%)

- **New Pages**:
  - `app/methodology/page.tsx` - Fetches and renders methodology from API
  - `app/status/page.tsx` - Real-time system diagnostics & venue health

### 5. Timestamp Format Fix (Completed in Phase 1)
- Fixed in `packages/db/src/index.ts` line 51
- Converts ISO 8601 to SQLite format: `YYYY-MM-DD HH:MM:SS`

## Running the System

### Prerequisites
```bash
npm install
npx turbo run build
```

### Option 1: API-only (Current Setup)
The API already includes data fetching via `fetchAll()` every 5 minutes.

```bash
# Terminal 1: Start API
cd apps/api
npm run dev

# Terminal 2: Start Web
cd apps/web
npm run dev

# Open http://localhost:3000
```

### Option 2: Dedicated Worker (Recommended for Production)
Run the worker separately to decouple data collection from API serving.

```bash
# Terminal 1: Start Worker
cd apps/worker
npm run dev

# Terminal 2: Start API (without background job)
cd apps/api
npm run dev  # Serves cached data only

# Terminal 3: Start Web
cd apps/web
npm run dev
```

### Environment Setup

**.env files** (copy from .example):
```bash
# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
API_BASE_URL=http://localhost:3001

# apps/api/.env
DATABASE_URL=file:./cryptovix.db
API_PORT=3001
API_HOST=0.0.0.0

# apps/worker/.env
DATABASE_URL=file:../cryptovix.db  # Shared database
```

## Testing

### Test API Endpoints

```bash
# Health check
curl http://localhost:3001/api/v1/health

# Live VIX (with confidence)
curl http://localhost:3001/api/v1/index

# Methodology
curl http://localhost:3001/api/v1/index/methodology

# Diagnostics
curl http://localhost:3001/api/v1/diagnostics

# History (7d, 30d, 60d, 90d)
curl http://localhost:3001/api/v1/index/history?period=30d

# With API key
curl -H "x-api-key: my-test-key" http://localhost:3001/api/v1/index
```

### Test Worker Snapshot

Worker logs include metrics line each tick:
```
[2026-02-17T11:23:45.000Z] Metrics: {"tenor":"30d","value":25.47,"confidence":95,"optionsCountDeribit":450,"optionsCountBybit":380,...}
```

### Database Queries

```bash
# Check latest reading
sqlite3 cryptovix.db "SELECT * FROM vix_readings ORDER BY created_at DESC LIMIT 1;"

# Count readings by day
sqlite3 cryptovix.db "SELECT DATE(created_at) as day, COUNT(*) as count FROM vix_readings GROUP BY day;"
```

## Production Checklist for Week 4

### Metrics to Monitor

1. **Data Quality**
   - `confidence` score (should stay ≥80%)
   - `optionsCountDeribit` & `optionsCountBybit` (both >100 preferred)
   - `lastSuccessfulSnapshot` timestamps (< 1 min old)

2. **Venue Health**
   - Both `venuesAvailable.deribit` and `venuesAvailable.bybit` should be `true`
   - If one venue down, confidence adjusts accordingly

3. **API Performance**
   - Response times on `/v1/index` (target <200ms)
   - `/v1/diagnostics` metrics trending

4. **Database**
   - `vix_readings` table growing steadily (~12 rows per hour at 5-min intervals)
   - No locked database issues

### Alert Thresholds (Setup in Monitoring)

- **Red Alert**: `confidence < 50%`
  - Action: Investigate venue connectivity
- **Yellow Alert**: `confidence < 80%`
  - Action: Monitor, may indicate one venue degradation
- **Database**: No new readings for >10 minutes
  - Action: Check worker/API process, logs

### Deployment Considerations

1. **Database**
   - Set `DATABASE_URL` to persistent SQLite path or migrate to PostgreSQL
   - Ensure backups enabled

2. **API Key Security**
   - Implement actual API key validation (currently just logs masked keys)
   - Use JWT or similar if rate-limiting by user

3. **Rate Limiting**
   - Current: 100 req/min per IP
   - Adjust based on expected traffic

4. **CORS**
   - Currently allows all origins; restrict to your domain in production

5. **Logging**
   - Add structured logging (JSON format) for monitoring
   - Log errors with timestamps for debugging

## API Response Examples

### /v1/index
```json
{
  "status": "ok",
  "data": {
    "value": 25.47,
    "timestamp": "2026-02-17T11:23:45.000Z",
    "change24h": 1.23,
    "changePercent24h": 5.08,
    "confidence": 95,
    "venuesUsed": ["deribit", "bybit"],
    "lastUpdated": "2026-02-17T11:23:45.000Z",
    "components": {
      "deribitIv": 24.56,
      "bybitIv": 26.89,
      "weightedAvg": 25.47
    },
    "metadata": {
      "btcPrice": 52150.25
    }
  }
}
```

### /v1/diagnostics
```json
{
  "status": "ok",
  "data": {
    "metrics": {
      "lastUpdate": "2026-02-17T11:23:45.000Z",
      "confidence": 95,
      "venuesAvailable": { "deribit": true, "bybit": true },
      "totalRequests": 1234
    },
    "latestReading": {
      "value": 25.47,
      "deribitIv": 24.56,
      "bybitIv": 26.89,
      "btcPrice": 52150.25,
      "timestamp": "2026-02-17T11:23:45.000Z"
    },
    "health": {
      "apiStatus": "ok",
      "databaseStatus": "ok",
      "uptime": 86400
    }
  }
}
```

## Troubleshooting

### "No data available" on chart
- Check worker is running: `curl http://localhost:3001/api/v1/diagnostics`
- Verify database has readings: `sqlite3 cryptovix.db "SELECT COUNT(*) FROM vix_readings;"`
- Ensure period parameter is valid (7d, 30d, 60d, 90d)

### "Confidence < 50%"
- Check `/v1/diagnostics` to see which venue is down
- Test Bybit API: `curl https://api.bybit.com/v5/market/tickers?category=option&baseCoin=BTC`
- Test Deribit API: `curl https://www.deribit.com/api/v2/public/get_volatility_index_data?currency=BTC&resolution=3600`

### Worker not running
- Check logs: `cd apps/worker && npm run dev`
- Ensure database path is correct in `.env`
- Verify dependencies installed: `npm install`

### "Bybit options have no IV data"
- Bybit tickers may have invalid markIv values
- Check Bybit API directly: response contains `markIv` (percentage string)
- May indicate Bybit API changes; update parsing if needed

## Files Changed Summary

| File | Change |
|------|--------|
| `packages/fetcher/src/bybit.ts` | NEW |
| `packages/fetcher/src/types.ts` | `'okx'` → `'bybit'` |
| `packages/fetcher/src/index.ts` | Updated `fetchBybitIV()` |
| `packages/db/src/index.ts` | Timestamp format fix (Phase 1) |
| `apps/worker/src/index.ts` | NEW |
| `apps/worker/src/collectors.ts` | NEW |
| `apps/worker/package.json` | NEW |
| `apps/worker/tsconfig.json` | NEW |
| `apps/api/src/routes.ts` | Major update: new routes + metrics |
| `apps/api/src/index.ts` | Unchanged (keep fetchAll loop) |
| `apps/web/app/page.tsx` | Tenor switching + confidence + nav |
| `apps/web/app/methodology/page.tsx` | NEW |
| `apps/web/app/status/page.tsx` | NEW |
| `apps/web/components/VixChart.tsx` | Tenor prop + removed period selector |
| `apps/web/components/StatsBar.tsx` | Simplified |
| `apps/web/components/ComponentBreakdown.tsx` | OKX → Bybit + weights |
| `apps/web/.env.example` | Updated |

## Next Steps (Phase 3+)

1. **Real-time WebSocket updates** - Replace 5-min polling with live updates
2. **Advanced analytics** - Greeks, IV smile, term structure
3. **Alerting system** - Slack/Discord notifications for threshold breaches
4. **Multi-asset support** - ETH, SOL options alongside BTC
5. **Mobile app** - Native iOS/Android client

---

**Last Updated**: 2026-02-17
**Status**: Complete ✓
**Ready for Production**: Yes (with monitoring setup)
