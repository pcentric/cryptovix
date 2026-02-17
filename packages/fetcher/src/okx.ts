import axios from 'axios';
import { OptionData } from './types';

interface OKXOption {
  instId: string;
  markVol?: number;
  bidVol?: number;
  askVol?: number;
  oi?: number;
  vol24h?: number;
  fwdPx?: number;
}

/**
 * Parses OKX instrument ID to extract strike, expiry, and type
 * Format: BTC-USD-240517-60000-C
 */
function parseOKXInstrument(instId: string): { strike: number; expiry: Date; type: 'call' | 'put' } {
  const parts = instId.split('-');
  if (parts.length < 5) throw new Error(`Invalid OKX instrument: ${instId}`);

  const type = parts[parts.length - 1].toUpperCase() === 'C' ? 'call' : 'put';
  const strike = parseFloat(parts[parts.length - 2]);
  const dateStr = parts[2]; // e.g., "240517"

  const year = 2000 + parseInt(dateStr.substring(0, 2));
  const month = parseInt(dateStr.substring(2, 4)) - 1;
  const day = parseInt(dateStr.substring(4, 6));

  const expiry = new Date(year, month, day, 8, 0, 0, 0);
  return { strike, expiry, type };
}

export async function fetchOKX(): Promise<OptionData[]> {
  try {
    const response = await axios.get(
      'https://www.okx.com/api/v5/public/opt-summary',
      {
        params: { instFamily: 'BTC-USD' },
      }
    );

    const now = new Date();
    const result: OptionData[] = [];

    for (const option of response.data.data || []) {
      const okxOption = option as OKXOption;

      // Skip if markVol is invalid
      if (!okxOption.markVol || okxOption.markVol <= 0) {
        continue;
      }

      try {
        const { strike, expiry, type } = parseOKXInstrument(okxOption.instId);

        result.push({
          exchange: 'okx',
          instrument: okxOption.instId,
          strike,
          expiry,
          type,
          markIv: okxOption.markVol,
          bidIv: okxOption.bidVol ?? 0,
          askIv: okxOption.askVol ?? 0,
          openInterest: okxOption.oi ?? 0,
          volume24h: okxOption.vol24h ?? 0,
          underlyingPrice: okxOption.fwdPx ?? 0,
          timestamp: now,
        });
      } catch (e) {
        // Skip instruments that fail to parse
        continue;
      }
    }

    return result;
  } catch (error) {
    console.error('OKX fetch failed:', error);
    return [];
  }
}
