import Database from 'better-sqlite3';
import path from 'path';

// Resolve same DB path as packages/db/src/index.ts
const dbPath = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.replace('file:', '')
  : path.resolve(__dirname, '../packages/db/cryptovix.db');

const db = new Database(dbPath);

const corrupt = db
  .prepare('SELECT id, bybit_iv, deribit_iv, value FROM vix_readings WHERE bybit_iv > 0 AND bybit_iv < 5')
  .all() as { id: number; bybit_iv: number; deribit_iv: number; value: number }[];

console.log(`Found ${corrupt.length} corrupt row(s)`);

const update = db.prepare('UPDATE vix_readings SET value = ?, bybit_iv = 0 WHERE id = ?');

const fix = db.transaction(() => {
  for (const row of corrupt) {
    const correctedValue = Math.round(row.deribit_iv * 100) / 100; // 100% Deribit
    update.run(correctedValue, row.id);
    console.log(
      `  id=${row.id}: bybit_iv=${row.bybit_iv} → 0, value=${row.value} → ${correctedValue}`
    );
  }
});

fix();
console.log('Done.');
