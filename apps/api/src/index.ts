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

// Background job: fetch and store VIX reading every 5 minutes
setInterval(async () => {
  try {
    const options = await fetchAll();
    const result = buildIndex(options);
    insertReading(result);
    console.log(`[${new Date().toISOString()}] Stored VIX reading: ${result.value.toFixed(2)}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Background job error:`, error);
  }
}, 5 * 60 * 1000);

// Start server
app.listen(port, host, () => {
  console.log(`API listening on http://${host}:${port}`);
});
