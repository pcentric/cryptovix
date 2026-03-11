# Bybit Diagnostic Script - Quick Start

## What's New

Created a comprehensive Node.js diagnostic script to troubleshoot why Bybit IV returns 0 in production (Render).

**Files:**
- `apps/api/src/bybit-diagnostic.ts` — Main diagnostic script
- `BYBIT_DIAGNOSTIC.md` — Full documentation & troubleshooting guide
- `apps/api/package.json` — Added `npm run diagnostic` script

---

## 1-Minute Quick Start

### Run Locally
```bash
npm run diagnostic
```

Expected output (without credentials):
```
✓ [GET /v5/market/tickers] Successfully fetched 694 option records
✓ [GET /v5/market/instruments-info] Successfully fetched 10 instrument records
⚠ [HMAC-SHA256 Test] Skipped (API_SECRET not set)
⚠ [Authenticated Request] Skipped (API credentials not set)
```

### If Bybit IV = 0 in Production

1. **Get your Render IP:**
   ```bash
   # Add this to your Render build command temporarily:
   npm run build && npm run diagnostic
   ```
   Look in the build logs for your public IP.

2. **Whitelist the IP:**
   - Go to Bybit → Account → API Management
   - Select your API key
   - Set **IP Whitelist** to your Render IP
   - Save & wait 2-5 minutes for propagation

3. **Deploy & Verify:**
   ```bash
   git push  # Triggers Render rebuild
   ```
   Wait for build to complete, then check if Bybit IV is now populated.

---

## What the Diagnostic Tests

| Test | Purpose | Status |
|------|---------|--------|
| **API Key/Secret** | Environment variables set? | ✓/✗ |
| **HMAC-SHA256** | Can generate signatures? | ✓/✗ |
| **Public Endpoints** | Can fetch Bybit market data? | ✓/✗ |
| **Authenticated** | Can authenticate with credentials? | ✓/✗ |

---

## Most Common Issues & Fixes

### Problem: "IP not whitelisted"
```
✗ [GET /v5/account/wallet-balance] HTTP 401 Unauthorized
```
**Fix:** Add your Render IP to Bybit API whitelist (see step 2 above)

### Problem: "Public endpoints timeout"
```
✗ [GET /v5/market/tickers] Request failed: Fetch failed
```
**Fix:** Check Bybit status (https://status.bybit.com) or contact Render support

### Problem: "Invalid signature"
```
✗ [GET /v5/account/wallet-balance] Invalid signature
```
**Fix:** Verify BYBIT_API_SECRET has no extra whitespace, or regenerate credentials

---

## Setting Up Credentials

### Local Development
Create `.env` in project root:
```
BYBIT_API_KEY=your-key-here
BYBIT_API_SECRET=your-secret-here
```

Then test:
```bash
npm run diagnostic
```

### Production (Render)
In Render Dashboard:
1. Go to your Service → **Settings**
2. **Environment** section
3. Add:
   ```
   BYBIT_API_KEY=your-key-here
   BYBIT_API_SECRET=your-secret-here
   ```
4. **Save** (auto-triggers rebuild)

---

## Getting Bybit API Credentials

1. Go to **Bybit** → Account → **API Management**
2. Click **Create New Key** (Mainnet)
3. Set permissions:
   - ✓ Account: read-only
   - ✓ Market Data: read-only
4. **IP Whitelist:** Set to your Render IP (or `0.0.0.0/0` for testing)
5. Copy API Key & Secret (shown only once!)

---

## Integration with Render

Add diagnostic to your build process:

**Option A: Temporary (for troubleshooting)**
```bash
npm run build && npm run diagnostic
```

**Option B: Permanent (monitoring)**
Add to `render.yaml`:
```yaml
buildCommand: npm run build && npm run diagnostic
```

---

## Output Examples

### ✓ Everything Works
```
════════════════════════════════════════════════════════════
SUMMARY
════════════════════════════════════════════════════════════
  ✓ Passed: 7
  ✗ Failed: 0
  ⚠ Warnings: 0
```

### ⚠ Missing Credentials (Expected)
```
════════════════════════════════════════════════════════════
SUMMARY
════════════════════════════════════════════════════════════
  ✓ Passed: 3
  ✗ Failed: 2
  ⚠ Warnings: 2
```
This is OK — public endpoints work, just missing credentials.

### ✗ IP Not Whitelisted (Render Issue)
```
✗ [GET /v5/account/wallet-balance] HTTP 401 Unauthorized
   └─ IP not whitelisted
```
Fix: Add Render IP to Bybit whitelist (instructions above)

---

## Debugging Tips

### Check if it's a network issue
```bash
# From Render console
curl -I https://api.bybit.com/v5/market/tickers
```

### Verify DNS
```bash
nslookup api.bybit.com
```

### Check Bybit status
https://status.bybit.com

### View production logs
```bash
# In Render dashboard: Logs tab
# Search for: BYBIT RAW IV, diagnostic output
```

---

## What's Happening Behind the Scenes

The diagnostic script:

1. **Checks environment** — Are credentials available?
2. **Tests signature generation** — Can we create valid HMAC-SHA256 signatures?
3. **Calls public endpoints** — Can we reach Bybit and get market data?
4. **Calls private endpoints** — Can we authenticate successfully?
5. **Provides troubleshooting** — Which step failed? Here's the fix.

All tests include detailed error messages to help identify the exact problem.

---

## Next Steps

1. ✅ Run locally: `npm run diagnostic`
2. ✅ Fix any issues from troubleshooting guide
3. ✅ Deploy to Render with credentials
4. ✅ Verify Bybit IV is no longer 0
5. ✅ Keep monitoring logs

For detailed help, see **[BYBIT_DIAGNOSTIC.md](BYBIT_DIAGNOSTIC.md)**
