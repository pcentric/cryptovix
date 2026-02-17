export interface OptionData {
  exchange: 'deribit' | 'bybit';
  instrument: string;
  strike: number;
  expiry: Date;
  type: 'call' | 'put';
  markIv: number;
  bidIv: number;
  askIv: number;
  openInterest: number;
  volume24h: number;
  underlyingPrice: number;
  timestamp: Date;
}
