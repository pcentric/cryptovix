import 'dotenv/config';
import { buildIndex } from '@cryptovix/core';
import { insertReading, getLatestReading } from '@cryptovix/db';
import { SnapshotAggregator } from './collectors';

const SNAPSHOT_INTERVAL = 5 * 60 * 1000; // 5 minutes in ms

// Metrics tracking
interface Metrics {
  tenor: string;
  value: number;
  confidence: number;
  optionsCountDeribit: number;
  optionsCountBybit: number;
  lastSuccessfulSnapshot: { deribit: number; bybit: number };
}

async function runWorker() {
  const aggregator = new SnapshotAggregator();

  console.log('[Worker] Starting CryptoVIX worker...');

  // Run snapshot every SNAPSHOT_INTERVAL
  setInterval(async () => {
    try {
      const snapshot = await aggregator.buildSnapshot('BTC');

      // Calculate metrics
      const deribitCount = snapshot.options.filter(o => o.venue === 'deribit').length;
      const bybitCount = snapshot.options.filter(o => o.venue === 'bybit').length;
      const confidence = aggregator.calculateConfidence(snapshot);

      // Build index from aggregated data
      const result = buildIndex({
        deribitDvol: snapshot.deribitIv,
        bybitIv: snapshot.bybitIv,
        btcPrice: snapshot.spotUsd,
        timestamp: new Date(),
      });

      // Store in database
      insertReading(result);

      // Log metrics (kill-switch line)
      const metrics: Metrics = {
        tenor: '30d', // Default tenor
        value: result.value,
        confidence,
        optionsCountDeribit: deribitCount,
        optionsCountBybit: bybitCount,
        lastSuccessfulSnapshot: {
          deribit: snapshot.lastSnapshotTime.deribit,
          bybit: snapshot.lastSnapshotTime.bybit,
        },
      };

      console.log(
        `[${new Date().toISOString()}] Metrics: ${JSON.stringify(metrics)}`
      );
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Worker error:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }, SNAPSHOT_INTERVAL);

  // Initial run
  try {
    const snapshot = await aggregator.buildSnapshot('BTC');
    console.log(
      `[${new Date().toISOString()}] Initial snapshot: ${snapshot.options.length} options`
    );
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Initial snapshot failed:`,
      error
    );
  }
}

// Start worker
runWorker().catch(console.error);
