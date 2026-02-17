export interface FetchedData {
  deribitDvol: number;
  bybitIv: number;
  btcPrice: number;
  timestamp: Date;
}

export interface CryptoVIXResult {
  value: number;
  timestamp: Date;
  components: { deribitIv: number; bybitIv: number; weightedAvg: number };
  metadata: { btcPrice: number };
}

export function buildIndex(data: FetchedData): CryptoVIXResult {
  // Calculate weighted average IV from Deribit (60%) and Bybit (40%)
  const weightedAvg = data.deribitDvol * 0.6 + (data.bybitIv || 0) * 0.4;

  return {
    value: Math.round(weightedAvg * 100) / 100, // Round to 2 decimals
    timestamp: data.timestamp,
    components: {
      deribitIv: Math.round(data.deribitDvol * 100) / 100,
      bybitIv: Math.round((data.bybitIv || 0) * 100) / 100,
      weightedAvg: Math.round(weightedAvg * 100) / 100,
    },
    metadata: { btcPrice: Math.round(data.btcPrice * 100) / 100 },
  };
}
