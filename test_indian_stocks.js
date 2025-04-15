/**
 * Test specific Indian stocks from major indices
 * 
 * This script tests fetching data for key stocks from:
 * - Nifty 50
 * - Sensex
 * - Bank Nifty
 * - Nifty IT
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import stockMarketService from './backend/services/stockMarketService.js';
import { configureYahooFinance } from './backend/utils/yahooFinanceConfig.js';

// Get current file path (for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, './backend/.env') });

// Configure Yahoo Finance
configureYahooFinance();

// Test stocks from different indices
const testStocks = {
  'Nifty 50': ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK'],
  'Sensex': ['TATASTEEL', 'MARUTI', 'ASIANPAINT', 'HINDUNILVR', 'BAJFINANCE'],
  'Bank Nifty': ['SBIN', 'KOTAKBANK', 'AXISBANK', 'INDUSINDBK', 'FEDERALBNK'],
  'Nifty IT': ['WIPRO', 'TECHM', 'LTTS', 'MPHASIS', 'COFORGE']
};

// Log separators for better readability
const separator = () => console.log('\n' + '-'.repeat(80) + '\n');

async function testStock(symbol) {
  try {
    console.log(`Fetching quote for: ${symbol}`);
    const quote = await stockMarketService.getQuote(symbol);
    console.log(JSON.stringify(quote, null, 2));
    return true;
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error.message);
    return false;
  }
}

async function runTests() {
  console.log('TESTING SPECIFIC INDIAN STOCKS FROM MAJOR INDICES\n');
  
  let successCount = 0;
  let totalTests = 0;
  
  for (const [index, stocks] of Object.entries(testStocks)) {
    separator();
    console.log(`TESTING ${index} STOCKS`);
    
    for (const symbol of stocks) {
      totalTests++;
      const success = await testStock(symbol);
      if (success) successCount++;
      console.log('---');
    }
  }
  
  separator();
  console.log(`TESTS COMPLETED: ${successCount}/${totalTests} successful`);
  
  // Exit the process
  process.exit(0);
}

// Run the tests
runTests().catch(error => {
  console.error('Error in tests:', error);
  process.exit(1);
});
