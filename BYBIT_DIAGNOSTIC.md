# Bybit API Diagnostic Guide

## Overview

The CryptoVIX Bybit diagnostic script helps troubleshoot API connectivity issues in production (Render) and development environments. It validates credentials, tests HMAC-SHA256 signature generation, and makes real API calls to identify where failures occur.

**Current Status**: Bybit public endpoints (market data) are working ✓, but if you see Bybit IV = 0 in production, this guide will help you identify the root cause.

---

## Quick Start

### Local Testing

```bash
# Test without credentials (checks public endpoints only)
npm run diagnostic

# Test with credentials (checks authentication too)
BYBIT_API_KEY="your-key" BYBIT_API_SECRET="your-secret" npm run diagnostic
```

### Production (Render)

The diagnostic runs automatically during the build process and logs output to your build logs. You can also manually trigger it:

```bash
# In Render dashboard: Settings → Build Command
npm run build && npm run diagnostic

# Or manually in Render shell
cd apps/api && npm run diagnostic
```

---

## What the Diagnostic Checks

### 1. **Environment Variables** ✓/✗
- BYBIT_API_KEY is set
- BYBIT_API_SECRET is set
- Current environment (development/production)

### 2. **HMAC-SHA256 Signature Generation** ✓/✗
- Tests signature generation using your API secret
- Verifies the signature is a valid SHA256 hash

### 3. **Public Endpoints** ✓/✗
Tests Bybit's public market data endpoints (no auth required):
- `GET /v5/market/tickers` — BTC options pricing data
- `GET /v5/market/instruments-info` — BTC options metadata

### 4. **Authenticated Endpoints** ⚠/✗ (Optional)
Tests private account endpoints (requires valid credentials):
- `GET /v5/account/wallet-balance` — requires API key + signature

### 5. **Troubleshooting Guide** 📋
Provides context-specific troubleshooting steps for each failure

---

## Interpreting Results

### All Tests Pass ✓

```
✓ Passed: 7
✗ Failed: 0
⚠ Warnings: 0
```

**Good news!** Your Bybit API connectivity is healthy. If Bybit IV is still 0, the issue is likely:
- API rate limiting
- Network timeouts (increase FETCH_TIMEOUT_MS)
- Bybit API returning malformed data (check logs)

---

### Public Endpoints Pass, Authenticated Fails ✗

**Common Scenarios:**

```
✓ GET /v5/market/tickers        — PASS
✓ GET /v5/market/instruments-info — PASS
✗ GET /v5/account/wallet-balance  — FAIL (HTTP 401 Unauthorized)
```

**Likely Cause:** IP is not whitelisted for authenticated requests.

**Fix:**
1. Run diagnostic on Render to get your public IP
2. Go to **Bybit Account → API Management**
3. Select your API key → **IP Whitelist**
4. Add your Render IP (or `0.0.0.0/0` to allow all)
5. Re-run diagnostic

---

### Public Endpoints Fail ✗

```
✗ GET /v5/market/tickers        — FAIL (timeout)
✗ GET /v5/market/instruments-info — FAIL (timeout)
```

**Likely Causes:**
1. **Network/Firewall**: Render instance cannot reach api.bybit.com
2. **DNS failure**: Cannot resolve api.bybit.com hostname
3. **Bybit outage**: Check https://status.bybit.com
4. **Regional blocking**: Some countries restrict crypto API access

**Debug:**
```bash
# From Render console
curl -I https://api.bybit.com/v5/market/tickers

# Check DNS
nslookup api.bybit.com
```

---

### Missing Credentials ⚠

```
⚠ [API Key] BYBIT_API_KEY environment variable not set
⚠ [API Secret] BYBIT_API_SECRET environment variable not set
```

The diagnostic will skip signature testing and authenticated endpoints. This is fine for basic troubleshooting.

**Fix:** Set environment variables in `.env` (local) or Render dashboard (production).

---

## Step-by-Step Troubleshooting

### Problem: Bybit IV = 0 in Production (Render)

**Step 1: Test locally**
```bash
npm run diagnostic
```

If all tests pass locally, the issue is environment-specific:

---

**Step 2: Deploy diagnostic to Render**

Add to your `Render.yaml` or manually:
```yaml
build: npm run build && npm run diagnostic
```

Push to trigger a build and check the logs.

---

**Step 3: Identify the failure**

Look for sections that fail and follow the troubleshooting steps:

| Failure | Likely Cause | Fix |
|---------|--------------|-----|
| Public endpoints timeout | Network blocked | Contact Render support or use a different region |
| Public endpoints return 0 records | API temporarily down | Wait and retry |
| Authenticated endpoint fails (401) | IP not whitelisted | Add your Render IP to Bybit whitelist |
| Authenticated endpoint fails (403) | Insufficient permissions | Re-create API key with proper scopes |
| HMAC signature generation fails | Bad secret | Check secret has no extra whitespace |

---

**Step 4: Verify the fix**

After making changes (e.g., whitelist IP):
```bash
# Trigger a new Render build
git push

# Check build logs for diagnostic output
```

---

## Setting Up Bybit API Credentials

### 1. Create API Key on Bybit

