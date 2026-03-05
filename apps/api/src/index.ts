import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import router from './routes';
import { fetchAll } from '@cryptovix/fetcher';
import { buildIndex } from '@cryptovix/core';
import { insertReading } from '@cryptovix/db';

const app = express();
const port = parseInt(process.env.API_PORT || '3001', 10);
const host = process.env.API_HOST || '0.0.0.0';

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiter: 100 requests per minute
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per windowMs
});
app.use(limiter);

// Mount routes
app.use('/api/v1', router);

// Background job function
async function runBackgroundJob() {
  try {
    const options = await fetchAll();
    const result = buildIndex(options);
    if (result.value > 0) {
      insertReading(result);
      console.log(`[${new Date().toISOString()}] Stored VIX reading: ${result.value.toFixed(2)}`);
    } else {
      console.warn(`[${new Date().toISOString()}] Skipped storing zero/invalid VIX reading`);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Background job error:`, error);
  }
}

// Run immediately on startup, then every 5 minutes
runBackgroundJob();
setInterval(runBackgroundJob, 5 * 60 * 1000);

// Start server
app.listen(port, host, () => {
  console.log(`API listening on http://${host}:${port}`);
});
