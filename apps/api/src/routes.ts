import { Router, Request, Response, NextFunction } from 'express';
import { fetchAll } from '@cryptovix/fetcher';
import { buildIndex } from '@cryptovix/core';
import { insertReading, getLatestReading, getReadings } from '@cryptovix/db';

const router = Router();

// Metrics tracking
interface Metrics {
  lastUpdate: number;
  confidence: number;
  venuesAvailable: { deribit: boolean; bybit: boolean };
  requestCount: number;
  lastApiKey?: string; // For logging (masked)
}

let metrics: Metrics = {
  lastUpdate: 0,
  confidence: 100,
  venuesAvailable: { deribit: true, bybit: true },
  requestCount: 0,
};

interface VixResponse {
  status: 'ok' | 'error';
  data?: {
    value: number;
    timestamp: string;
    change24h: number | null;
    changePercent24h: number | null;
    confidence: number;
    venuesUsed: string[];
    lastUpdated: string;
    stale?: boolean;
    components: {
      deribitIv: number;
      bybitIv: number;
      weightedAvg: number;
    };
    metadata: {
      btcPrice: number;
    };
  };
  error?: string;
}

// Cache for live data (less than 5 minutes old)
let cachedResult: any = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Middleware: API Key validation and logging
 */
function apiKeyMiddleware(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string | undefined;

  if (apiKey) {
    // Log API key usage (masked to last 4 chars for security)
    const masked = `...${apiKey.slice(-4)}`;
    metrics.lastApiKey = masked;
    console.log(`[API] Request with key ${masked} - ${req.method} ${req.path}`);
  }

  metrics.requestCount++;
  next();
}

router.use(apiKeyMiddleware);

/**
 * Calculate confidence based on data quality
 */
function calculateConfidence(result: any): number {
  let confidence = 100;

  // If either venue is down, reduce confidence
  if (result.components.deribitIv === 0) confidence *= 0.7;
  if (result.components.bybitIv === 0) confidence *= 0.8;

  // Age penalty (every minute reduces confidence by 0.5%)
  const ageMinutes = (Date.now() - cacheTimestamp) / (60 * 1000);
  confidence = Math.max(50, confidence - ageMinutes * 0.5);

  return Math.round(confidence);
}

/**
 * GET /health
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /server-ip — returns the server's outgoing public IP (for Bybit whitelist)
 */
router.get('/server-ip', async (req: Request, res: Response) => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json() as { ip: string };
    res.json({ status: 'ok', data: { ip: data.ip } });
  } catch {
    res.json({ status: 'error', data: { ip: 'unknown' } });
  }
});

/**
 * GET /current — alias for /index
 */
router.get('/current', (req: Request, res: Response) => {
  res.redirect(301, '/api/v1/index');
});

/**
 * GET /index
 */
router.get('/index', async (req: Request, res: Response) => {
  const response: VixResponse = { status: 'ok' };

  try {
    // Check cache
    const now = Date.now();
    let result = cachedResult;

    if (!cachedResult || now - cacheTimestamp > CACHE_DURATION) {
      const options = await fetchAll();
      const freshResult = buildIndex(options);

      if (freshResult.value > 0) {
        insertReading(freshResult);
        result = freshResult;
        cachedResult = freshResult;
        cacheTimestamp = now;
        metrics.lastUpdate = now;
      } else {
        // Fetch failed — fall back to last known-good DB reading
        const lastReading = getLatestReading();
        if (lastReading) {
          result = {
            value: lastReading.value,
            timestamp: new Date(lastReading.createdAt),
            components: {
              deribitIv: lastReading.deribitIv,
              bybitIv: lastReading.bybitIv,
              weightedAvg: lastReading.value,
            },
            metadata: { btcPrice: lastReading.btcPrice },
            stale: true,
          };
        } else {
          result = freshResult; // truly no data at all
        }
        cachedResult = null; // Don't cache — retry on next request
      }
    }

    // Calculate confidence
    const confidence = calculateConfidence(result);
    metrics.confidence = confidence;

    // Get previous reading for 24h change
    const day24hAgo = new Date(now - 24 * 60 * 60 * 1000);
    const readings = getReadings(day24hAgo);
    const change24h =
      readings.length > 0 ? result.value - readings[0].value : null;
    // Guard against division by zero if historical reading is corrupt
    const changePercent24h = change24h !== null && readings[0].value !== 0
      ? (change24h / readings[0].value) * 100
      : null;

    // Determine which venues are being used and update metrics
    const venuesUsed = [];
    if (result.components.deribitIv > 0) venuesUsed.push('deribit');
    if (result.components.bybitIv > 0) venuesUsed.push('bybit');

    // Update venuesAvailable based on actual data
    metrics.venuesAvailable = {
      deribit: result.components.deribitIv > 0,
      bybit: result.components.bybitIv > 0,
    };

    // For stale data, use the result timestamp; for fresh data, use cacheTimestamp
    const lastUpdatedTimestamp = result.stale && result.timestamp
      ? result.timestamp.getTime()
      : cacheTimestamp;

    response.data = {
      value: result.value,
      timestamp: result.timestamp.toISOString(),
      change24h,
      changePercent24h,
      confidence,
      venuesUsed,
      lastUpdated: new Date(lastUpdatedTimestamp).toISOString(),
      stale: result.stale ?? false,
      components: {
        deribitIv: result.components.deribitIv,
        bybitIv: result.components.bybitIv,
        weightedAvg: result.components.weightedAvg,
      },
      metadata: {
        btcPrice: result.metadata.btcPrice,
      },
    };

    res.json(response);
  } catch (error) {
    response.status = 'error';
    response.error = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json(response);
  }
});

