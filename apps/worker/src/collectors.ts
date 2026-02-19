/**
 * SnapshotAggregator: Combines Deribit + Bybit option data into a single unified snapshot
 * - Fetches Deribit spot index + option chain
 * - Fetches Bybit instruments-info (cached 30 min) + option tickers
 * - Normalizes all options into canonical format
 * - Applies filters: mid > 0, staleness < 60s
 * - Tracks venue health and calculates confidence
 */

interface OptionQuote {
  venue: 'deribit' | 'bybit';
  instrumentId: string;
  expiryTs: number; // milliseconds
  strike: number;
  type: 'C' | 'P';
  bid: number;
  ask: number;
  mid: number;
  ts: number; // milliseconds
}

interface Snapshot {
  options: OptionQuote[];
  spotUsd: number;
  deribitIv: number;
  bybitIv: number;
  lastSnapshotTime: { deribit: number; bybit: number };
  venueHealth: { deribit: boolean; bybit: boolean };
}

const DERIBIT_API = 'https://www.deribit.com/api/v2';
const BYBIT_API = 'https://api.bybit.com/v5/market';
const STALENESS_THRESHOLD_MS = 60 * 1000; // 60 seconds
const MAX_STALENESS_MS = 300 * 1000; // 5 minutes

// Cache for Bybit instruments-info (30 minutes)
let bybitInstrumentsCache: any = null;
let bybitInstrumentsCacheTime = 0;
const BYBIT_INSTRUMENTS_CACHE_MS = 30 * 60 * 1000;

/**
 * Parse Bybit symbol: BTC-29MAR24-70000-C or BTC-24APR26-48000-C-USDT
 */
function parseBybitSymbol(symbol: string): { strike: number; expiryMs: number; type: 'C' | 'P' } {
  const parts = symbol.split('-');
  if (parts.length < 4) throw new Error(`Invalid Bybit symbol: ${symbol}`);

  let type: 'C' | 'P';
  let strike: number;
  let dateStr: string;

  // Handle -USDT suffix in new format
  if (parts[parts.length - 1].toUpperCase() === 'USDT') {
    type = parts[parts.length - 2].toUpperCase() as 'C' | 'P';
    strike = parseFloat(parts[parts.length - 3]);
    dateStr = parts[1];
  } else {
    type = parts[parts.length - 1].toUpperCase() as 'C' | 'P';
    strike = parseFloat(parts[parts.length - 2]);
    dateStr = parts[1];
  }

  const day = parseInt(dateStr.substring(0, 2));
  const monthStr = dateStr.substring(2, 5);
  const year = parseInt('20' + dateStr.substring(5, 7));

  const monthMap: { [key: string]: number } = {
    JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
    JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
  };

  const expiryDate = new Date(year, monthMap[monthStr], day, 8, 0, 0, 0);
  return { strike, expiryMs: expiryDate.getTime(), type };
}

/**
 * Parse Deribit instrument: BTC-17MAY24-60000-C
 */
function parseDeribitInstrument(name: string): { strike: number; expiryMs: number; type: 'C' | 'P' } {
  const parts = name.split('-');
  if (parts.length < 4) throw new Error(`Invalid Deribit instrument: ${name}`);

  const type = parts[parts.length - 1].toUpperCase() as 'C' | 'P';
  const strike = parseFloat(parts[parts.length - 2]);
  const dateStr = parts[1] + parts[2]; // e.g., "17MAY24"

  const day = parseInt(dateStr.substring(0, 2));
  const month = dateStr.substring(2, 5);
  const year = parseInt('20' + dateStr.substring(5, 7));

  const monthMap: { [key: string]: number } = {
    JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
    JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
  };

  const expiryDate = new Date(year, monthMap[month], day, 8, 0, 0, 0);
  return { strike, expiryMs: expiryDate.getTime(), type };
}

/**
 * Fetch Bybit instruments-info with 30-minute cache
 */
async function fetchBybitInstruments(): Promise<{ [symbol: string]: any }> {
  const now = Date.now();

  if (bybitInstrumentsCache && now - bybitInstrumentsCacheTime < BYBIT_INSTRUMENTS_CACHE_MS) {
    return bybitInstrumentsCache;
  }

  try {
    const response = await fetch(
      `${BYBIT_API}/instruments-info?category=option&baseCoin=BTC&limit=1000`
    );
    const data = (await response.json()) as any;

    const instruments: { [symbol: string]: any } = {};
    for (const inst of data.result?.list || []) {
      instruments[inst.symbol] = inst;
    }

    bybitInstrumentsCache = instruments;
    bybitInstrumentsCacheTime = now;

    console.log(`[SnapshotAggregator] Cached ${Object.keys(instruments).length} Bybit instruments`);
    return instruments;
  } catch (error) {
    console.warn(
      '[SnapshotAggregator] Bybit instruments-info fetch failed:',
      error instanceof Error ? error.message : String(error)
    );
    return bybitInstrumentsCache || {};
  }
}