1. Go to **Bybit Account → API Management**
2. Click **Create New Key** (Mainnet)
3. **Key Settings:**
   - **API Key Type:** Standard
   - **Permissions Required:**
     - ✓ Account: read-only (for wallet-balance endpoint)
     - ✓ Market Data: read-only (for option data)
   - **IP Whitelist:** Your Render IP (get from diagnostic)
     - For testing: Allow all IPs (`0.0.0.0/0`)
     - For production: Whitelist specific IPs only

4. **Copy credentials** (shown only once):
   - API Key
   - API Secret

### 2. Store in Render Environment

**Method A: Dashboard**
1. Go to your Render Service → **Settings**
2. **Environment** section
3. Add variables:
   ```
   BYBIT_API_KEY=your-key-here
   BYBIT_API_SECRET=your-secret-here
   ```
4. **Save Changes** (triggers rebuild)

**Method B: CLI (if using Render CLI)**
```bash
render env set BYBIT_API_KEY=your-key-here
render env set BYBIT_API_SECRET=your-secret-here
```

**Method C: Local `.env`** (development only)
```
BYBIT_API_KEY=your-key-here
BYBIT_API_SECRET=your-secret-here
```

---

## Security Considerations

⚠️ **Important:**
- Never commit API keys to git (add `.env` to `.gitignore`)
- Never share your API secret in logs or support tickets
- Use read-only permissions for market data
- Whitelist specific IPs in production
- Rotate keys periodically

The diagnostic script masks keys in output: `test-key...5678`

---

## Expected Output

### Successful Run (With Credentials)

```
╔══════════════════════════════════════════════════════════╗
║          CryptoVIX Bybit API Diagnostic                  ║
║                                                          ║
║ Started: 2026-03-11T08:30:15.725Z                         ║
╚══════════════════════════════════════════════════════════╝

[1/5] ENVIRONMENT VALIDATION
────────────────────────────────────────────────────────────
✓ [API Key] Present and valid (abc12345...def6)
✓ [API Secret] Present (not displayed for security)
✓ [Environment] Running in production mode

[2/5] SIGNATURE GENERATION
────────────────────────────────────────────────────────────
✓ [HMAC-SHA256] Signature generated successfully
   └─ Sample: 4ef965149234f8e14a102646ac678dfd...

[3/5] PUBLIC ENDPOINT TEST
────────────────────────────────────────────────────────────
✓ [GET /v5/market/tickers] Successfully fetched 694 option records
   └─ Sample symbol: BTC-26JUN26-150000-P-USDT

[4/5] INSTRUMENTS ENDPOINT TEST
────────────────────────────────────────────────────────────
✓ [GET /v5/market/instruments-info] Successfully fetched 10 instrument records
   └─ Sample: BTC-25DEC26-67000-P-USDT

[5/5] AUTHENTICATED ENDPOINT TEST (Optional)
────────────────────────────────────────────────────────────
✓ [GET /v5/account/wallet-balance] Successfully authenticated to Bybit API
   └─ Credentials are valid and IP is whitelisted

════════════════════════════════════════════════════════════
SUMMARY
════════════════════════════════════════════════════════════
  ✓ Passed: 7
  ✗ Failed: 0
  ⚠ Warnings: 0
```

---

## Integration with CI/CD

### Render Build Hook

Add to your build command:

```bash
npm run build && npm run diagnostic
```

This will:
1. Compile the TypeScript code
2. Run the diagnostic
3. Show results in build logs
4. Fail the build if critical tests fail (exit code 1)

### GitHub Actions

```yaml
- name: Run Bybit Diagnostic
  run: npm run diagnostic
  working-directory: apps/api
```

---

## Common Issues & Solutions

### Issue: "API Key environment variable not set"
- **Local:** Add to `.env`
- **Render:** Add to Settings → Environment
- Restart/redeploy after adding

### Issue: "IP not whitelisted"
- Run diagnostic on Render to get your IP
- Add to Bybit API Management → IP Whitelist
- Allow 2-5 minutes for Bybit to propagate the change

### Issue: "Invalid signature"
- Verify API_SECRET has no leading/trailing whitespace
- Check that you're not mixing different API keys/secrets
- Regenerate credentials if unsure

### Issue: "Timeout"
- Check Render has outbound HTTPS access
- Verify Bybit status (https://status.bybit.com)
- Increase FETCH_TIMEOUT_MS if needed (currently 10s)

---

## Monitoring & Continuous Testing

For production, consider:

1. **Periodic Diagnostics:**
   ```bash
   # Add cron job to run diagnostic every hour
   0 * * * * npm run diagnostic >> /var/log/bybit-diag.log
   ```

2. **Health Endpoint:**
   ```bash
   curl https://cryptovix-api.onrender.com/api/v1/diagnostics
   ```

3. **Alerting:**
   - Monitor for Bybit IV = 0 alerts
   - Cross-check diagnostic logs when alerts fire

---

## Next Steps

1. **Run locally:** `npm run diagnostic`
2. **Fix any failures** using the troubleshooting guide
3. **Deploy to Render** with credentials set
4. **Verify in production:** Check Bybit IV is no longer 0
5. **Monitor:** Keep an eye on logs for recurring issues

For more help, see:
- Bybit API Docs: https://bybit-exchange.github.io/docs/spot/
- Render Docs: https://render.com/docs
- GitHub Issues: https://github.com/cryptovix/cryptovix/issues
