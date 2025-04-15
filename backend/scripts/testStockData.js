/**
 * Test Stock Data Integration Script
 * 
 * This script tests the integration with Yahoo Finance for Indian stock market data
 * and validates that our utility functions properly handle stock symbols.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import stockMarketService from '../services/stockMarketService.js';
import indianStockUtils from '../utils/indianStockUtils.js';
import { configureYahooFinance } from '../utils/yahooFinanceConfig.js';

// Get current file path (for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Configure Yahoo Finance
configureYahooFinance();

// Test symbols with various formats
const testSymbols = [
    'RELIANCE',        // Base symbol
    'RELIANCE.NS',     // NSE symbol
    'RELIANCE.BO',     // BSE symbol
    'TCS',             // Another base symbol
    '0',               // Numeric ID for RELIANCE
    '1',               // Numeric ID for TCS
    '^NSEI',           // Nifty 50 index
    '^BSESN'           // Sensex index
];

// Log separators for better readability
const separator = () => console.log('\n' + '-'.repeat(80) + '\n');

async function runTests() {
    console.log('TESTING INDIAN STOCK DATA INTEGRATION\n');
    
    separator();
    console.log('1. TESTING SYMBOL STANDARDIZATION');
    
    for (const symbol of testSymbols) {
        const baseSymbol = indianStockUtils.getBaseSymbol(symbol);
        const nseSymbol = indianStockUtils.standardizeSymbol(symbol, 'NSE');
        const bseSymbol = indianStockUtils.standardizeSymbol(symbol, 'BSE');
        
        console.log(`Original: ${symbol}`);
        console.log(`Base Symbol: ${baseSymbol}`);
        console.log(`NSE Symbol: ${nseSymbol}`);
        console.log(`BSE Symbol: ${bseSymbol}`);
        console.log('---');
    }
    
    separator();
    console.log('2. TESTING QUOTE RETRIEVAL');
    
    for (const symbol of testSymbols) {
        try {
            console.log(`Fetching quote for: ${symbol}`);
            const quote = await stockMarketService.getQuote(symbol);
            console.log(JSON.stringify(quote, null, 2));
            console.log('---');
        } catch (error) {
            console.error(`Error fetching quote for ${symbol}:`, error.message);
            console.log('---');
        }
    }
    
    separator();
    console.log('3. TESTING MARKET INDICES');
    
    try {
        console.log('Fetching market indices:');
        const indices = await stockMarketService.getMarketIndices();
        console.log(JSON.stringify(indices, null, 2));
    } catch (error) {
        console.error('Error fetching market indices:', error.message);
    }
    
    separator();
    console.log('4. TESTING STOCK SEARCH');
    
    const searchTerms = ['reliance', 'tata', 'hdfc', 'bank'];
    
    for (const term of searchTerms) {
        try {
            console.log(`Searching for: ${term}`);
            const results = await stockMarketService.searchStocks(term);
            console.log(`Found ${results.length} results`);
            console.log(JSON.stringify(results.slice(0, 3), null, 2)); // Show top 3 results
            console.log('---');
        } catch (error) {
            console.error(`Error searching for ${term}:`, error.message);
            console.log('---');
        }
    }
    
    separator();
    console.log('TESTS COMPLETED');
    
    // Exit the process
    process.exit(0);
}

// Run the tests
runTests().catch(error => {
    console.error('Error in tests:', error);
    process.exit(1);
}); 