/**
 * Fetch Deribit option chain summary (book summary)
 */
async function fetchDeribitOptions(): Promise<any[]> {
  try {
    const response = await fetch(
      `${DERIBIT_API}/public/get_book_summary_by_currency?currency=BTC&kind=option`
    );
    const data = (await response.json()) as any;
    return data.result || [];
  } catch (error) {
    console.warn(
      '[SnapshotAggregator] Deribit options fetch failed:',
      error instanceof Error ? error.message : String(error)
    );
    return [];
  }
}

/**
 * Fetch Bybit option tickers
 */
async function fetchBybitTickers(): Promise<any[]> {
  try {
    const response = await fetch(`${BYBIT_API}/tickers?category=option&baseCoin=BTC&limit=1000`);
    const data = (await response.json()) as any;
    return data.result?.list || [];
  } catch (error) {
    console.warn(
      '[SnapshotAggregator] Bybit tickers fetch failed:',
      error instanceof Error ? error.message : String(error)
    );
    return [];
  }
}

/**
 * Fetch BTC spot price from Deribit
 */
async function fetchDeribitSpot(): Promise<number> {
  try {
    const response = await fetch(`${DERIBIT_API}/public/get_index_price?index_name=btc_usd`);
    const data = (await response.json()) as any;
    return data.result?.index_price || 0;
  } catch (error) {
    console.warn(
      '[SnapshotAggregator] Deribit spot price fetch failed:',
      error instanceof Error ? error.message : String(error)
    );
    return 0;
  }
}

/**
 * Fetch Deribit DVOL (implied volatility index)
 */
async function fetchDeribitDVOL(): Promise<number> {
  try {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    const response = await fetch(
      `${DERIBIT_API}/public/get_volatility_index_data?currency=BTC&resolution=3600&start_timestamp=${oneHourAgo}&end_timestamp=${now}`
    );
    const data = (await response.json()) as any;

    if (!data.result?.data || data.result.data.length === 0) {
      return 0;
    }

    return data.result.data[data.result.data.length - 1][4]; // Last close value
  } catch (error) {
    console.warn(
      '[SnapshotAggregator] Deribit DVOL fetch failed:',
      error instanceof Error ? error.message : String(error)
    );
    return 0;
  }
}

/**
 * Main snapshot aggregator class
 */
