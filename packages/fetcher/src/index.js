"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchOKX = exports.fetchDeribit = void 0;
exports.fetchAll = fetchAll;
var deribit_1 = require("./deribit");
Object.defineProperty(exports, "fetchDeribit", { enumerable: true, get: function () { return deribit_1.fetchDeribit; } });
var okx_1 = require("./okx");
Object.defineProperty(exports, "fetchOKX", { enumerable: true, get: function () { return okx_1.fetchOKX; } });
const deribit_2 = require("./deribit");
const okx_2 = require("./okx");
/**
 * Fetches options data from both exchanges and merges results
 * Handles individual exchange failures gracefully
 */
async function fetchAll() {
    const results = await Promise.allSettled([(0, deribit_2.fetchDeribit)(), (0, okx_2.fetchOKX)()]);
    const allOptions = [];
    for (const result of results) {
        if (result.status === 'fulfilled') {
            allOptions.push(...result.value);
        }
        // If rejected, just skip that exchange
    }
    return allOptions;
}
