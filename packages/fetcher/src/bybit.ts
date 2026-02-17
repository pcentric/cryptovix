import axios from 'axios';
import { OptionData } from './types';

const BYBIT_API = 'https://api.bybit.com/v5/market';
const INSTRUMENTS_CACHE_MS = 30 * 60 * 1000; // 30 minutes

interface BybitInstrument {
  symbol: string;
  baseCoin: string;
  quoteCoin: string;
  optionsType: string; // 'Call' | 'Put'
  launchTime: string; // timestamp in ms
  deliveryTime: string; // timestamp in ms
  status: string;
}

interface BybitTicker {
  symbol: string;
  bidIv: string;
  askIv: string;
  markIv: string;
  lastPrice: string;
  openInterest: string;
  volume24h: string;
  delta: string;
  gamma: string;
  vega: string;
  theta: string;
}

// In-memory cache for instruments-info
let instrumentsCache: { [symbol: string]: BybitInstrument } | null = null;
let instrumentsCacheTime = 0;

/**
 * Parse Bybit symbol to extract strike, expiry, and type
 * Format: BTC-29MAR24-70000-C or similar variants
 * Fallback parsing if instruments-info is incomplete
 */
function parseBybitSymbol(symbol: string): {
  strike: number;
  expiryMs: number;
  type: 'call' | 'put';
} {
  const parts = symbol.split('-');
  if (parts.length < 4) {
    throw new Error(`Invalid Bybit symbol: ${symbol}`);
  }

  // Last part is the type (C/P)
  const type = parts[parts.length - 1].toUpperCase() === 'C' ? 'call' : 'put';

  // Second-to-last is the strike
  const strike = parseFloat(parts[parts.length - 2]);

  // Second part is the expiry date (e.g., "29MAR24")
  const dateStr = parts[1];
  const day = parseInt(dateStr.substring(0, 2));
  const monthStr = dateStr.substring(2, 5);
  const year = parseInt('20' + dateStr.substring(5, 7));

  const monthMap: { [key: string]: number } = {
    JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
    JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
  };

  const expiryDate = new Date(year, monthMap[monthStr], day, 8, 0, 0, 0);
  const expiryMs = expiryDate.getTime();

  return { strike, expiryMs, type };
}

/**
 * Fetch Bybit instruments info with 30-minute cache
 */
async function fetchBybitInstruments(): Promise<{ [symbol: string]: BybitInstrument }> {
  const now = Date.now();

  // Return cached data if still valid
  if (instrumentsCache && now - instrumentsCacheTime < INSTRUMENTS_CACHE_MS) {
    return instrumentsCache;
  }

  try {
    const response = await axios.get(`${BYBIT_API}/instruments-info`, {
      params: {
        category: 'option',
        baseCoin: 'BTC',
        limit: 1000,
      },
    });

    const instruments = response.data.result?.list || [];
    const cache: { [symbol: string]: BybitInstrument } = {};

    for (const inst of instruments) {
      cache[inst.symbol] = inst;
    }

    instrumentsCache = cache;
    instrumentsCacheTime = now;

    console.log(`Cached ${Object.keys(cache).length} Bybit instruments`);
    return cache;
  } catch (error) {
    console.warn('Bybit instruments-info fetch failed:', error instanceof Error ? error.message : String(error));
    // Return empty cache or previous cache if available
    return instrumentsCache || {};
  }
}

/**
 * Fetch Bybit option tickers
 */
async function fetchBybitTickers(): Promise<BybitTicker[]> {
  try {
    const response = await axios.get(`${BYBIT_API}/tickers`, {
      params: {
        category: 'option',
        baseCoin: 'BTC',
        limit: 1000,
      },
    });

    return response.data.result?.list || [];
  } catch (error) {
    console.warn('Bybit tickers fetch failed:', error instanceof Error ? error.message : String(error));
    return [];
  }
}

/**
 * Fetch Bybit option data and normalize to OptionData format
 */
export async function fetchBybit(): Promise<OptionData[]> {
  try {
    // Fetch both instruments info (cached) and tickers in parallel
    const [instrumentsMap, tickers] = await Promise.all([
      fetchBybitInstruments(),
      fetchBybitTickers(),
    ]);

    const now = new Date();
    const result: OptionData[] = [];

    for (const ticker of tickers) {
      const symbol = ticker.symbol;

      // Parse using instruments-info if available, otherwise fallback to symbol parsing
      let strike: number;
      let expiryMs: number;
      let type: 'call' | 'put';

      const instrument = instrumentsMap[symbol];
      if (instrument) {
        // Use instruments-info data
        const deliveryTime = parseInt(instrument.deliveryTime);
        expiryMs = deliveryTime;
        type = instrument.optionsType.toLowerCase() === 'call' ? 'call' : 'put';

        // Extract strike from symbol as fallback
        try {
          const parts = symbol.split('-');
          strike = parseFloat(parts[parts.length - 2]);
        } catch {
          continue;
        }
      } else {
        // Fallback: parse from symbol
        try {
          const parsed = parseBybitSymbol(symbol);
          strike = parsed.strike;
          expiryMs = parsed.expiryMs;
          type = parsed.type;
        } catch {
          continue;
        }
      }

      // Parse IV values
      const markIv = parseFloat(ticker.markIv || '0') / 100; // Convert from percentage
      const bidIv = parseFloat(ticker.bidIv || '0') / 100;
      const askIv = parseFloat(ticker.askIv || '0') / 100;

      // Skip if markIv is invalid
      if (markIv <= 0) {
        continue;
      }

      result.push({
        exchange: 'bybit',
        instrument: symbol,
        strike,
        expiry: new Date(expiryMs),
        type,
        markIv,
        bidIv,
        askIv,
        openInterest: parseFloat(ticker.openInterest || '0'),
        volume24h: parseFloat(ticker.volume24h || '0'),
        underlyingPrice: 0, // Bybit tickers don't include underlying price
        timestamp: now,
      });
    }

    return result;
  } catch (error) {
    console.error('Bybit fetch failed:', error);
    return [];
  }
}
