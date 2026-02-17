"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchOKX = fetchOKX;
const axios_1 = __importDefault(require("axios"));
/**
 * Parses OKX instrument ID to extract strike, expiry, and type
 * Format: BTC-USD-240517-60000-C
 */
function parseOKXInstrument(instId) {
    const parts = instId.split('-');
    if (parts.length < 5)
        throw new Error(`Invalid OKX instrument: ${instId}`);
    const type = parts[parts.length - 1].toUpperCase() === 'C' ? 'call' : 'put';
    const strike = parseFloat(parts[parts.length - 2]);
    const dateStr = parts[2]; // e.g., "240517"
    const year = 2000 + parseInt(dateStr.substring(0, 2));
    const month = parseInt(dateStr.substring(2, 4)) - 1;
    const day = parseInt(dateStr.substring(4, 6));
    const expiry = new Date(year, month, day, 8, 0, 0, 0);
    return { strike, expiry, type };
}
async function fetchOKX() {
    try {
        const response = await axios_1.default.get('https://www.okx.com/api/v5/public/opt-summary', {
            params: { instFamily: 'BTC-USD' },
        });
        const now = new Date();
        const result = [];
        for (const option of response.data.data || []) {
            const okxOption = option;
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
            }
            catch (e) {
                // Skip instruments that fail to parse
                continue;
            }
        }
        return result;
    }
    catch (error) {
        console.error('OKX fetch failed:', error);
        return [];
    }
}
