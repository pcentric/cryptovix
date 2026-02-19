const DERIBIT_API = 'https://www.deribit.com/api/v2';
const BYBIT_API = 'https://api.bybit.com/v5/market';

export interface FetchedData {
  deribitDvol: number;
  bybitIv: number;
  btcPrice: number;
  timestamp: Date;
}

export async function fetchDeribitDVOL(): Promise<number> {
  try {
    const now = Date.now();
    const oneHourAgo = now - 3600000; // 1 hour in ms
    const response = await fetch(
      `${DERIBIT_API}/public/get_volatility_index_data?currency=BTC&resolution=3600&start_timestamp=${oneHourAgo}&end_timestamp=${now}`
    );
    const data = (await response.json()) as any;
    // data.result.data is [[timestamp, open, high, low, close], ...]
    if (!data.result?.data || data.result.data.length === 0) {
      console.warn('[fetcher] Deribit DVOL returned no candle data');
      return 0;
    }
    return data.result.data[data.result.data.length - 1][4]; // last close/current value
  } catch (error) {
    console.warn('[fetcher] Deribit DVOL fetch failed:', error instanceof Error ? error.message : String(error));
    return 0;
  }
}

export async function fetchBybitIV(spotUsd?: number): Promise<number> {
  try {
    // Get BTC option ticker data and instruments info
    const [tickersRes, instrumentsRes] = await Promise.all([
      fetch(`${BYBIT_API}/tickers?category=option&baseCoin=BTC&limit=1000`),
      fetch(`${BYBIT_API}/instruments-info?category=option&baseCoin=BTC&limit=1000`),
    ]);

    const tickersData = (await tickersRes.json()) as any;
    const instrumentsData = (await instrumentsRes.json()) as any;

    if (!tickersData.result?.list || tickersData.result.list.length === 0) {
      throw new Error('Bybit returned no option data');
    }

    // Build instruments map for delivery time lookup
    const instrumentsMap: { [symbol: string]: any } = {};
    for (const inst of instrumentsData.result?.list || []) {
      instrumentsMap[inst.symbol] = inst;
    }

    // Helper: parse Bybit symbol BTC-29MAR24-70000-C or BTC-24APR26-48000-C-USDT
    const parseBybitSymbol = (symbol: string) => {
      const parts = symbol.split('-');
      if (parts.length < 4) return null;

      // Handle -USDT suffix in new format
      let dateStr: string;
      if (parts[parts.length - 1].toUpperCase() === 'USDT') {
        dateStr = parts[1]; // e.g., "24APR26"
      } else {
        dateStr = parts[1]; // e.g., "29MAR24"
      }

      const day = parseInt(dateStr.substring(0, 2));
      const monthStr = dateStr.substring(2, 5);
      const year = parseInt('20' + dateStr.substring(5, 7));
      const monthMap: { [key: string]: number } = {
        JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
        JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
      };
      const expiryDate = new Date(year, monthMap[monthStr], day, 8, 0, 0, 0);
      return { expiryMs: expiryDate.getTime() };
    };

    // Collect options with DTE calculations
    const MS_PER_DAY = 86_400_000;
    const now = Date.now();
    const optionsByExpiry: { [expiryMs: number]: { dte: number; options: any[] } } = {};

    for (const ticker of tickersData.result.list) {
      let expiryMs: number | null = null;
      const instrument = instrumentsMap[ticker.symbol];

      if (instrument && instrument.deliveryTime) {
        expiryMs = parseInt(instrument.deliveryTime);
      } else {
        const parsed = parseBybitSymbol(ticker.symbol);
        expiryMs = parsed?.expiryMs ?? null;
      }

      if (!expiryMs) continue;

      const dte = (expiryMs - now) / MS_PER_DAY;
      if (dte <= 0) continue; // Skip expired options

      const markIv = parseFloat(ticker.markIv || '0');
      if (markIv <= 0) continue; // Skip invalid IV

      // Parse symbol (handle -USDT suffix in new format)
      const parts = ticker.symbol.split('-');
      let strike: number;
      let type: string;
      if (parts[parts.length - 1].toUpperCase() === 'USDT') {
        strike = parseFloat(parts[parts.length - 3]);
        type = parts[parts.length - 2].toUpperCase();
      } else {
        strike = parseFloat(parts[parts.length - 2]);
        type = parts[parts.length - 1].toUpperCase();
      }
      const delta = parseFloat(ticker.delta || '0');

      if (!optionsByExpiry[expiryMs]) {
        optionsByExpiry[expiryMs] = { dte, options: [] };
      }
      optionsByExpiry[expiryMs].options.push({
        strike,
        type,
        markIv,
        delta,
      });
    }

    // Find expiry closest to 30 DTE
    let closestExpiry: number | null = null;
    let closestDte: number | null = null;
    let minDteDiff = Infinity;

    for (const expiryMs in optionsByExpiry) {
      const dte = optionsByExpiry[expiryMs].dte;
      const dteDiff = Math.abs(dte - 30);
      if (dteDiff < minDteDiff) {
        minDteDiff = dteDiff;
        closestExpiry = parseInt(expiryMs);
        closestDte = dte;
      }
    }

    if (!closestExpiry) {
      console.warn('Bybit: no valid expirations found');
      return 0;
    }

    const optionsAtExpiry = optionsByExpiry[closestExpiry].options;

    // Find ATM strike: closest to spot price, or delta fallback
    let atmStrike: number | null = null;
    if (spotUsd && spotUsd > 0) {
      // Primary: strike closest to spot
      let minStrikeDiff = Infinity;
      for (const opt of optionsAtExpiry) {
        const strikeDiff = Math.abs(opt.strike - spotUsd);
        if (strikeDiff < minStrikeDiff) {
          minStrikeDiff = strikeDiff;
          atmStrike = opt.strike;
        }
      }
    } else {
      // Fallback: call with delta closest to 0.5
      let bestDeltaDiff = Infinity;
      for (const opt of optionsAtExpiry) {
        if (opt.type === 'C') {
          const deltaDiff = Math.abs(Math.abs(opt.delta) - 0.5);
          if (deltaDiff < bestDeltaDiff) {
            bestDeltaDiff = deltaDiff;
            atmStrike = opt.strike;
          }
        }
      }
    }

    if (!atmStrike) {
      console.warn('Bybit: no ATM strike found at closest expiry');
      return 0;
    }

    // Collect call and put markIv at ATM strike
    const atmOptions = optionsAtExpiry.filter(o => o.strike === atmStrike);
    const callIv = atmOptions.find(o => o.type === 'C')?.markIv ?? null;
    const putIv = atmOptions.find(o => o.type === 'P')?.markIv ?? null;

    let result = 0;
    if (callIv !== null && putIv !== null) {
      result = (callIv + putIv) / 2;
    } else if (callIv !== null) {
      result = callIv;
    } else if (putIv !== null) {
      result = putIv;
    }

    if (result > 0 && closestDte !== null) {
      console.log(
        `[fetcher] Bybit: ATM 30d IV = ${result.toFixed(2)} (expiry: ${Math.round(closestDte)} DTE, strike: ${atmStrike})`
      );
    }

    return result;
  } catch (error) {
    console.warn('Bybit IV fetch failed:', error instanceof Error ? error.message : String(error));
    return 0;
  }
}

export async function fetchBtcPrice(): Promise<number> {
  try {
    const response = await fetch(
      `${DERIBIT_API}/public/get_index_price?index_name=btc_usd`
    );
    const data = (await response.json()) as any;
    return data.result?.index_price ?? 0;
  } catch (error) {
    console.warn('[fetcher] BTC price fetch failed:', error instanceof Error ? error.message : String(error));
    return 0;
  }
}

export async function fetchAll(): Promise<FetchedData> {
  // Fetch BTC price first (fast), then use it for Bybit IV calculation
  const btcPrice = await fetchBtcPrice();
  const [dvol, bybitIv] = await Promise.all([
    fetchDeribitDVOL(),
    fetchBybitIV(btcPrice),
  ]);
  return { deribitDvol: dvol, bybitIv, btcPrice, timestamp: new Date() };
}
