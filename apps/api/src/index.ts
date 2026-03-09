import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import router from './routes';
import { fetchAll } from '@cryptovix/fetcher';
import { buildIndex } from '@cryptovix/core';
import { insertReading, deleteOldReadings } from '@cryptovix/db';

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
const bgJobInterval = setInterval(runBackgroundJob, 5 * 60 * 1000);

// Run database pruning weekly (keep last 90 days)
const pruneInterval = setInterval(() => {
  try {
    const deleted = deleteOldReadings(90);
    if (deleted > 0) {
      console.log(`[${new Date().toISOString()}] Pruned ${deleted} old readings from database`);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Database pruning error:`, error);
  }
}, 7 * 24 * 60 * 60 * 1000); // Weekly

// Start server
const server = app.listen(port, host, () => {
  console.log(`API listening on http://${host}:${port}`);
});

// Graceful shutdown handlers
const shutdown = (signal: string) => {
  console.log(`\n[${new Date().toISOString()}] Received ${signal}, shutting down gracefully...`);

  // Clear intervals
  clearInterval(bgJobInterval);
  clearInterval(pruneInterval);

  // Close server
  server.close(() => {
    console.log(`[${new Date().toISOString()}] Server closed`);
    process.exit(0);
  });

  // Force exit after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    console.error(`[${new Date().toISOString()}] Forced shutdown after timeout`);
    process.exit(1);
  }, 10 * 1000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
