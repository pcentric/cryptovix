const https = require('https');
const http = require('http');

const TARGET_URL = process.env.PING_URL || 'https://cryptovix.onrender.com/health';
const INTERVAL_MS = parseInt(process.env.PING_INTERVAL_MS || '840000', 10); // 14 minutes
const PORT = parseInt(process.env.PORT || '3002', 10);

function ping() {
  const start = Date.now();
  const req = https.get(TARGET_URL, { timeout: 10000 }, (res) => {
    const elapsed = Date.now() - start;
    console.log(`[${new Date().toISOString()}] PING OK — ${res.statusCode} in ${elapsed}ms`);
    res.resume(); // drain response body
  });

  req.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] PING FAILED — ${err.message}`);
  });

  req.on('timeout', () => {
    console.error(`[${new Date().toISOString()}] PING TIMEOUT`);
    req.destroy();
  });
}

// Health endpoint so Render keeps this service alive
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', target: TARGET_URL }));
});

server.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Pinger started on port ${PORT}`);
  console.log(`[${new Date().toISOString()}] Will ping ${TARGET_URL} every ${INTERVAL_MS / 1000}s`);
  ping(); // immediate first ping
});

setInterval(ping, INTERVAL_MS);
