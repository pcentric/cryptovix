import Database from 'better-sqlite3';
import path from 'path';

// Resolve relative to the db package directory for consistent file location
const dbPath = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.replace('file:', '')
  : path.resolve(__dirname, '../../cryptovix.db');

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS vix_readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    value REAL NOT NULL,
    deribit_iv REAL,
    bybit_iv REAL,
    btc_price REAL,
    created_at INTEGER NOT NULL UNIQUE,
    created_at_iso TEXT
  )
`);

export function insertReading(result: any): void {
  const now = Date.now();
  const isoString = new Date(now).toISOString();

  // Check if a reading already exists for this millisecond timestamp
  const existing = db
    .prepare('SELECT id FROM vix_readings WHERE created_at = ?')
    .get(now);

  if (existing) {
    return; // Skip duplicate
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
