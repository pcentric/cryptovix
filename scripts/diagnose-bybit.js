#!/usr/bin/env node

const dns = require('dns').promises;
const https = require('https');
const http = require('http');
const net = require('net');

const TIMESTAMP = () => new Date().toISOString();

// Helper to make HTTPS requests
function httpsGet(url, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const req = https.get(url, { timeout: timeoutMs }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const elapsed = Date.now() - start;
        resolve({ status: res.statusCode, elapsed, data, headers: res.headers });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('TIMEOUT'));
    });
  });
}

// Helper to mask sensitive values
function maskValue(value) {
  if (!value) return '<not set>';
  return value.substring(0, 4) + '****';
}

async function diagnose() {
  console.log(`\n[${TIMESTAMP()}] 🔍 CryptoVIX Bybit Diagnostic Tool\n`);

  const results = {};

  // ============ SECTION 1: Environment Variables ============
  console.log('📋 Section 1: Environment Variables');
  console.log('─'.repeat(50));
  const envVars = {
    BYBIT_API_KEY: process.env.BYBIT_API_KEY,
    BYBIT_API_SECRET: process.env.BYBIT_API_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL ? '<set>' : '<not set>',
  };

  Object.entries(envVars).forEach(([key, val]) => {
    const display = key === 'DATABASE_URL'
      ? val
      : maskValue(val);
    console.log(`  ${key}: ${display}`);
  });
  results.env = {
    apiKeySet: !!process.env.BYBIT_API_KEY,
    apiSecretSet: !!process.env.BYBIT_API_SECRET,
  };
  console.log('');

  // ============ SECTION 2: DNS Resolution ============
  console.log('🌐 Section 2: DNS Resolution (api.bybit.com)');
  console.log('─'.repeat(50));
  try {
    const ipv4 = await dns.resolve4('api.bybit.com');
    console.log(`  ✅ IPv4: ${ipv4.join(', ')}`);
    results.dns_ipv4 = { pass: true, ips: ipv4 };
  } catch (err) {
    console.error(`  ❌ IPv4 failed: ${err.message}`);
    results.dns_ipv4 = { pass: false, error: err.message };
  }

  try {
    const ipv6 = await dns.resolve6('api.bybit.com');
    console.log(`  ✅ IPv6: ${ipv6.join(', ')}`);
    results.dns_ipv6 = { pass: true, ips: ipv6 };
  } catch (err) {
    console.log(`  ⚠️  IPv6 not available (may be normal): ${err.message}`);
    results.dns_ipv6 = { pass: false, error: err.message };
  }
  console.log('');

  // ============ SECTION 3: TCP Connectivity ============
  console.log('🔌 Section 3: TCP Connectivity (port 443)');
  console.log('─'.repeat(50));
  results.tcp = await new Promise((resolve) => {
    const socket = net.createConnection({ host: 'api.bybit.com', port: 443, timeout: 10000 });
    const start = Date.now();

    socket.on('connect', () => {
      const elapsed = Date.now() - start;
      console.log(`  ✅ Connected in ${elapsed}ms`);
      socket.destroy();
      resolve({ pass: true, elapsed });
    });

    socket.on('error', (err) => {
      console.error(`  ❌ Connection failed: ${err.message}`);
      resolve({ pass: false, error: err.message });
    });

    socket.on('timeout', () => {
      console.error(`  ❌ Connection timeout (10s)`);
      socket.destroy();
      resolve({ pass: false, error: 'TIMEOUT' });
    });
  });
  console.log('');

  // ============ SECTION 4: Bybit API Endpoints ============
  console.log('📡 Section 4: Bybit API Endpoints');
  console.log('─'.repeat(50));

  // Test 1: Tickers
  console.log('  Testing: /v5/market/tickers');
  const tickersUrl = 'https://api.bybit.com/v5/market/tickers?category=option&baseCoin=BTC&limit=1';
  try {
    const tickersRes = await httpsGet(tickersUrl);
    const json = JSON.parse(tickersRes.data);
    console.log(`    Status: ${tickersRes.status}`);
    console.log(`    Response time: ${tickersRes.elapsed}ms`);
    console.log(`    Bybit retCode: ${json.retCode} (${json.retMsg || 'OK'})`);

    if (json.result?.list?.[0]) {
      console.log(`    First item: ${json.result.list[0].symbol}`);
      results.tickers = { pass: json.retCode === 0, status: tickersRes.status, retCode: json.retCode };
    } else {
      console.log(`    No data in response`);
      results.tickers = { pass: false, status: tickersRes.status, retCode: json.retCode, error: 'No data' };
    }
  } catch (err) {
    console.error(`    ❌ Request failed: ${err.message}`);
    results.tickers = { pass: false, error: err.message };
  }
  console.log('');

  // Test 2: Instruments
  console.log('  Testing: /v5/market/instruments-info');
  const instrumentsUrl = 'https://api.bybit.com/v5/market/instruments-info?category=option&baseCoin=BTC&limit=1';
  try {
    const instRes = await httpsGet(instrumentsUrl);
    const json = JSON.parse(instRes.data);
    console.log(`    Status: ${instRes.status}`);
    console.log(`    Response time: ${instRes.elapsed}ms`);
    console.log(`    Bybit retCode: ${json.retCode} (${json.retMsg || 'OK'})`);

    if (json.result?.list?.[0]) {
      console.log(`    First item: ${json.result.list[0].symbol}`);
      results.instruments = { pass: json.retCode === 0, status: instRes.status, retCode: json.retCode };
    } else {
      console.log(`    No data in response`);
      results.instruments = { pass: false, status: instRes.status, retCode: json.retCode, error: 'No data' };
    }
  } catch (err) {
    console.error(`    ❌ Request failed: ${err.message}`);
    results.instruments = { pass: false, error: err.message };
  }
  console.log('');

  // ============ SECTION 5: Outbound IP Detection ============
  console.log('🌍 Section 5: Outbound IP Detection');
  console.log('─'.repeat(50));
  try {
    const ipRes = await httpsGet('https://api.ipify.org?format=json');
    const ipJson = JSON.parse(ipRes.data);
    const outboundIp = ipJson.ip;
    console.log(`  🔍 Your Render outbound IP: ${outboundIp}`);
    console.log(`  💡 Check if this IP is whitelisted by Bybit`);
    results.outbound_ip = { pass: true, ip: outboundIp };
  } catch (err) {
    console.error(`  ❌ Could not detect IP: ${err.message}`);
    results.outbound_ip = { pass: false, error: err.message };
  }
  console.log('');

  // ============ SECTION 6: Summary ============
  console.log('📊 Diagnostic Summary');
  console.log('─'.repeat(50));

  const checks = [
    { name: 'DNS (IPv4)', result: results.dns_ipv4?.pass },
    { name: 'TCP Connectivity', result: results.tcp?.pass },
    { name: 'Tickers Endpoint', result: results.tickers?.pass },
    { name: 'Instruments Endpoint', result: results.instruments?.pass },
    { name: 'Outbound IP Detected', result: results.outbound_ip?.pass },
  ];

  checks.forEach(({ name, result }) => {
    const icon = result ? '✅' : result === false ? '❌' : '⚠️';
    console.log(`  ${icon} ${name}`);
  });

  const allPass = checks.every(c => c.result === true);
  console.log('');
  if (allPass) {
    console.log('✨ All checks passed! Bybit connectivity is working.');
  } else {
    console.log('⚠️  Some checks failed. See details above.');
    console.log('');
    console.log('💡 Common fixes:');
    console.log('   1. DNS fail? Render may have network issues');
    console.log('   2. TCP fail? Bybit blocking your IP or firewall issue');
    console.log('   3. API fail? Check if retCode is 10005/10006 (IP restricted)');
    console.log('   4. Check Bybit status: https://status.bybit.com/');
  }
  console.log('');
}

diagnose().catch((err) => {
  console.error(`[${TIMESTAMP()}] ❌ Fatal error:`, err);
  process.exit(1);
});
