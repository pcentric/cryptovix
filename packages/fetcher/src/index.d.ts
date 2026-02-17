export { fetchDeribit } from './deribit';
export { fetchOKX } from './okx';
export type { OptionData } from './types';
import { OptionData } from './types';
/**
 * Fetches options data from both exchanges and merges results
 * Handles individual exchange failures gracefully
 */
export declare function fetchAll(): Promise<OptionData[]>;