/**
 * GET /index/history
 */
router.get('/index/history', (req: Request, res: Response) => {
  const response: any = { status: 'ok' };

  try {
    const period = req.query.period as string || '30d';

    let since: Date;
    switch (period) {
      case '7d':
        since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '60d':
        since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        res.status(400).json({ status: 'error', error: 'Invalid period' });
        return;
    }

    const readings = getReadings(since);

    response.data = readings.map((r) => ({
      timestamp: r.createdAt,
      value: r.value,
      deribitIv: r.deribitIv,
      bybitIv: r.bybitIv,
      btcPrice: r.btcPrice,
    }));

    res.json(response);
  } catch (error) {
    response.status = 'error';
    response.error = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json(response);
  }
});

/**
 * GET /index/methodology
 */
router.get('/index/methodology', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    data: {
      name: 'CryptoVIX',
      description: 'Bitcoin Options Implied Volatility Index',
      methodology: {
        calculation: 'Weighted average of Deribit DVOL (60%) and Bybit ATM 30-DTE IV (40%)',
        baseCoin: 'BTC',
        venues: [
          {
            name: 'deribit',
            weight: '60%',
            signal: 'DVOL Index (all expirations & strikes)',
          },
          {
            name: 'bybit',
            weight: '40%',
            signal: 'ATM 30-DTE mark IV (spot-based strike selection, call/put averaged)',
          },
        ],
        dataFrequency: '5 minutes',
        filtering: {
          minBid: 0,
          maxStaleness: '60 seconds',
          excludeExpired: true,
        },
      },
      disclaimer:
        'This index is provided for informational purposes only. Past performance is not indicative of future results. Use at your own risk.',
      contact: 'https://github.com/cryptovix/cryptovix',
    },
  });
});

/**
 * GET /diagnostics
 */
router.get('/diagnostics', (req: Request, res: Response) => {
  const lastReading = getLatestReading();

  res.json({
    status: 'ok',
    data: {
      metrics: {
        lastUpdate: new Date(metrics.lastUpdate).toISOString(),
        confidence: metrics.confidence,
        venuesAvailable: metrics.venuesAvailable,
        totalRequests: metrics.requestCount,
      },
      latestReading: lastReading
        ? {
            value: lastReading.value,
            deribitIv: lastReading.deribitIv,
            bybitIv: lastReading.bybitIv,
            btcPrice: lastReading.btcPrice,
            timestamp: lastReading.createdAt,
          }
        : null,
      health: {
        apiStatus: 'ok',
        databaseStatus: lastReading ? 'ok' : 'no_data',
        uptime: process.uptime(),
      },
    },
  });
});

/**
 * GET /debug/bybit — returns raw Bybit markIv values to diagnose format issues
 */
router.get('/debug/bybit', async (_req: Request, res: Response) => {
  try {
    const url = 'https://api.bybit.com/v5/market/tickers?category=option&baseCoin=BTC&limit=1000';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    let rawData: any;
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Bybit API returned ${response.status}: ${text.substring(0, 200)}`);
      }
      rawData = await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
    const list: any[] = rawData.result?.list ?? [];
    const sample = list.slice(0, 3).map((t: any) => ({
      symbol: t.symbol,
      markIvRaw: t.markIv,
      markIvParsed: parseFloat(t.markIv || '0'),
      markIvForm: parseFloat(t.markIv || '0') > 2 ? 'percentage' : 'decimal',
    }));
    res.json({
      status: 'ok',
      data: {
        retCode: rawData.retCode ?? -1,
        retMsg: rawData.retMsg ?? null,
        totalTickers: list.length,
        sample,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[debug/bybit] Error:', errorMsg);
    res.status(500).json({ status: 'error', error: errorMsg });
  }
});

export default router;
