import Database from 'better-sqlite3';
import path from 'path';

// Resolve relative to the db package directory for consistent file location
const dbPath = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.replace('file:', '')
  : path.resolve(__dirname, '../../cryptovix.db');

const db = new Database(dbPath);

// Enable WAL mode for concurrent writer safety
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS vix_readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    value REAL NOT NULL,
    deribit_iv REAL,
    bybit_iv REAL,
    btc_price REAL,
    created_at INTEGER NOT NULL UNIQUE,
    created_at_iso TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_vix_created_at ON vix_readings(created_at);
`);

export function insertReading(result: any): void {
  const now = Date.now();
  const isoString = new Date(now).toISOString();
  const roundedValue = Math.round(result.value * 100) / 100;

  // Skip if the most recent reading has the same value and is < 60 seconds old
  const latest = db
    .prepare('SELECT value, created_at FROM vix_readings ORDER BY created_at DESC LIMIT 1')
    .get() as { value: number; created_at: number } | undefined;

  if (latest) {
    const sameValue = Math.round(latest.value * 100) / 100 === roundedValue;
    const ageMs = now - latest.created_at;
    if (sameValue && ageMs < 60_000) {
      return; // Skip near-duplicate
    }
  }

  const bybitIv = result.components?.bybitIv ?? 0;
  // Allow bybitIv === 0 (Bybit outage, valid Deribit-only reading)
  // but reject corrupt decimal values (0 < bybitIv < 5)
  if (bybitIv > 0 && bybitIv < 5) {
    console.warn('[SKIPPED] Invalid bybitIv (corrupt decimal):', bybitIv);
    return;
  }

  db.prepare(
    'INSERT INTO vix_readings (value, deribit_iv, bybit_iv, btc_price, created_at, created_at_iso) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(
    result.value,
    result.components.deribitIv,
    result.components.bybitIv,
    result.metadata.btcPrice,
    now,
    isoString
  );
}

export function getLatestReading(): any {
  const r = db
    .prepare('SELECT * FROM vix_readings ORDER BY created_at DESC LIMIT 1')
    .get() as any;
  if (!r) return null;
  return {
    id: r.id,
    value: r.value,
    deribitIv: r.deribit_iv,
    bybitIv: r.bybit_iv,
    btcPrice: r.btc_price,
    createdAt: r.created_at_iso,
  };
}

export function getReadings(since: Date): any[] {
  const sinceMs = since.getTime();
  const rows = db
    .prepare('SELECT * FROM vix_readings WHERE created_at >= ? ORDER BY created_at ASC')
    .all(sinceMs) as any[];
  return rows.map((r) => ({
    id: r.id,
    value: r.value,
    deribitIv: r.deribit_iv,
    bybitIv: r.bybit_iv,
    btcPrice: r.btc_price,
    createdAt: r.created_at_iso,
  }));
}

/**
 * Delete readings older than specified days to prevent unbounded database growth
 * @param daysToKeep Number of days of data to retain (default: 90)
 */
export function deleteOldReadings(daysToKeep: number = 90): number {
  const cutoffMs = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
  const result = db.prepare('DELETE FROM vix_readings WHERE created_at < ?').run(cutoffMs);
  return result.changes;
}