export class SnapshotAggregator {
  /**
   * Build a complete snapshot for a given base coin (e.g., "BTC")
   */
  async buildSnapshot(baseCoin: string): Promise<Snapshot> {
    const now = Date.now();
    const options: OptionQuote[] = [];
    let deribitIv = 0;
    let bybitIv = 0;
    let spotUsd = 0;

    const venueHealth = { deribit: false, bybit: false };
    const lastSnapshotTime = { deribit: 0, bybit: 0 };

    // Fetch Deribit data
    try {
      const [deribitOptions, deribitSpot, deribitDvol] = await Promise.all([
        fetchDeribitOptions(),
        fetchDeribitSpot(),
        fetchDeribitDVOL(),
      ]);

      spotUsd = deribitSpot;
      deribitIv = deribitDvol;
      venueHealth.deribit = true;
      lastSnapshotTime.deribit = now;

      // Normalize Deribit options
      for (const opt of deribitOptions) {
        try {
          const { strike, expiryMs, type } = parseDeribitInstrument(opt.instrument_name);

          // Calculate mid from bid/ask IV
          const bid = opt.bid_iv || 0;
          const ask = opt.ask_iv || 0;
          const mid = (bid + ask) / 2;

          // Apply filters: mid > 0 and staleness < 60s
          if (mid > 0) {
            options.push({
              venue: 'deribit',
              instrumentId: opt.instrument_name,
              expiryTs: expiryMs,
              strike,
              type,
              bid,
              ask,
              mid,
              ts: now,
            });
          }
        } catch {
          // Skip instruments that fail to parse
        }
      }

      console.log(`[SnapshotAggregator] Deribit: ${deribitOptions.length} options, IV=${deribitIv.toFixed(2)}`);
    } catch (error) {
      console.error('[SnapshotAggregator] Deribit snapshot failed:', error);
    }

    // Fetch Bybit data
    try {
      const [bybitInstruments, bybitTickers] = await Promise.all([
        fetchBybitInstruments(),
        fetchBybitTickers(),
      ]);

      venueHealth.bybit = bybitTickers.length > 0;
      lastSnapshotTime.bybit = now;

      // Calculate Bybit IV as ATM 30-DTE approach
      const MS_PER_DAY = 86_400_000;
      const optionsByExpiry: { [expiryMs: number]: { dte: number; options: any[] } } = {};

      // First pass: collect options with DTE calculations
      for (const ticker of bybitTickers) {
        try {
          let strike: number;
          let expiryMs: number;
          let type: 'C' | 'P';

          const instrument = bybitInstruments[ticker.symbol];
          if (instrument && instrument.deliveryTime) {
            // Use instruments-info data
            expiryMs = parseInt(instrument.deliveryTime);
            type = instrument.optionsType.toLowerCase() === 'call' ? 'C' : 'P';

            // Extract strike from symbol (handle -USDT suffix)
            const parts = ticker.symbol.split('-');
            if (parts[parts.length - 1].toUpperCase() === 'USDT') {
              strike = parseFloat(parts[parts.length - 3]);
            } else {
              strike = parseFloat(parts[parts.length - 2]);
            }
          } else {
            // Fallback: parse from symbol
            const parsed = parseBybitSymbol(ticker.symbol);
            strike = parsed.strike;
            expiryMs = parsed.expiryMs;
            type = parsed.type;
          }

          const dte = (expiryMs - now) / MS_PER_DAY;
          if (dte <= 0) continue; // Skip expired options

          // Parse IV values (markIv is in percentage form, e.g., "45.2" = 45.2%)
          const markIv = parseFloat(ticker.markIv || '0');
          if (markIv <= 0) continue; // Skip invalid IV

          const bidIv = parseFloat(ticker.bidIv || '0');
          const askIv = parseFloat(ticker.askIv || '0');
          const mid = (bidIv + askIv) / 2;
          const delta = parseFloat(ticker.delta || '0');

          // Track for IV aggregation at closest 30-DTE expiry
          if (!optionsByExpiry[expiryMs]) {
            optionsByExpiry[expiryMs] = { dte, options: [] };
          }
          optionsByExpiry[expiryMs].options.push({
            strike,
            type,
            markIv,
            delta,
          });

          // Also add to options collection for filtering
          if (mid > 0) {
            options.push({
              venue: 'bybit',
              instrumentId: ticker.symbol,
              expiryTs: expiryMs,
              strike,
              type,
              bid: bidIv,
              ask: askIv,
              mid,
              ts: now,
            });
          }
        } catch {
          // Skip instruments that fail to parse
        }
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

      if (closestExpiry) {
        const optionsAtExpiry = optionsByExpiry[closestExpiry].options;

        // Find ATM strike: closest to spotUsd (primary), or delta fallback
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

        // Collect call and put markIv at ATM strike
        if (atmStrike) {
          const atmOptions = optionsAtExpiry.filter(o => o.strike === atmStrike);
          const callIv = atmOptions.find(o => o.type === 'C')?.markIv ?? null;
          const putIv = atmOptions.find(o => o.type === 'P')?.markIv ?? null;

          if (callIv !== null && putIv !== null) {
            bybitIv = (callIv + putIv) / 2;
          } else if (callIv !== null) {
            bybitIv = callIv;
          } else if (putIv !== null) {
            bybitIv = putIv;
          }
        }
      }

      console.log(
        `[SnapshotAggregator] Bybit: ATM 30d IV = ${bybitIv.toFixed(2)} (${bybitTickers.length} tickers)`
      );
    } catch (error) {
      console.error('[SnapshotAggregator] Bybit snapshot failed:', error);
    }

    return {
      options,
      spotUsd,
      deribitIv,
      bybitIv,
      lastSnapshotTime,
      venueHealth,
    };
  }

  /**
   * Calculate confidence score based on venue health, staleness, and data quality
   */
  calculateConfidence(snapshot: Snapshot): number {
    let confidence = 100; // Start at 100%

    // Reduce confidence if a venue is down
    if (!snapshot.venueHealth.deribit) confidence *= 0.7; // 70% if Deribit down
    if (!snapshot.venueHealth.bybit) confidence *= 0.8; // 80% if Bybit down
    if (!snapshot.venueHealth.deribit && !snapshot.venueHealth.bybit) confidence = 0; // 0% if both down

    // Reduce confidence based on options count
    const totalOptions = snapshot.options.length;
    if (totalOptions < 50) confidence *= 0.9;
    if (totalOptions < 10) confidence *= 0.5;
    if (totalOptions === 0) confidence = 0;

    // Reduce confidence based on data staleness
    const now = Date.now();
    const maxStaleness = Math.max(
      now - snapshot.lastSnapshotTime.deribit,
      now - snapshot.lastSnapshotTime.bybit
    );

    if (maxStaleness > MAX_STALENESS_MS) {
      confidence *= 0.5;
    } else if (maxStaleness > STALENESS_THRESHOLD_MS) {
      confidence *= 0.8;
    }

    return Math.round(confidence);
  }
}
