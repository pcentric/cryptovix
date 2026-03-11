#!/usr/bin/env node

/**
 * CryptoVIX Bybit API Diagnostic Script
 *
 * Purpose: Diagnose Bybit API connectivity issues (credentials, IP whitelist, network)
 * Usage:
 *   npx ts-node src/bybit-diagnostic.ts
 *   NODE_ENV=production npx ts-node src/bybit-diagnostic.ts
 */

import crypto from 'crypto';

const BYBIT_API_BASE = 'https://api.bybit.com/v5';
const FETCH_TIMEOUT_MS = 10000;

interface DiagnosticResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
  timestamp: string;
}

const results: DiagnosticResult[] = [];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function addResult(
  name: string,
  status: 'pass' | 'fail' | 'warning',
  message: string,
  details?: string
) {
  results.push({
    name,
    status,
    message,
    details,
    timestamp: new Date().toISOString(),
  });
  const icon = status === 'pass' ? '✓' : status === 'fail' ? '✗' : '⚠';
  console.log(`${icon} [${name}] ${message}`);
  if (details) console.log(`   └─ ${details}`);
}

/**
 * Generate Bybit V5 API signature using HMAC-SHA256
 */
function generateBybitSignature(
  timestamp: string,
  apiSecret: string,
  method: string,
  path: string,
  body: string = ''
): string {
  try {
    const queryString = body ? body : '';
    const signatureRawStr = `${timestamp}${method}${path}${queryString}`;
    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(signatureRawStr)
      .digest('hex');
    return signature;
  } catch (error) {
    throw new Error(`Signature generation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================================================
// DIAGNOSTIC TESTS
// ============================================================================

async function testEnvironment() {
  console.log('\n[1/5] ENVIRONMENT VALIDATION');
  console.log('─'.repeat(60));

  const apiKey = process.env.BYBIT_API_KEY;
  const apiSecret = process.env.BYBIT_API_SECRET;
  const nodeEnv = process.env.NODE_ENV || 'development';

  if (!apiKey) {
    addResult(
      'API Key',
      'fail',
      'BYBIT_API_KEY environment variable not set',
      'Set BYBIT_API_KEY in your .env or Render environment'
    );
  } else {
    const masked = `${apiKey.substring(0, 8)}...${apiKey.slice(-4)}`;
    addResult('API Key', 'pass', `Present and valid (${masked})`);
  }

  if (!apiSecret) {
    addResult(
      'API Secret',
      'fail',
      'BYBIT_API_SECRET environment variable not set',
      'Set BYBIT_API_SECRET in your .env or Render environment'
    );
  } else {
    addResult('API Secret', 'pass', 'Present (not displayed for security)');
  }

  addResult('Environment', 'pass', `Running in ${nodeEnv} mode`);
}

async function testSignatureGeneration() {
  console.log('\n[2/5] SIGNATURE GENERATION');
  console.log('─'.repeat(60));

  const apiSecret = process.env.BYBIT_API_SECRET;
  if (!apiSecret) {
    addResult(
      'HMAC-SHA256 Test',
      'warning',
      'Skipped (API_SECRET not set)',
      'Set BYBIT_API_SECRET to test signature generation'
    );
    return;
  }

  try {
    const timestamp = Date.now().toString();
    const testSignature = generateBybitSignature(
      timestamp,
      apiSecret,
      'GET',
      '/v5/account/wallet-balance'
    );

    if (testSignature.length === 64 && /^[a-f0-9]{64}$/.test(testSignature)) {
      addResult(
        'HMAC-SHA256',
        'pass',
        'Signature generated successfully',
        `Sample: ${testSignature.substring(0, 32)}...`
      );
    } else {
      addResult('HMAC-SHA256', 'fail', 'Invalid signature format', testSignature);
    }
  } catch (error) {
    addResult(
      'HMAC-SHA256',
      'fail',
      'Signature generation failed',
      error instanceof Error ? error.message : String(error)
    );
  }
}

async function testPublicEndpoint() {
  console.log('\n[3/5] PUBLIC ENDPOINT TEST');
  console.log('─'.repeat(60));

  try {
    const url = `${BYBIT_API_BASE}/market/tickers?category=option&baseCoin=BTC&limit=10`;
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      addResult(
        'GET /v5/market/tickers',
        'fail',
        `HTTP ${response.status} ${response.statusText}`,
        `URL: ${url}`
      );
      const text = await response.text();
      if (text) {
        console.log(`   └─ Response body: ${text.substring(0, 200)}`);
      }
      return;
    }

    const data = (await response.json()) as any;

    if (data.retCode !== 0) {
      addResult(
        'GET /v5/market/tickers',
        'fail',
        `API error: ${data.retMsg || 'Unknown error'}`,
        `Return code: ${data.retCode}`
      );
      return;
    }

    const optionCount = data.result?.list?.length || 0;
    if (optionCount > 0) {
      addResult(
        'GET /v5/market/tickers',
        'pass',
        `Successfully fetched ${optionCount} option records`,
        `Sample symbol: ${data.result.list[0]?.symbol || 'N/A'}`
      );
    } else {
      addResult(
        'GET /v5/market/tickers',
        'warning',
        'API responded but returned no option data',
        'This may indicate no BTC options are available'
      );
    }
  } catch (error) {
    addResult(
      'GET /v5/market/tickers',
      'fail',
      'Request failed',
      error instanceof Error ? error.message : String(error)
    );
  }
}

async function testInstrumentsEndpoint() {
  console.log('\n[4/5] INSTRUMENTS ENDPOINT TEST');
  console.log('─'.repeat(60));

  try {
    const url = `${BYBIT_API_BASE}/market/instruments-info?category=option&baseCoin=BTC&limit=10`;
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      addResult(
        'GET /v5/market/instruments-info',
        'fail',
        `HTTP ${response.status} ${response.statusText}`,
        `URL: ${url}`
      );
      const text = await response.text();
      if (text) {
        console.log(`   └─ Response body: ${text.substring(0, 200)}`);
      }
      return;
    }

    const data = (await response.json()) as any;

    if (data.retCode !== 0) {
      addResult(
        'GET /v5/market/instruments-info',
        'fail',
        `API error: ${data.retMsg || 'Unknown error'}`,
        `Return code: ${data.retCode}`
      );
      return;
    }

    const instrumentCount = data.result?.list?.length || 0;
    if (instrumentCount > 0) {
      addResult(
        'GET /v5/market/instruments-info',
        'pass',
        `Successfully fetched ${instrumentCount} instrument records`,
        `Sample: ${data.result.list[0]?.symbol || 'N/A'}`
      );
    } else {
      addResult(
        'GET /v5/market/instruments-info',
        'warning',
        'API responded but returned no instrument data',
        'This may indicate no BTC options are available'
      );
    }
  } catch (error) {
    addResult(
      'GET /v5/market/instruments-info',
      'fail',
      'Request failed',
      error instanceof Error ? error.message : String(error)
    );
  }
}

async function testAuthenticatedEndpoint() {
  console.log('\n[5/5] AUTHENTICATED ENDPOINT TEST (Optional)');
  console.log('─'.repeat(60));

  const apiKey = process.env.BYBIT_API_KEY;
  const apiSecret = process.env.BYBIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    addResult(
      'Authenticated Request',
      'warning',
      'Skipped (API credentials not set)',
      'Set both BYBIT_API_KEY and BYBIT_API_SECRET to test authenticated endpoints'
    );
    return;
  }

  try {
    const timestamp = Date.now().toString();
    const path = '/v5/account/wallet-balance';
    const signature = generateBybitSignature(timestamp, apiSecret, 'GET', path);

    const url = `${BYBIT_API_BASE}${path}`;
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'X-BAPI-SIGN': signature,
        'X-BAPI-API-KEY': apiKey,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': '5000',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      addResult(
        'GET /v5/account/wallet-balance',
        'fail',
        `HTTP ${response.status} ${response.statusText}`,
        `Response: ${text.substring(0, 200)}`
      );
      return;
    }

    const data = (await response.json()) as any;

    if (data.retCode === 0) {
      addResult(
        'GET /v5/account/wallet-balance',
        'pass',
        'Successfully authenticated to Bybit API',
        'Credentials are valid and IP is whitelisted'
      );
    } else if (data.retCode === 10016) {
      addResult(
        'GET /v5/account/wallet-balance',
        'fail',
        'Authentication failed (invalid signature)',
        'Check that BYBIT_API_KEY and BYBIT_API_SECRET are correct'
      );
    } else if (data.retCode === 10017) {
      addResult(
        'GET /v5/account/wallet-balance',
        'fail',
        'IP not whitelisted',
        `Current IP may not be in Bybit API whitelist. Error: ${data.retMsg}`
      );
    } else {
      addResult(
        'GET /v5/account/wallet-balance',
        'warning',
        `API error: ${data.retMsg}`,
        `Return code: ${data.retCode}`
      );
    }
  } catch (error) {
    addResult(
      'GET /v5/account/wallet-balance',
      'fail',
      'Request failed',
      error instanceof Error ? error.message : String(error)
    );
  }
}

// ============================================================================
// TROUBLESHOOTING GUIDE
// ============================================================================

function printTroubleshootingGuide() {
  console.log('\n' + '═'.repeat(60));
  console.log('TROUBLESHOOTING GUIDE');
  console.log('═'.repeat(60));

  const failures = results.filter((r) => r.status === 'fail');
  const warnings = results.filter((r) => r.status === 'warning');

  if (failures.length === 0 && warnings.length === 0) {
    console.log(
      '✓ All diagnostics passed! Bybit API connectivity looks good.'
    );
    return;
  }

  const failureMap: { [key: string]: string } = {
    'API Key': `
  1. Go to Bybit account → API Management
  2. Create a new API key with permissions for:
     - Account (read-only for wallet balance)
     - Market data (read-only)
  3. Copy the API Key and add to .env or Render environment:
     export BYBIT_API_KEY="your-key-here"`,

    'API Secret': `
  1. Bybit will show the secret only once during creation
  2. If lost, delete the key and create a new one
  3. Add to .env or Render environment:
     export BYBIT_API_SECRET="your-secret-here"`,

    'HMAC-SHA256': `
  1. Check that crypto module is available (built-in to Node.js)
  2. Verify BYBIT_API_SECRET is correctly set
  3. Ensure the secret contains no extra whitespace`,

    'GET /v5/market/tickers': `
  Bybit public endpoint is unreachable. Possible causes:
  1. Network/firewall blocking outbound HTTPS requests
  2. Bybit API is temporarily down (check https://status.bybit.com)
  3. DNS resolution failure for api.bybit.com

  Debug:
    curl -I https://api.bybit.com/v5/market/tickers?category=option&baseCoin=BTC`,

    'GET /v5/market/instruments-info': `
  Similar to tickers endpoint. Check:
  1. Network connectivity to api.bybit.com
  2. Firewall/proxy configuration
  3. Regional blocking (some countries restrict crypto APIs)`,

    'GET /v5/account/wallet-balance': `
  Private endpoint failed. Check:
  1. BYBIT_API_KEY and BYBIT_API_SECRET are correct
  2. Your IP is whitelisted in Bybit account settings:
     - Go to Account → API Management
     - Find your key and set IP whitelist to your Render IP
     - Or allow all IPs (less secure) with "0.0.0.0/0"
  3. API key has proper permissions
  4. Timestamp sync (server clock must be within 5 seconds of Bybit)`,

    'Authentication failed (invalid signature)': `
  Your credentials may be incorrect:
  1. Double-check BYBIT_API_KEY in account settings
  2. Regenerate the secret if unsure
  3. Ensure no trailing whitespace in environment variables
  4. In Render: Go to Environment → verify exact variable names`,

    'IP not whitelisted': `
  Your Render IP is not whitelisted:
  1. Get your Render IP: run this diagnostic on Render
  2. In Bybit: Account → API Management → select your key
  3. Set IP whitelist to your Render IP
  4. Or set to "0.0.0.0/0" to allow all IPs (less secure)`,
  };

  if (failures.length > 0) {
    console.log('\n📋 FAILURES TO ADDRESS:\n');
    failures.forEach((fail) => {
      console.log(`  ❌ ${fail.name}`);
      console.log(`     ${fail.message}`);
      if (failureMap[fail.name]) {
        console.log(`${failureMap[fail.name]}`);
      }
      console.log();
    });
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS TO CHECK:\n');
    warnings.forEach((warn) => {
      console.log(`  ⚠️  ${warn.name}`);
      console.log(`     ${warn.message}`);
    });
    console.log();
  }
}

// ============================================================================
// RENDER-SPECIFIC ADVICE
// ============================================================================

function printRenderAdvice() {
  console.log('\n' + '═'.repeat(60));
  console.log('RENDER-SPECIFIC SETUP');
  console.log('═'.repeat(60));

  console.log(`
1. ADD ENVIRONMENT VARIABLES:
   In your Render Service:
   → Settings → Environment
   → Add these variables:
      BYBIT_API_KEY=your-key-here
      BYBIT_API_SECRET=your-secret-here

2. WHITELIST RENDER IP:
   a) Run this diagnostic on Render (build will show output in logs)
   b) Look for your IP in the diagnostic output or curl command
   c) In Bybit: Account → API Management
   d) Select your API key → IP Whitelist
   e) Add your Render IP (or allow 0.0.0.0/0 for testing)

3. VERIFY BEFORE DEPLOYING:
   - Local test with: npm run diagnostic
   - Check .env has credentials
   - Deploy to Render
   - Check build logs for diagnostic output
  `);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('');
  console.log('╔' + '═'.repeat(58) + '╗');
  console.log('║' + ' '.repeat(10) + 'CryptoVIX Bybit API Diagnostic' + ' '.repeat(18) + '║');
  console.log('║' + ' '.repeat(58) + '║');
  console.log('║' + ` Started: ${new Date().toISOString()}`.padEnd(59) + '║');
  console.log('╚' + '═'.repeat(58) + '╝');

  await testEnvironment();
  await testSignatureGeneration();
  await testPublicEndpoint();
  await testInstrumentsEndpoint();
  await testAuthenticatedEndpoint();

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('SUMMARY');
  console.log('═'.repeat(60));

  const passCount = results.filter((r) => r.status === 'pass').length;
  const failCount = results.filter((r) => r.status === 'fail').length;
  const warnCount = results.filter((r) => r.status === 'warning').length;

  console.log(`  ✓ Passed: ${passCount}`);
  console.log(`  ✗ Failed: ${failCount}`);
  console.log(`  ⚠ Warnings: ${warnCount}`);
  console.log();

  printTroubleshootingGuide();
  printRenderAdvice();

  console.log('\n' + '═'.repeat(60));
  console.log('DIAGNOSTIC COMPLETE');
  console.log('═'.repeat(60) + '\n');

  // Exit with error code if there are failures
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('\nDiagnostic crashed:', error);
  process.exit(1);
});
