// Import the db instance created in index.ts
// We use require here to avoid circular dependency issues
const Database = require('better-sqlite3');
const path = require('path');

function getDbInstance(): any {
  const dbPath = process.env.DATABASE_URL
    ? process.env.DATABASE_URL.replace('file:', '')
    : path.resolve(__dirname, '../../cryptovix.db');

  return new Database(dbPath);
}

/**
 * Seed database with 90 days of historical synthetic data if the DB is empty.
 * Useful for production environments where the DB is ephemeral (e.g., Render, Railway).
 *
 * @returns Number of rows inserted
 */
export function seedHistoricalDataIfEmpty(): number {
  const db = getDbInstance();
  // Check if DB already has meaningful data
  const countResult = db
    .prepare('SELECT COUNT(*) as count FROM vix_readings')
    .get() as { count: number };

  if (countResult.count >= 100) {
    // DB already has data, skip seeding
    console.log(`[seed] DB already has ${countResult.count} rows, skipping seed`);
    return 0;
  }

  console.log(`[seed] DB is empty or has few rows (${countResult.count}), seeding 90 days of historical data...`);

  const now = Date.now();
  const ninetyDaysAgoMs = now - 90 * 24 * 60 * 60 * 1000;
  const oneHourAgoMs = now - 60 * 60 * 1000;
  const intervalMs = 3 * 60 * 1000; // 3 minutes

  const rows: Array<[number, number, number, number, number, string]> = [];

  for (let ts = ninetyDaysAgoMs; ts < oneHourAgoMs; ts += intervalMs) {
    // Add small jitter (±15 seconds) to make timestamps more realistic
    const jitterMs = (Math.random() - 0.5) * 30_000;
    const createdAt = Math.floor(ts + jitterMs);
    const isoString = new Date(createdAt).toISOString();

    // Generate realistic IV values
    const deribitIv = 48 + Math.random() * 24; // 48–72
    const bybitIv = 46 + Math.random() * 28; // 46–74

    // Calculate weighted composite (matches the formula used in core/index.ts)
    const value = deribitIv * 0.6 + bybitIv * 0.4;

    // Generate realistic BTC price for Dec 2025 – Mar 2026
    const btcPrice = 92_000 + Math.random() * 13_000; // $92k–$105k

    rows.push([value, deribitIv, bybitIv, btcPrice, createdAt, isoString]);
  }

  // Bulk insert using transaction for speed
  const insertStmt = db.prepare(
    'INSERT OR IGNORE INTO vix_readings (value, deribit_iv, bybit_iv, btc_price, created_at, created_at_iso) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const transaction = db.transaction((rows: Array<[number, number, number, number, number, string]>) => {
    let inserted = 0;
    for (const row of rows) {
      const result = insertStmt.run(...row);
      if (result.changes > 0) {
        inserted++;
      }
    }
    return inserted;
  });

  const inserted = transaction(rows);
  console.log(`[seed] Inserted ${inserted} synthetic rows into vix_readings`);

  // Close this db connection (the main one in index.ts remains open)
  db.close();

  return inserted;
}
