const DERIBIT_API = 'https://www.deribit.com/api/v2';
const BYBIT_API = 'https://api.bybit.com/v5/market';

export interface FetchedData {
  deribitDvol: number;
  bybitIv: number;
  btcPrice: number;
  timestamp: Date;
}

export async function fetchDeribitDVOL(): Promise<number> {
  const now = Date.now();
  const oneHourAgo = now - 3600000; // 1 hour in ms
  const response = await fetch(
    `${DERIBIT_API}/public/get_volatility_index_data?currency=BTC&resolution=3600&start_timestamp=${oneHourAgo}&end_timestamp=${now}`
  );
  const data = (await response.json()) as any;
  // data.result.data is [[timestamp, open, high, low, close], ...]
  if (!data.result?.data || data.result.data.length === 0) {
    throw new Error('Deribit DVOL returned no candle data');
  }
  return data.result.data[data.result.data.length - 1][4]; // last close/current value
}

export async function fetchBybitIV(): Promise<number> {
  try {
    // Get BTC option ticker data to calculate implied volatility
    const response = await fetch(
      `${BYBIT_API}/tickers?category=option&baseCoin=BTC&limit=1000`
    );
    const data = (await response.json()) as any;

    if (!data.result?.list || data.result.list.length === 0) {
      throw new Error('Bybit returned no option data');
    }

    // Calculate weighted average IV from options using markIv (Mark Implied Volatility)
    let totalIV = 0;
    let count = 0;

    for (const option of data.result.list) {
      const markIv = parseFloat(option.markIv || '0');
      if (markIv > 0) {
        totalIV += markIv; // Already in decimal form (e.g., 0.45 for 45%)
        count++;
      }
    }

    if (count === 0) {
      console.warn('Bybit options have no IV data');
      return 0; // Return 0 if no IV available
    }

    return (totalIV / count) * 100; // Convert to percentage and return average IV
  } catch (error) {
    console.warn('Bybit IV fetch failed:', error instanceof Error ? error.message : String(error));
    return 0; // Fallback to 0 if Bybit fails
  }
}

export async function fetchBtcPrice(): Promise<number> {
  const response = await fetch(
    `${DERIBIT_API}/public/get_index_price?index_name=btc_usd`
  );
  const data = (await response.json()) as any;
  return data.result.index_price;
}

export async function fetchAll(): Promise<FetchedData> {
  const [dvol, bybitIv, btcPrice] = await Promise.all([
    fetchDeribitDVOL(),
    fetchBybitIV(),
    fetchBtcPrice(),
  ]);
  return { deribitDvol: dvol, bybitIv, btcPrice, timestamp: new Date() };
}
