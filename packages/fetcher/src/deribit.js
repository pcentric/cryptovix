"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchDeribit = fetchDeribit;
const axios_1 = __importDefault(require("axios"));
/**
 * Parses Deribit instrument name to extract strike, expiry, and type
 * Format: BTC-17MAY24-60000-C
 */
function parseDeribitInstrument(name) {
    const parts = name.split('-');
    if (parts.length < 4)
        throw new Error(`Invalid Deribit instrument: ${name}`);
    const type = parts[parts.length - 1].toUpperCase() === 'C' ? 'call' : 'put';
    const strike = parseFloat(parts[parts.length - 2]);
    const dateStr = parts[1] + parts[2]; // e.g., "17MAY24"
    // Parse date like "17MAY24"
    const day = parseInt(dateStr.substring(0, 2));
    const month = dateStr.substring(2, 5);
    const year = parseInt('20' + dateStr.substring(5, 7));
    const monthMap = {
        JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
        JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
    };
    const expiry = new Date(year, monthMap[month], day, 8, 0, 0, 0);
    return { strike, expiry, type };
}
async function fetchDeribit() {
    try {
        const response = await axios_1.default.get('https://www.deribit.com/api/v2/public/get_book_summary_by_currency', {
            params: { currency: 'BTC', kind: 'option' },
        });
        const now = new Date();
        const result = [];
        for (const option of response.data.result || []) {
            const deribitOption = option;
            // Skip if markIv is invalid
            if (!deribitOption.mark_iv || deribitOption.mark_iv <= 0) {
                continue;
            }
            try {
                const { strike, expiry, type } = parseDeribitInstrument(deribitOption.instrument_name);
                result.push({
                    exchange: 'deribit',
                    instrument: deribitOption.instrument_name,
                    strike,
                    expiry,
                    type,
                    markIv: deribitOption.mark_iv,
                    bidIv: deribitOption.bid_iv ?? 0,
                    askIv: deribitOption.ask_iv ?? 0,
                    openInterest: deribitOption.open_interest ?? 0,
                    volume24h: deribitOption.volume_usd ?? 0,
                    underlyingPrice: deribitOption.underlying_price ?? 0,
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
        console.error('Deribit fetch failed:', error);
        return [];
    }
}
