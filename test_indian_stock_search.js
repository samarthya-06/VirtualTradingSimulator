/**
 * Test Indian Stock Search Capabilities
 * 
 * This script tests searching for both popular and less popular stocks
 * from major Indian indices to verify search functionality.
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

// Test search terms - mix of popular and less popular stocks
const searchTerms = [
  // Popular large-cap stocks
  'reliance',
  'tcs',
  'hdfc',
  'infosys',
  'icici',
  
  // Mid-cap stocks
  'apollo hospitals',
  'dixon',
  'trent',
  'havells',
  
  // Smaller or less popular stocks
  'irctc',
  'lici',
  'zomato',
  'paytm',
  'nykaa',
  
  // Sector-specific stocks
  'sun pharma',
  'bharti airtel',
  'coal india',
  'ntpc',
  'ongc',
  
  // Partial names to test search flexibility
  'tata',
  'adani',
  'bajaj',
  'mahindra',
  'hero'
];

// Log separators for better readability
const separator = () => console.log('\n' + '-'.repeat(80) + '\n');

async function testSearch(term) {
  try {
    console.log(`Searching for: "${term}"`);
    const results = await stockMarketService.searchStocks(term);
    console.log(`Found ${results.length} results`);
    
    if (results.length > 0) {
      // Show top 3 results or all if less than 3
      const displayCount = Math.min(results.length, 3);
      console.log(JSON.stringify(results.slice(0, displayCount), null, 2));
      
      // If we found results, test getting a quote for the first result
      if (results.length > 0) {
        const firstSymbol = results[0].symbol;
        console.log(`\nTesting quote retrieval for first result: ${firstSymbol}`);
        const quote = await stockMarketService.getQuote(firstSymbol);
        console.log(JSON.stringify(quote, null, 2));
      }
    }
    
    return {
      term,
      success: true,
      resultCount: results.length
    };
  } catch (error) {
    console.error(`Error searching for "${term}":`, error.message);
    return {
      term,
      success: false,
      error: error.message
    };
  }
}

async function runTests() {
  console.log('TESTING INDIAN STOCK SEARCH CAPABILITIES\n');
  
  const results = [];
  
  for (const term of searchTerms) {
    separator();
    const result = await testSearch(term);
    results.push(result);
    console.log('---');
  }
  
  separator();
  console.log('SEARCH TEST SUMMARY:');
  
  const successful = results.filter(r => r.success);
  const withResults = results.filter(r => r.success && r.resultCount > 0);
  
  console.log(`Total searches: ${results.length}`);
  console.log(`Successful searches: ${successful.length}`);
  console.log(`Searches with results: ${withResults.length}`);
  
  console.log('\nSearch terms with no results:');
  const noResults = results.filter(r => r.success && r.resultCount === 0);
  noResults.forEach(r => console.log(`- "${r.term}"`));
  
  console.log('\nFailed searches:');
  const failed = results.filter(r => !r.success);
  failed.forEach(r => console.log(`- "${r.term}": ${r.error}`));
  
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
